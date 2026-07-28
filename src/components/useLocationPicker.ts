import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { getPositionWithinTimeout, resolveApproximateLocation } from "../lib/approximateLocation";
import { reverseGeocode } from "../services/placesService";

// Everything LocationPickerMap does that isn't drawing a map: seeding the
// starting pin, debounced reverse-geocoding as it settles, and the
// "use my current location" jump. Both platform files (LocationPickerMap.tsx
// and .web.tsx) carried their own byte-for-byte copy of the first two, which
// is exactly the kind of duplication that lets the two versions drift —
// they'd already diverged on how the sheet resets when it reopens (native
// keyed off Modal's onShow with no cancellation; web off `visible` with).
// This hook is the single source of truth; the components only render.
export const REVERSE_GEOCODE_DEBOUNCE_MS = 700; // reverseGeocode is a billable Google Geocoding call — wait for the pin to settle before firing, not on every drag/tap

export interface PickerCoords {
  lat: number;
  lng: number;
}

export interface PickerSeed extends PickerCoords {
  isFallback: boolean;
}

// What the status line under the header shows. It used to render a spinner,
// then a label, then nothing at all if the lookup failed — three different
// heights, so the map jumped every time the pin moved, and a failed lookup
// left the user with no confirmation of anything. Now there is always
// exactly one line: an address if we have one, the coordinates otherwise.
export type LabelStatus = "idle" | "resolving" | "resolved" | "failed";

export interface LocationPickerState {
  seed: PickerSeed | null;
  marker: PickerCoords | null;
  setMarker: (coords: PickerCoords) => void;
  resolvedLabel: string | undefined;
  labelStatus: LabelStatus;
  locating: boolean;
  locateError: string | null;
  useCurrentLocation: () => Promise<void>;
  // Bumped whenever the marker moved for a reason other than the user
  // pointing at that spot on the map (currently: the locate button), which
  // is precisely when the map itself needs to follow. A user-driven tap or
  // drag deliberately doesn't recenter — yanking the map out from under the
  // finger that just moved the pin is disorienting.
  recenterToken: number;
}

export function useLocationPicker(visible: boolean, initialCoords?: PickerCoords): LocationPickerState {
  const [seed, setSeed] = useState<PickerSeed | null>(initialCoords ? { ...initialCoords, isFallback: false } : null);
  const [marker, setMarker] = useState<PickerCoords | null>(initialCoords ?? null);
  const [resolvedLabel, setResolvedLabel] = useState<string | undefined>();
  const [labelStatus, setLabelStatus] = useState<LabelStatus>("idle");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const labelRequestIdRef = useRef(0);

  // Reset to the caller's current value each time the sheet opens, rather
  // than persisting whatever was last dragged to across opens/cancels.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function resolveStart() {
      // A "couldn't get a fix" message from a previous session of the sheet
      // isn't about this one.
      setLocateError(null);
      if (initialCoords) {
        if (!cancelled) {
          setSeed({ ...initialCoords!, isFallback: false });
          setMarker(initialCoords!);
        }
        return;
      }
      setSeed(null);
      setMarker(null);
      const resolved = await resolveApproximateLocation();
      if (!cancelled) {
        setSeed(resolved);
        setMarker({ lat: resolved.lat, lng: resolved.lng });
      }
    }
    resolveStart();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCoords?.lat, initialCoords?.lng]);

  useEffect(() => {
    if (!marker) return;
    const requestId = ++labelRequestIdRef.current;
    let cancelled = false;
    async function resolveLabel() {
      setResolvedLabel(undefined);
      setLabelStatus("resolving");
      const result = await reverseGeocode(marker!.lat, marker!.lng);
      if (cancelled || requestId !== labelRequestIdRef.current) return; // superseded by a newer move
      if ("data" in result) {
        setResolvedLabel(result.data.formattedAddress);
        setLabelStatus("resolved");
      } else {
        // Non-fatal, and always has been (DECISIONS.md: "coordinates are the
        // source of truth, the label is best-effort") — the difference is
        // that the UI now says so instead of showing an empty gap.
        setResolvedLabel(undefined);
        setLabelStatus("failed");
      }
    }
    const timer = setTimeout(resolveLabel, REVERSE_GEOCODE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker?.lat, marker?.lng]);

  // The picker previously dropped you at a seeded point with no way back to
  // yourself — pan far enough looking for a spot and your actual location
  // was unrecoverable without cancelling out and reopening. Unlike the
  // seeding chain (which never prompts, by design), this is an explicit user
  // action, so it may ask for the permission.
  const useCurrentLocation = useCallback(async () => {
    setLocating(true);
    setLocateError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocateError("Location permission is off — you can still drop the pin by hand.");
        return;
      }
      // Bounded: an unbounded wait leaves the button spinning forever with
      // no way to tell a slow fix from a broken one. Also filters out a
      // (0,0) "fix", which is never a real location — see
      // approximateLocation.ts.
      const position = await getPositionWithinTimeout();
      if (!position) {
        setLocateError("Couldn't get a location fix — drop the pin by hand instead.");
        return;
      }
      setMarker(position);
      setRecenterToken((token) => token + 1);
    } catch {
      setLocateError("Couldn't get a location fix — drop the pin by hand instead.");
    } finally {
      setLocating(false);
    }
  }, []);

  return {
    seed,
    marker,
    setMarker,
    resolvedLabel,
    labelStatus,
    locating,
    locateError,
    useCurrentLocation,
    recenterToken,
  };
}

// The always-present status line described on LabelStatus above.
export function pickerStatusText(state: LocationPickerState): string {
  if (!state.marker) return "";
  if (state.labelStatus === "resolved" && state.resolvedLabel) return state.resolvedLabel;
  if (state.labelStatus === "resolving") return "Looking up this spot…";
  const coords = `${state.marker.lat.toFixed(5)}, ${state.marker.lng.toFixed(5)}`;
  return state.labelStatus === "failed" ? `No address found — ${coords}` : coords;
}

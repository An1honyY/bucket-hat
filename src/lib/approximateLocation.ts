import * as Location from "expo-location";
import { getDefaultLocation } from "../db/repositories/settings";

// Shared "where roughly is the user" resolution — device GPS (only if
// permission is already granted; never prompts on its own) → onboarding's
// saved default location → Auckland. Originally inlined in useRightNow.ts
// (Today's weather card); pulled out here so LocationPickerMap can seed its
// pin from the same chain instead of always starting at the hardcoded
// Auckland fallback regardless of what's actually knowable. IP-based
// geolocation was considered as an extra fallback ahead of Auckland but
// rejected — there's no way to resolve an IP to a location without an
// external service or a bundled geo-IP database, and GPS (already covered
// here) is strictly more accurate than either would be — see DECISIONS.md.
export const AUCKLAND = { lat: -36.8485, lng: 174.7633 };

export interface ApproximateLocation {
  lat: number;
  lng: number;
  isFallback: boolean;
}

// (0, 0) — "Null Island," a point in the Gulf of Guinea — is never a
// legitimate real-world commute location. Some browsers/WebViews resolve
// geolocation with exactly this instead of rejecting when the underlying
// location provider fails silently (observed in practice: permission
// reported "granted" with a stubbed (0,0) fix), and a value like that can
// end up persisted as `default_location` from an earlier such resolution.
// Treated as "no location," not a real fix, at every step of the chain.
export function isNullIsland(lat: number, lng: number): boolean {
  return lat === 0 && lng === 0;
}

// How long to wait for a satellite fix before giving up and using whatever
// is already known.
//
// `getCurrentPositionAsync` resolves only when the device actually gets a
// fix, and has no built-in timeout — indoors, or on a cold GPS start, that
// can be tens of seconds or never. Every caller here is blocking a piece of
// UI on the result, so an unbounded wait reads to the user as a broken
// button rather than as slow hardware. That's exactly how it surfaced: the
// Locations screen's "Pick on map" appeared to do nothing, because the
// picker sat on its loading spinner waiting for a fix that never came.
export const POSITION_TIMEOUT_MS = 8000;

/**
 * A position within a bounded time, or null.
 *
 * Tries the OS's last known fix first — it returns immediately and is
 * almost always good enough for "roughly where am I" — before asking for a
 * fresh one. Never prompts for permission; callers that should prompt do
 * so themselves first.
 *
 * The timeout races rather than cancels, since expo-location exposes no
 * cancellation. The stray request resolves into a discarded promise; what
 * matters is that the caller is no longer blocked on it.
 */
export async function getPositionWithinTimeout(
  timeoutMs: number = POSITION_TIMEOUT_MS
): Promise<{ lat: number; lng: number } | null> {
  const usable = (position: Location.LocationObject | null) => {
    if (!position) return null;
    const { latitude: lat, longitude: lng } = position.coords;
    return isNullIsland(lat, lng) ? null : { lat, lng };
  };

  try {
    const lastKnown = usable(await Location.getLastKnownPositionAsync());
    if (lastKnown) return lastKnown;
  } catch {
    // No cached fix — fall through and ask for a fresh one.
  }

  try {
    // Balanced rather than the default: a commute start point doesn't need
    // metre-level precision, and the high-accuracy path is the slow one.
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return usable(fresh);
  } catch {
    return null;
  }
}

export async function resolveApproximateLocation(): Promise<ApproximateLocation> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.granted) {
      const position = await getPositionWithinTimeout();
      if (position) return { ...position, isFallback: false };
    }
  } catch {
    // GPS unavailable/denied mid-flow — fall through to the saved default
  }
  try {
    const defaultLocation = await getDefaultLocation();
    if (defaultLocation && !isNullIsland(defaultLocation.lat, defaultLocation.lng)) {
      return { lat: defaultLocation.lat, lng: defaultLocation.lng, isFallback: false };
    }
  } catch {
    // fall through to Auckland
  }
  return { ...AUCKLAND, isFallback: true };
}

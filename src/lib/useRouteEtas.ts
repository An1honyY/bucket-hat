import { useEffect, useState } from "react";
import { computeRoute } from "../services/routesService";
import type { RouteStep } from "../services/routesService";
import type { SavedLocation, TravelMode } from "../types";

// Per-location arrival times for the Plan screen's hourly outlook.
//
// The outlook wants to show each location's weather *at the hour the user is
// actually there* — the origin at departure, a stop mid-trip, the destination
// on arrival. Before this existed, Plan had no timing information at all:
// planJourney() only runs when "Plan journey" is pressed, so every location's
// forecast was read at the departure hour, which for a 90-minute walk is the
// wrong hour for everything except the origin.
//
// Cost note: Google Routes is billed per request (docs/02-external-apis.md).
// This adds route calls to a screen that previously made none, so it is
// debounced, gated on having a complete route, and memoised on a signature of
// the inputs — an unrelated re-render, or toggling a preference that doesn't
// change the route, must not spend a request. It is still a real increase over
// the previous one-call-per-plan: budget roughly one extra call per meaningful
// edit to the route.
const DEBOUNCE_MS = 700;

export type LocationRole = "origin" | "stop" | "destination";

export interface LocationEta {
  location: SavedLocation;
  role: LocationRole;
  // ISO instant the user is at this location. Falls back to the departure
  // time for every location when no route could be computed.
  atIso: string;
  // False when this is the departure-time fallback rather than a real routed
  // arrival, so the UI can avoid implying precision it doesn't have.
  estimated: boolean;
}

interface Input {
  origin?: SavedLocation;
  waypoints: (SavedLocation | undefined)[];
  destination?: SavedLocation;
  mode: TravelMode;
  departTimeIso?: string;
}

function toRoutePoint(l: SavedLocation) {
  return { lat: l.lat, lng: l.lng, label: l.label };
}

// Cumulative arrival per hop. Only trustworthy when Google returned exactly
// one leg per hop — the same `knownHopBoundaries` condition planJourney uses.
// Transit returns a flat step list with no documented hop boundary, so its
// intermediate stops can't be placed in time and fall back to the departure
// hour (waypoints aren't honoured for transit anyway — see DECISIONS.md).
function arrivalOffsetsMin(steps: RouteStep[], hopCount: number): number[] | undefined {
  if (steps.length !== hopCount) return undefined;
  const offsets: number[] = [];
  let cumulative = 0;
  for (const step of steps) {
    cumulative += step.durationMin;
    offsets.push(cumulative);
  }
  return offsets;
}

export function useRouteEtas({ origin, waypoints, destination, mode, departTimeIso }: Input): LocationEta[] {
  const filledWaypoints = waypoints.filter((w): w is SavedLocation => !!w);
  const [offsets, setOffsets] = useState<number[] | undefined>(undefined);

  // Identity of the route as far as timing is concerned. Coordinates rather
  // than ids, so an unsaved Places result (fresh id every render — see
  // SavedLocationPicker) doesn't look like a new route on every keystroke.
  const signature =
    origin && destination && departTimeIso
      ? [
          `${origin.lat},${origin.lng}`,
          ...filledWaypoints.map((w) => `${w.lat},${w.lng}`),
          `${destination.lat},${destination.lng}`,
          mode,
          departTimeIso,
        ].join("|")
      : undefined;

  // "Adjusting state when a prop changes" — the render-time reset pattern this
  // codebase already uses (see the origin reset the old HourlyStrip did).
  // Clearing stale offsets the moment the route changes is a pure local reset,
  // not a fetch, so it does not belong in the effect; doing it there triggers
  // a cascading render (react-hooks/set-state-in-effect). Until the new
  // request lands, every location falls back to the departure hour.
  const [consumedSignature, setConsumedSignature] = useState(signature);
  if (signature !== consumedSignature) {
    setConsumedSignature(signature);
    setOffsets(undefined);
  }

  useEffect(() => {
    if (!signature || !origin || !destination || !departTimeIso) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      const isTransit = mode === "bus" || mode === "train";
      computeRoute({
        origin: toRoutePoint(origin),
        destination: toRoutePoint(destination),
        waypoints: filledWaypoints.map(toRoutePoint),
        mode: mode === "hike" ? "walk" : mode,
        departTime: departTimeIso,
      }).then((result) => {
        if (cancelled) return;
        if (!("data" in result)) {
          // Same "supplement, not a blocker" degrade the outlook already uses
          // for a failed weather fetch: no ETAs just means every location is
          // read at the departure hour, not an error surfaced to the user.
          setOffsets(undefined);
          return;
        }
        setOffsets(isTransit ? undefined : arrivalOffsetsMin(result.data, 1 + filledWaypoints.length));
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // filledWaypoints/origin/destination are all captured by `signature`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!origin || !destination || !departTimeIso) return [];

  const departMs = new Date(departTimeIso).getTime();
  const at = (offsetIndex: number): { atIso: string; estimated: boolean } =>
    offsets && offsets[offsetIndex] !== undefined
      ? { atIso: new Date(departMs + offsets[offsetIndex] * 60_000).toISOString(), estimated: true }
      : { atIso: departTimeIso, estimated: false };

  return [
    { location: origin, role: "origin", atIso: departTimeIso, estimated: true },
    ...filledWaypoints.map((w, i) => ({ location: w, role: "stop" as const, ...at(i) })),
    { location: destination, role: "destination" as const, ...at(filledWaypoints.length) },
  ];
}

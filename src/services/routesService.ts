// Google Routes API (routes.googleapis.com/directions/v2:computeRoutes) —
// docs/02-external-apis.md §2. Reads GOOGLE_ROUTES_API_KEY from env (Expo's
// EXPO_PUBLIC_ prefix convention, docs/01-tech-stack.md's "env/secrets"
// row) — see .env.example. No key configured is treated the same as an
// unreachable API: docs/05-data-wiring.md §5.1's offline/failure path
// already has to handle a real outage, and "not configured yet in this
// dev environment" is the same shape of failure for the caller.
//
// EXPO_PUBLIC_ env vars are bundled into the client JS as plain text —
// fine for local dev, but docs/10-production-readiness.md §10.1 requires
// restricting the key by package/bundle ID (or proxying calls through a
// backend) before wide release. That hardening is explicitly Phase 12
// scope, not something to half-do here.
import { getDevOverrides } from "../lib/devOverrides";
import { decodePolyline, encodePolyline } from "../lib/annotations";
import type { ServiceResult } from "./types";

export type RouteTravelMode = "walk" | "drive" | "bus" | "train" | "cycle";

// Phase 22 — a single turn within a leg ("Turn left onto Sandringham Rd").
// Only walk/drive/cycle legs have these: Google doesn't nest steps inside a
// TRANSIT step, and "ride the bus" has no turns to give.
export interface RouteNavigationStep {
  instruction: string;
  /** Google's maneuver enum (TURN_LEFT, ROUNDABOUT_RIGHT, …), when given. */
  maneuver?: string;
  distanceM: number;
  durationMin: number;
  polyline: string;
}

// A boarding or alighting point on a transit step, with the coordinates
// Google already returns for it. Kept as route data rather than left to the
// basemap: Google's and CARTO's own station pucks only appear at high zoom,
// so on a map framed to the whole commute the two moments that actually
// matter — where you get on, where you get off — were invisible.
export interface RouteTransitStop {
  name: string;
  lat: number;
  lng: number;
  kind: "board" | "alight";
}

export interface RouteStep {
  mode: RouteTravelMode;
  label: string;
  durationMin: number;
  polyline: string;
  // A synthesized stationary wait ahead of a transit step (§3.5/§5.6) —
  // sized from Google's own scheduled departure time here; Phase 7 resizes
  // this from live AT GTFS Realtime delay data instead.
  isStationary?: boolean;
  waitContext?: "transit-platform" | "transit-stop";
  // Best-effort identifiers for Phase 7's AT GTFS Realtime lookup
  // (transitService.getRealtimeDelay, §5.6) — only set on the transit
  // step itself, not the walk/wait steps around it. See transitService.ts's
  // header comment for why these are approximate, not real AT GTFS ids.
  routeId?: string;
  stopId?: string;
  scheduledDepartTime?: string; // ISO
  // Phase 22 — turn-by-turn within this leg. Absent when Google returned no
  // instructions (and on every journey planned before Phase 22 shipped), so
  // every consumer has to treat it as optional.
  steps?: RouteNavigationStep[];
  /** Where this transit step boards and alights. Transit steps only. */
  transitStops?: RouteTransitStop[];
}

export interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
}

export interface ComputeRouteParams {
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints?: RoutePoint[]; // passed as `intermediates` on the same call, §5.5
  mode: RouteTravelMode;
  // Exactly one of these is set by callers. `arriveTime` only takes effect
  // for TRANSIT (bus/train) — Google's Routes API doesn't support
  // arrival-time routing for any other travel mode; planJourney.ts's
  // arrive-by estimate for walk/drive/cycle instead passes the desired
  // arrival instant as `departTime` itself (see resolveArrivalPlan there).
  departTime?: string; // ISO
  arriveTime?: string; // ISO — TRANSIT only
}

const COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

function apiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY;
}

function toWaypoint(point: RoutePoint) {
  return { location: { latLng: { latitude: point.lat, longitude: point.lng } } };
}

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  return parseInt(duration.replace("s", ""), 10) || 0;
}

function toMinutes(durationSeconds: number): number {
  return Math.max(1, Math.round(durationSeconds / 60));
}

interface GooglePolyline {
  encodedPolyline?: string;
}
interface GoogleTransitStop {
  name?: string;
  location?: { latLng?: { latitude?: number; longitude?: number } };
}
interface GoogleTransitDetails {
  stopDetails?: {
    arrivalStop?: GoogleTransitStop;
    departureStop?: GoogleTransitStop;
    departureTime?: string;
    arrivalTime?: string;
  };
  transitLine?: { vehicle?: { type?: string }; nameShort?: string; name?: string };
}
interface GoogleRouteStep {
  travelMode?: "WALK" | "TRANSIT";
  staticDuration?: string;
  polyline?: GooglePolyline;
  transitDetails?: GoogleTransitDetails;
  distanceMeters?: number;
  navigationInstruction?: { maneuver?: string; instructions?: string };
}
interface GoogleRouteLeg {
  duration?: string;
  staticDuration?: string;
  polyline?: GooglePolyline;
  steps?: GoogleRouteStep[];
}
interface GoogleRoute {
  legs?: GoogleRouteLeg[];
}
interface GoogleComputeRoutesResponse {
  routes?: GoogleRoute[];
}

// Phase 22 — Google's per-step turn instructions, kept only where there's
// actually something to say. A step with no instruction text is dropped
// rather than rendered as a blank row: this codebase's consistent choice is
// to omit rather than placeholder.
function toNavigationSteps(steps: GoogleRouteStep[] | undefined): RouteNavigationStep[] | undefined {
  const mapped = (steps ?? []).flatMap((step) => {
    const instruction = step.navigationInstruction?.instructions?.trim();
    if (!instruction) return [];
    return [
      {
        instruction,
        maneuver: step.navigationInstruction?.maneuver,
        distanceM: step.distanceMeters ?? 0,
        durationMin: toMinutes(parseDurationSeconds(step.staticDuration)),
        polyline: step.polyline?.encodedPolyline ?? "",
      },
    ];
  });
  return mapped.length > 0 ? mapped : undefined;
}

// The board/alight points of one TRANSIT step. Google gives each stop a
// `location` alongside its name (already inside the `transitDetails` subtree
// the field mask requests, so this costs no extra fields), but a stop with no
// usable coordinate is dropped rather than pinned at Null Island.
function toTransitStops(details: GoogleTransitDetails): RouteTransitStop[] | undefined {
  const pairs: { stop: GoogleTransitStop | undefined; kind: "board" | "alight" }[] = [
    { stop: details.stopDetails?.departureStop, kind: "board" },
    { stop: details.stopDetails?.arrivalStop, kind: "alight" },
  ];
  const stops = pairs.flatMap(({ stop, kind }) => {
    const lat = stop?.location?.latLng?.latitude;
    const lng = stop?.location?.latLng?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{ name: stop?.name ?? (kind === "board" ? "Stop" : "Destination stop"), lat, lng, kind }];
  });
  return stops.length > 0 ? stops : undefined;
}

// WALK/BICYCLE/DRIVE: one Google "leg" per hop between consecutive stops
// (origin→wp1, wp1→wp2, …, wpN→destination) — maps 1:1 onto our per-hop
// leg model, no further expansion needed.
function parseSimpleLegs(route: GoogleRoute, params: ComputeRouteParams): RouteStep[] {
  const stops = [params.origin, ...(params.waypoints ?? []), params.destination];
  const verb = params.mode === "cycle" ? "Cycle" : params.mode === "drive" ? "Drive" : "Walk";
  return (route.legs ?? []).map((leg, i) => ({
    mode: params.mode,
    label: `${verb} to ${stops[i + 1].label}`,
    durationMin: toMinutes(parseDurationSeconds(leg.duration ?? leg.staticDuration)),
    polyline: leg.polyline?.encodedPolyline ?? "",
    steps: toNavigationSteps(leg.steps),
  }));
}

// Where a run of walking actually takes you: the stop the next ride leaves
// from, or — if there's no ride after it — the journey's destination. Google
// names neither, so without this every walk in a transit journey was labelled
// "Walk to stop", and a journey with three of them said it three times.
function walkDestinationName(
  steps: GoogleRouteStep[],
  fromIndex: number,
  params: ComputeRouteParams
): string | undefined {
  for (let i = fromIndex; i < steps.length; i++) {
    if (steps[i].travelMode === "TRANSIT") {
      return steps[i].transitDetails?.stopDetails?.departureStop?.name;
    }
  }
  // Nothing but walking left — this is the last stretch, so it ends where the
  // journey does.
  return params.destination.label;
}

// TRANSIT: Google returns one leg with a flat steps[] mixing WALK and
// TRANSIT sub-segments — expanded into our walk/wait/transit leg triple
// per hop. A wait step is only synthesized when Google's own scheduled
// departure time leaves a gap after our running cursor; otherwise the
// transit step follows immediately with no separate wait leg.
//
// Consecutive WALK steps are merged into a single leg. Google splits one
// continuous walk into several steps whenever the geometry changes — a real
// journey came back with six in a row, which the app rendered as six
// identical "Walk to stop" rows for what is, to the person walking it, one
// walk. They're one leg with one label, the summed duration, the joined
// geometry, and every turn instruction from all of them (which is what makes
// the directions list right, since those turns are the walk's actual detail).
function parseTransitSteps(route: GoogleRoute, params: ComputeRouteParams): RouteStep[] {
  const steps = route.legs?.[0]?.steps ?? [];
  const result: RouteStep[] = [];

  let cursorMs: number;
  if (params.departTime) {
    cursorMs = new Date(params.departTime).getTime();
  } else {
    // Arrive-by call (arriveTime set, no departTime) — no anchor clock time
    // was given, so seed the cursor from the first transit step's own real
    // scheduled departure, walked back by any leading walk step's duration,
    // rather than assuming an (unknown) absolute start time.
    const firstTransitIndex = steps.findIndex(
      (s) => s.travelMode === "TRANSIT" && s.transitDetails?.stopDetails?.departureTime
    );
    const firstTransitDepartMs =
      firstTransitIndex >= 0
        ? new Date(steps[firstTransitIndex].transitDetails!.stopDetails!.departureTime!).getTime()
        : Date.now();
    const leadingWalkSeconds = steps
      .slice(0, firstTransitIndex >= 0 ? firstTransitIndex : 0)
      .reduce((sum, s) => sum + parseDurationSeconds(s.staticDuration), 0);
    cursorMs = firstTransitDepartMs - leadingWalkSeconds * 1000;
  }

  let i = 0;
  while (i < steps.length) {
    const step = steps[i];

    if (step.travelMode === "WALK") {
      // Swallow the whole run of walking, not just this step.
      const run: GoogleRouteStep[] = [];
      while (i < steps.length && steps[i].travelMode === "WALK") {
        run.push(steps[i]);
        i += 1;
      }
      const durationSeconds = run.reduce((sum, s) => sum + parseDurationSeconds(s.staticDuration), 0);
      // Decoded and re-encoded rather than string-concatenated: an encoded
      // polyline is delta-encoded against its predecessor, so joining two of
      // them as text puts the second half somewhere off the coast.
      const points = run.flatMap((s) => decodePolyline(s.polyline?.encodedPolyline ?? ""));
      const target = walkDestinationName(steps, i, params);
      result.push({
        mode: "walk",
        label: target ? `Walk to ${target}` : "Walk to your stop",
        durationMin: toMinutes(durationSeconds),
        polyline: points.length > 0 ? encodePolyline(points) : "",
        steps: toNavigationSteps(run),
      });
      cursorMs += durationSeconds * 1000;
      continue;
    }

    i += 1;
    const durationSeconds = parseDurationSeconds(step.staticDuration);

    if (step.travelMode === "TRANSIT" && step.transitDetails) {
      const vehicleType = step.transitDetails.transitLine?.vehicle?.type ?? "BUS";
      const mode: RouteTravelMode = vehicleType === "BUS" ? "bus" : "train";
      const departureIso = step.transitDetails.stopDetails?.departureTime;
      const arrivalStopName = step.transitDetails.stopDetails?.arrivalStop?.name ?? params.destination.label;
      // Buses are known by their route number, which is what `nameShort`
      // holds ("15"). Trains are known by their line name — and AT's
      // `nameShort` for those is a bare code ("WEST"), which rendered as
      // "Waiting for the West" as though West were a place. Full name first
      // for rail, short code first for road.
      const line = step.transitDetails.transitLine;
      const routeName = mode === "bus" ? (line?.nameShort ?? line?.name) : (line?.name ?? line?.nameShort);

      if (departureIso) {
        const departureMs = new Date(departureIso).getTime();
        const waitMin = Math.round((departureMs - cursorMs) / 60_000);
        if (waitMin > 0) {
          result.push({
            mode,
            label: routeName ? `Waiting for the ${routeName}` : "Waiting for transit",
            durationMin: waitMin,
            polyline: "",
            isStationary: true,
            waitContext: "transit-stop",
          });
        }
        cursorMs = departureMs;
      }

      result.push({
        mode,
        label: `${mode === "bus" ? "Bus" : "Train"} to ${arrivalStopName}`,
        durationMin: toMinutes(durationSeconds),
        polyline: step.polyline?.encodedPolyline ?? "",
        routeId: routeName,
        stopId: step.transitDetails.stopDetails?.departureStop?.name,
        scheduledDepartTime: departureIso,
        transitStops: toTransitStops(step.transitDetails),
      });
      cursorMs += durationSeconds * 1000;
    }
  }

  return result;
}

export async function computeRoute(params: ComputeRouteParams): Promise<ServiceResult<RouteStep[]>> {
  // §12.2 — dev-menu "force this service to error" toggle, exercising
  // §5.1's offline fallback UX on demand instead of needing a real outage.
  if (__DEV__ && getDevOverrides().routesError) {
    return { error: getDevOverrides().routesError! };
  }

  const key = apiKey();
  if (!key) {
    return { error: "unreachable" };
  }

  const isTransit = params.mode === "bus" || params.mode === "train";
  const body: Record<string, unknown> = {
    origin: toWaypoint(params.origin),
    destination: toWaypoint(params.destination),
    // Google's Routes API rejects intermediates for TRANSIT outright ("Intermediate
    // waypoints are not supported for TRANSIT travel mode", HTTP 400 — verified against
    // the live API). Sending them would fail the whole plan, so transit journeys omit
    // waypoints entirely and route origin→destination directly; the waypoints are not
    // honoured for transit (a known limitation — see DECISIONS.md). walk/cycle/drive
    // still route through them as one leg per hop.
    intermediates: isTransit ? [] : (params.waypoints ?? []).map(toWaypoint),
    travelMode: isTransit ? "TRANSIT" : params.mode === "cycle" ? "BICYCLE" : params.mode === "drive" ? "DRIVE" : "WALK",
    languageCode: "en-US",
    units: "METRIC",
  };
  if (isTransit && params.arriveTime) {
    body.arrivalTime = params.arriveTime;
  } else {
    body.departureTime = params.departTime;
  }
  if (isTransit) {
    body.transitPreferences = {
      allowedTravelModes: params.mode === "bus" ? ["BUS"] : ["RAIL", "SUBWAY", "LIGHT_RAIL", "TRAIN"],
    };
  }

  let response: Response;
  try {
    response = await fetch(COMPUTE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": isTransit
          ? "routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.polyline,routes.legs.steps.transitDetails,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction"
          : "routes.legs.duration,routes.legs.staticDuration,routes.legs.polyline,routes.legs.steps.staticDuration,routes.legs.steps.polyline,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "network" };
  }

  if (!response.ok) {
    return { error: response.status === 429 ? "rate-limited" : "unreachable" };
  }

  let payload: GoogleComputeRoutesResponse;
  try {
    payload = await response.json();
  } catch {
    return { error: "unreachable" };
  }

  const route = payload.routes?.[0];
  if (!route) return { error: "unreachable" };

  return { data: isTransit ? parseTransitSteps(route, params) : parseSimpleLegs(route, params) };
}

// Exported for the offline-fallback banner (§5.1) to explain *why* live
// routing didn't run, distinct from a genuine network failure.
export function hasRoutesApiKey(): boolean {
  return !!apiKey();
}

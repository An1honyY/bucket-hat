// Journey Mode's route-progress model (Phase 22) — where along a planned
// Journey a GPS fix actually is, and what that implies for the map, the leg
// list and the ETA.
//
// Pure by design, same reasoning as src/lib/mapGeometry.ts: the maths that
// decides "you're 60% through the walk to Kingsland" is the part worth
// testing, and it shouldn't need a native map, a DOM or a GPS to exercise.
// Everything stateful (the subscription, the permission prompt, the refs
// that carry state between fixes) lives in useJourneyProgress.ts instead.
//
// Reuses decodePolyline/distanceMeters from annotations.ts and
// isUsableCoordinate from mapGeometry.ts rather than reimplementing either —
// there is exactly one polyline decoder and one haversine in this codebase
// and that should stay true.
import { decodePolyline, distanceMeters, type LatLng } from "./annotations";
import { isUsableCoordinate } from "./mapGeometry";
import type { JourneyLeg } from "../types";

// ---- Named thresholds — tune these, don't touch control flow below ----

// How far off the drawn route a fix has to be before we even consider
// calling it "off route". Urban GPS error alone is routinely 20-40m between
// tall buildings (Queen St, Britomart), and the route geometry itself is a
// road/path centreline rather than the footpath you're actually on, so a
// legitimately on-route walker sits tens of metres off the line as a matter
// of course.
export const OFF_ROUTE_THRESHOLD_M = 60;
// ...and how many consecutive fixes have to agree before the UI is allowed
// to say so. A single reflected fix can land hundreds of metres away; that's
// noise, not a wrong turn.
export const OFF_ROUTE_CONFIRM_FIXES = 3;

// Snapping searches a window around the last known position rather than the
// whole route. This is what makes a route that doubles back on itself (a
// there-and-return walk, a loop through a park) snap to the crossing you're
// actually at instead of the geometrically-nearest one, and it keeps the
// search proportional to the window rather than to a route that is routinely
// thousands of points long.
export const SNAP_SEARCH_WINDOW_M = 500;
// Real progress is monotonic, but a fix can legitimately correct slightly
// backwards (you rounded a corner wide, the previous fix over-shot). Small
// corrections are allowed; large ones are rejected as noise.
export const BACKTRACK_TOLERANCE_M = 25;

// The current leg's remaining time is scaled by how your observed pace
// compares to the planned pace, clamped so one bad fix can't produce a
// silly ETA. Deliberately asymmetric: being slower than planned is both more
// common and less suspicious than being implausibly fast.
export const PACE_FACTOR_MIN = 0.6;
export const PACE_FACTOR_MAX = 1.8;

// Arrival needs both proximity and persistence — passing within 75m of the
// destination on the way somewhere else isn't arriving.
export const ARRIVAL_RADIUS_M = 75;
export const ARRIVAL_DWELL_MS = 30_000;

// ---- Types ----

export interface LegRange {
  legId: string;
  // Indices into IndexedRoute.points. A leg with no geometry of its own
  // (an indoor dwell, a stationary transit wait) gets startIndex ===
  // endIndex and startM === endM — see indexRoute below.
  startIndex: number;
  endIndex: number;
  startM: number;
  endM: number;
  /** Planned duration, carried here so progress maths needn't re-walk legs. */
  durationMin: number;
  /** True when this leg contributes no route distance and advances on time. */
  isZeroLength: boolean;
}

export interface IndexedRoute {
  points: LatLng[];
  /** cumulativeM[i] = metres from the route start to points[i]. */
  cumulativeM: number[];
  totalM: number;
  legRanges: LegRange[];
}

export interface Snap {
  pointIndex: number;
  distanceAlongM: number;
  /** Straight-line distance from the fix to the snapped route point. */
  offRouteM: number;
}

export interface JourneyProgress {
  distanceAlongM: number;
  distanceRemainingM: number;
  /** 0-1 across the whole route; 0 when the route has no usable geometry. */
  fractionComplete: number;
  currentLegIndex: number;
  /** 0-1 within the current leg. */
  currentLegFraction: number;
  completedLegIds: string[];
  offRouteM: number;
  isOffRoute: boolean;
  /** Minutes left across every remaining leg, current one pro-rated. */
  remainingMin: number;
  /** Projected arrival, epoch ms. */
  etaMs: number;
  /** Bearing along the route at the snapped point, degrees clockwise from north. */
  bearingDeg?: number;
}

/**
 * State that has to survive between fixes. Owned by the caller (the hook)
 * and passed back in, so this module stays pure and every transition is
 * directly testable by handing it a previous value.
 */
export interface ProgressCarry {
  distanceAlongM: number;
  /** Consecutive fixes seen beyond OFF_ROUTE_THRESHOLD_M. */
  offRouteStreak: number;
  /** Epoch ms of the first fix on the current leg, for observed pace. */
  legStartedAtMs?: number;
  legStartedAtIndex?: number;
}

// ---- Route indexing ----

/**
 * Decode every leg's polyline into one distance-indexed route, remembering
 * which stretch belongs to which leg.
 *
 * Legs without geometry are the interesting case. planJourney.ts emits
 * indoor waypoint dwells and synthesized stationary waits with `polyline:
 * ""` — they're real legs the user spends real time in, but they occupy no
 * distance. They get a zero-length range pinned at the current end of the
 * route, so "which leg am I on" still resolves for them and the leg indices
 * stay aligned 1:1 with `journey.legs`. Progress through them is time-based
 * (see computeProgress) because distance can't express it.
 */
export function indexRoute(legs: JourneyLeg[]): IndexedRoute {
  const points: LatLng[] = [];
  const cumulativeM: number[] = [];
  const legRanges: LegRange[] = [];

  for (const leg of legs) {
    const decoded = leg.polyline ? decodePolyline(leg.polyline).filter(isUsableCoordinate) : [];
    const startIndex = points.length;
    const startM = cumulativeM.length > 0 ? cumulativeM[cumulativeM.length - 1] : 0;

    for (const point of decoded) {
      // Consecutive legs share an endpoint (one leg ends where the next
      // begins), and a stalled GPS trace can repeat a point outright.
      // Either way a duplicate adds a zero-length segment that snapping
      // then has to tie-break for no benefit.
      const previous = points[points.length - 1];
      if (previous && previous.lat === point.lat && previous.lng === point.lng) continue;
      const step = previous ? distanceMeters(previous, point) : 0;
      points.push(point);
      cumulativeM.push((cumulativeM[cumulativeM.length - 1] ?? 0) + step);
    }

    const endIndex = Math.max(startIndex, points.length - 1);
    const endM = cumulativeM.length > 0 ? cumulativeM[cumulativeM.length - 1] : 0;
    const isZeroLength = points.length === startIndex;

    legRanges.push({
      legId: leg.id,
      startIndex: isZeroLength ? Math.max(0, startIndex - 1) : startIndex,
      endIndex: isZeroLength ? Math.max(0, startIndex - 1) : endIndex,
      startM,
      endM: isZeroLength ? startM : endM,
      durationMin: leg.durationMin,
      isZeroLength,
    });
  }

  return {
    points,
    cumulativeM,
    totalM: cumulativeM[cumulativeM.length - 1] ?? 0,
    legRanges,
  };
}

// ---- Snapping ----

/**
 * Nearest point on the route to `fix`, searched within a window ahead of
 * (and slightly behind) the last known position.
 *
 * Point-nearest rather than true perpendicular-to-segment projection: a
 * decoded Google polyline's points are metres apart at walking scale, so the
 * extra precision would be well under the GPS error it's being compared
 * against — the same trade annotations.ts already makes for point-radius
 * matching, and for the same reason.
 */
export function snapToRoute(fix: LatLng, route: IndexedRoute, previousAlongM?: number): Snap | null {
  if (route.points.length === 0) return null;

  const lowerM = previousAlongM === undefined ? 0 : previousAlongM - BACKTRACK_TOLERANCE_M;
  const upperM = previousAlongM === undefined ? Infinity : previousAlongM + SNAP_SEARCH_WINDOW_M;

  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < route.points.length; i++) {
    const alongM = route.cumulativeM[i];
    if (alongM < lowerM || alongM > upperM) continue;
    const d = distanceMeters(fix, route.points[i]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }

  // The window can legitimately contain nothing — a fix taken past the end
  // of the route, or a previousAlongM already at totalM. Fall back to an
  // unwindowed search rather than reporting no progress at all.
  if (bestIndex === -1) {
    for (let i = 0; i < route.points.length; i++) {
      const d = distanceMeters(fix, route.points[i]);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
  }

  return {
    pointIndex: bestIndex,
    distanceAlongM: route.cumulativeM[bestIndex],
    offRouteM: bestDistance,
  };
}

/** Bearing along the route at `pointIndex`, degrees clockwise from north. */
function bearingAt(route: IndexedRoute, pointIndex: number): number | undefined {
  const from = route.points[pointIndex];
  // Look ahead far enough to clear GPS-scale jitter in the geometry itself;
  // two adjacent decoded points can be under a metre apart, where rounding
  // dominates the angle.
  let toIndex = pointIndex;
  while (toIndex < route.points.length - 1 && route.cumulativeM[toIndex] - route.cumulativeM[pointIndex] < 15) {
    toIndex++;
  }
  const to = route.points[toIndex];
  if (!from || !to || from === to) return undefined;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

// ---- Progress ----

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Where the journey stands, given one fix and whatever the last one left
 * behind.
 *
 * Returns `null` when the route has no usable geometry at all (every leg
 * missing a polyline — an all-indoor journey, or live routing having failed
 * and left the straight-line fallback). Callers render the ordinary static
 * view in that case rather than a progress display full of zeroes; there's
 * nothing to be accurate about.
 */
export function computeProgress(
  fix: LatLng,
  route: IndexedRoute,
  legs: JourneyLeg[],
  nowMs: number,
  carry?: ProgressCarry
): { progress: JourneyProgress; carry: ProgressCarry } | null {
  if (route.points.length === 0 || route.totalM === 0) return null;

  const snap = snapToRoute(fix, route, carry?.distanceAlongM);
  if (!snap) return null;

  // Monotonic guard. A fix that snaps behind where we already were, by more
  // than the tolerance, is treated as noise and the previous position is
  // held — progress along a journey doesn't run backwards, and letting it
  // makes the traveled/remaining split flicker.
  const previousAlongM = carry?.distanceAlongM ?? 0;
  const distanceAlongM =
    snap.distanceAlongM < previousAlongM - BACKTRACK_TOLERANCE_M ? previousAlongM : Math.max(snap.distanceAlongM, 0);

  const offRouteStreak = snap.offRouteM > OFF_ROUTE_THRESHOLD_M ? (carry?.offRouteStreak ?? 0) + 1 : 0;

  // Which leg are we on? Distance decides for legs with geometry. A
  // zero-length leg can't be located by distance, so it owns the moment
  // between the leg before it ending and the leg after it starting —
  // resolved on the clock instead.
  let currentLegIndex = resolveLegIndex(route, legs, distanceAlongM, nowMs);
  currentLegIndex = clamp(currentLegIndex, 0, Math.max(0, legs.length - 1));

  const range = route.legRanges[currentLegIndex];
  const legSpanM = range ? range.endM - range.startM : 0;
  const currentLegFraction = range
    ? range.isZeroLength || legSpanM <= 0
      ? zeroLengthLegFraction(legs[currentLegIndex], nowMs)
      : clamp((distanceAlongM - range.startM) / legSpanM, 0, 1)
    : 0;

  const completedLegIds = route.legRanges
    .slice(0, currentLegIndex)
    .map((r) => r.legId);

  // Observed pace on the current leg, only once there's enough of it to
  // mean anything. Before that, planned pace is the honest estimate.
  const legStartedAtMs = carry?.legStartedAtIndex === currentLegIndex ? carry.legStartedAtMs : nowMs;
  const paceFactor = observedPaceFactor(range, currentLegFraction, legStartedAtMs, nowMs);

  const remainingCurrentMin = range ? range.durationMin * (1 - currentLegFraction) * paceFactor : 0;
  // Later legs keep their planned duration untouched: we have no
  // observations for a bus that hasn't come yet, and scaling them by how
  // fast you walked to the stop would be making numbers up.
  const remainingLaterMin = route.legRanges
    .slice(currentLegIndex + 1)
    .reduce((sum, r) => sum + r.durationMin, 0);
  const remainingMin = Math.max(0, remainingCurrentMin + remainingLaterMin);

  return {
    progress: {
      distanceAlongM,
      distanceRemainingM: Math.max(0, route.totalM - distanceAlongM),
      fractionComplete: clamp(distanceAlongM / route.totalM, 0, 1),
      currentLegIndex,
      currentLegFraction,
      completedLegIds,
      offRouteM: snap.offRouteM,
      isOffRoute: offRouteStreak >= OFF_ROUTE_CONFIRM_FIXES,
      remainingMin,
      etaMs: nowMs + remainingMin * 60_000,
      bearingDeg: bearingAt(route, snap.pointIndex),
    },
    carry: {
      distanceAlongM,
      offRouteStreak,
      legStartedAtMs,
      legStartedAtIndex: currentLegIndex,
    },
  };
}

/**
 * A zero-length leg's progress, on the clock. `startTime` + `durationMin`
 * is exactly the window planJourney.ts sized it for, so an indoor dwell or a
 * platform wait fills up in real time rather than sitting at 0% until the
 * next leg's geometry starts moving.
 */
function zeroLengthLegFraction(leg: JourneyLeg | undefined, nowMs: number): number {
  if (!leg) return 0;
  const startMs = new Date(leg.startTime).getTime();
  if (!Number.isFinite(startMs) || leg.durationMin <= 0) return 0;
  return clamp((nowMs - startMs) / (leg.durationMin * 60_000), 0, 1);
}

function resolveLegIndex(route: IndexedRoute, legs: JourneyLeg[], distanceAlongM: number, nowMs: number): number {
  // Last leg whose geometry we've reached the start of. Zero-length legs are
  // skipped here (their startM === endM makes them ambiguous by distance)
  // and picked up in the clock pass below.
  let index = 0;
  for (let i = 0; i < route.legRanges.length; i++) {
    const range = route.legRanges[i];
    if (range.isZeroLength) continue;
    if (distanceAlongM >= range.startM) index = i;
  }

  // If a zero-length leg sits immediately before the leg distance picked,
  // and its own scheduled window hasn't elapsed yet, we're still in it —
  // standing on the platform, not yet on the bus.
  const previous = route.legRanges[index - 1];
  if (previous?.isZeroLength) {
    const leg = legs[index - 1];
    if (leg && zeroLengthLegFraction(leg, nowMs) < 1) return index - 1;
  }
  return index;
}

function observedPaceFactor(
  range: LegRange | undefined,
  legFraction: number,
  legStartedAtMs: number | undefined,
  nowMs: number
): number {
  if (!range || range.isZeroLength || legStartedAtMs === undefined) return 1;
  // Under a tenth of a leg, or under a minute into it, the ratio is
  // dominated by where the first fix happened to land.
  const elapsedMin = (nowMs - legStartedAtMs) / 60_000;
  if (legFraction < 0.1 || elapsedMin < 1) return 1;

  const plannedElapsedMin = range.durationMin * legFraction;
  if (plannedElapsedMin <= 0) return 1;
  return clamp(elapsedMin / plannedElapsedMin, PACE_FACTOR_MIN, PACE_FACTOR_MAX);
}

// ---- Map rendering support ----

/**
 * The route either side of the current position, for drawing the stretch
 * behind the user dimmed and the stretch ahead in full accent.
 *
 * The split point appears in both halves so the two polylines meet rather
 * than leaving a gap at the puck.
 */
export function splitPath(route: IndexedRoute, distanceAlongM: number): { traveled: LatLng[]; remaining: LatLng[] } {
  if (route.points.length === 0) return { traveled: [], remaining: [] };

  let splitIndex = 0;
  while (splitIndex < route.cumulativeM.length - 1 && route.cumulativeM[splitIndex] < distanceAlongM) {
    splitIndex++;
  }

  return {
    traveled: route.points.slice(0, splitIndex + 1),
    remaining: route.points.slice(splitIndex),
  };
}

/**
 * Which turn within a leg the user is currently on (Phase 22).
 *
 * Steps carry their own `distanceM`, and `legFraction` is already a
 * distance fraction of the leg, so the two line up without needing to snap
 * against each step's geometry separately. Steps with no distance (a
 * zero-length "depart" instruction) can't own any of the leg, so they're
 * passed through rather than allowed to swallow the first fraction.
 *
 * Returns 0 for an empty list so callers can index safely.
 */
export function activeStepIndex(steps: readonly { distanceM: number }[], legFraction: number): number {
  const totalM = steps.reduce((sum, step) => sum + Math.max(0, step.distanceM), 0);
  if (steps.length === 0 || totalM <= 0) return 0;

  const targetM = clamp(legFraction, 0, 1) * totalM;
  let walkedM = 0;
  for (let i = 0; i < steps.length; i++) {
    walkedM += Math.max(0, steps[i].distanceM);
    if (walkedM > targetM) return i;
  }
  return steps.length - 1;
}

/** Whether a fix is close enough to the destination, for long enough, to call it arrived. */
export function hasArrived(
  fix: LatLng,
  destination: LatLng,
  nowMs: number,
  withinRadiusSinceMs: number | undefined
): { arrived: boolean; withinRadiusSinceMs: number | undefined } {
  if (distanceMeters(fix, destination) > ARRIVAL_RADIUS_M) {
    return { arrived: false, withinRadiusSinceMs: undefined };
  }
  const since = withinRadiusSinceMs ?? nowMs;
  return { arrived: nowMs - since >= ARRIVAL_DWELL_MS, withinRadiusSinceMs: since };
}

import {
  ARRIVAL_DWELL_MS,
  activeStepIndex,
  BACKTRACK_TOLERANCE_M,
  OFF_ROUTE_CONFIRM_FIXES,
  PACE_FACTOR_MAX,
  PACE_FACTOR_MIN,
  computeProgress,
  hasArrived,
  indexRoute,
  snapToRoute,
  splitPath,
  type ProgressCarry,
} from "./journeyProgress";
import { distanceMeters } from "./annotations";
import type { JourneyLeg } from "../types";

// Minimal encoder (inverse of decodePolyline), same helper annotations.test.ts
// uses — lets these tests build legs with real encoded polylines rather than
// hand-computed strings.
function encodePolyline(points: { lat: number; lng: number }[]): string {
  let out = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const p of points) {
    for (const [value, prev] of [
      [Math.round(p.lat * 1e5), prevLat],
      [Math.round(p.lng * 1e5), prevLng],
    ] as const) {
      let delta = value - prev;
      delta = delta < 0 ? ~(delta << 1) : delta << 1;
      while (delta >= 0x20) {
        out += String.fromCharCode((0x20 | (delta & 0x1f)) + 63);
        delta >>= 5;
      }
      out += String.fromCharCode(delta + 63);
    }
    prevLat = Math.round(p.lat * 1e5);
    prevLng = Math.round(p.lng * 1e5);
  }
  return out;
}

const BASE_LAT = -36.8485;
const BASE_LNG = 174.7633;
const START_ISO = "2026-07-30T08:00:00.000Z";
const START_MS = new Date(START_ISO).getTime();

/** A north-running line of `count` points spaced 0.001 degrees (~111m) apart. */
function line(count: number, fromStep = 0): { lat: number; lng: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    lat: BASE_LAT + (fromStep + i) * 0.001,
    lng: BASE_LNG,
  }));
}

function leg(overrides: Partial<JourneyLeg> & { id: string }): JourneyLeg {
  return {
    mode: "walk",
    label: "Walk",
    durationMin: 10,
    startTime: START_ISO,
    outdoor: true,
    ...overrides,
  };
}

describe("indexRoute", () => {
  it("concatenates legs into one cumulative-distance route", () => {
    const route = indexRoute([
      leg({ id: "a", polyline: encodePolyline(line(3)) }),
      leg({ id: "b", polyline: encodePolyline(line(3, 3)) }),
    ]);

    expect(route.points).toHaveLength(6);
    expect(route.cumulativeM[0]).toBe(0);
    // Strictly increasing — a flat step would mean a duplicate got through.
    for (let i = 1; i < route.cumulativeM.length; i++) {
      expect(route.cumulativeM[i]).toBeGreaterThan(route.cumulativeM[i - 1]);
    }
    expect(route.totalM).toBeCloseTo(distanceMeters(route.points[0], route.points[5]), 0);
  });

  it("drops the duplicated point where one leg ends and the next begins", () => {
    // Leg B starts at exactly the point leg A ended on, which is how real
    // consecutive Google legs come back.
    const route = indexRoute([
      leg({ id: "a", polyline: encodePolyline(line(3)) }),
      leg({ id: "b", polyline: encodePolyline(line(3, 2)) }),
    ]);
    expect(route.points).toHaveLength(5);
  });

  it("gives a leg with no polyline a zero-length range at the previous leg's end", () => {
    const route = indexRoute([
      leg({ id: "walk", polyline: encodePolyline(line(3)) }),
      leg({ id: "wait", polyline: "", isStationary: true, durationMin: 6 }),
      leg({ id: "bus", mode: "bus", polyline: encodePolyline(line(3, 2)) }),
    ]);

    const [walk, wait, bus] = route.legRanges;
    expect(walk.isZeroLength).toBe(false);
    expect(wait.isZeroLength).toBe(true);
    expect(wait.startM).toBe(wait.endM);
    expect(wait.startM).toBeCloseTo(walk.endM, 5);
    expect(bus.startM).toBeCloseTo(walk.endM, 5);
    // Leg ranges stay aligned 1:1 with journey.legs so indices are shared.
    expect(route.legRanges.map((r) => r.legId)).toEqual(["walk", "wait", "bus"]);
  });

  it("returns an empty route when no leg has geometry", () => {
    const route = indexRoute([leg({ id: "indoor", mode: "indoor", outdoor: false })]);
    expect(route.points).toHaveLength(0);
    expect(route.totalM).toBe(0);
  });
});

describe("snapToRoute", () => {
  const route = indexRoute([leg({ id: "a", polyline: encodePolyline(line(6)) })]);

  it("finds the nearest route point", () => {
    const snap = snapToRoute({ lat: BASE_LAT + 0.002, lng: BASE_LNG }, route);
    expect(snap?.pointIndex).toBe(2);
    expect(snap?.offRouteM).toBeLessThan(5);
  });

  it("reports how far off the route the fix is", () => {
    // ~0.002 degrees of longitude east of the line.
    const snap = snapToRoute({ lat: BASE_LAT + 0.002, lng: BASE_LNG + 0.002 }, route);
    expect(snap?.offRouteM).toBeGreaterThan(100);
  });

  it("does not snap backwards on a route that doubles back on itself", () => {
    // Out and back along the same line: lat step 0,1,2,3 then 2,1,0.
    const there = line(4);
    const back = [...line(3)].reverse();
    const outAndBack = indexRoute([leg({ id: "a", polyline: encodePolyline([...there, ...back]) })]);

    const fix = { lat: BASE_LAT + 0.002, lng: BASE_LNG };
    // With no history, the geometrically-first match wins — the outbound pass.
    expect(snapToRoute(fix, outAndBack)?.pointIndex).toBe(2);

    // Having already reached the turnaround, the same fix is the return pass.
    const previousAlongM = outAndBack.cumulativeM[3];
    const snapped = snapToRoute(fix, outAndBack, previousAlongM);
    expect(snapped?.pointIndex).toBe(4);
    expect(snapped!.distanceAlongM).toBeGreaterThan(previousAlongM - BACKTRACK_TOLERANCE_M);
  });

  it("falls back to an unwindowed search when the window contains nothing", () => {
    // previousAlongM past the end of the route leaves the window empty.
    const snap = snapToRoute({ lat: BASE_LAT, lng: BASE_LNG }, route, route.totalM + 10_000);
    expect(snap).not.toBeNull();
    expect(snap?.pointIndex).toBe(0);
  });

  it("returns null for a route with no points", () => {
    expect(snapToRoute({ lat: BASE_LAT, lng: BASE_LNG }, indexRoute([]))).toBeNull();
  });
});

describe("computeProgress", () => {
  const legs = [leg({ id: "a", polyline: encodePolyline(line(11)), durationMin: 20 })];
  const route = indexRoute(legs);

  it("returns null when the journey has no usable geometry", () => {
    const indoorLegs = [leg({ id: "indoor", mode: "indoor", outdoor: false })];
    expect(computeProgress({ lat: BASE_LAT, lng: BASE_LNG }, indexRoute(indoorLegs), indoorLegs, START_MS)).toBeNull();
  });

  it("reports distance along, remaining and fraction complete", () => {
    const result = computeProgress({ lat: BASE_LAT + 0.005, lng: BASE_LNG }, route, legs, START_MS);
    expect(result).not.toBeNull();
    expect(result!.progress.fractionComplete).toBeCloseTo(0.5, 1);
    expect(result!.progress.distanceAlongM + result!.progress.distanceRemainingM).toBeCloseTo(route.totalM, 0);
  });

  it("holds position rather than running backwards", () => {
    const forward = computeProgress({ lat: BASE_LAT + 0.006, lng: BASE_LNG }, route, legs, START_MS)!;
    const backward = computeProgress(
      { lat: BASE_LAT + 0.001, lng: BASE_LNG },
      route,
      legs,
      START_MS + 10_000,
      forward.carry
    )!;
    expect(backward.progress.distanceAlongM).toBe(forward.progress.distanceAlongM);
  });

  it("allows a small backwards correction within tolerance", () => {
    const start = computeProgress({ lat: BASE_LAT + 0.005, lng: BASE_LNG }, route, legs, START_MS)!;
    // One point back is ~111m, well past tolerance; nudge only ~10m instead.
    const nudged = computeProgress(
      { lat: BASE_LAT + 0.005 - 0.00009, lng: BASE_LNG },
      route,
      legs,
      START_MS + 5_000,
      start.carry
    )!;
    expect(nudged.progress.distanceAlongM).toBeLessThanOrEqual(start.progress.distanceAlongM);
  });

  it("only reports off-route after consecutive confirming fixes", () => {
    const wayOff = { lat: BASE_LAT + 0.005, lng: BASE_LNG + 0.01 };
    let carry: ProgressCarry | undefined;
    for (let i = 1; i < OFF_ROUTE_CONFIRM_FIXES; i++) {
      const result = computeProgress(wayOff, route, legs, START_MS + i * 3000, carry)!;
      expect(result.progress.isOffRoute).toBe(false);
      carry = result.carry;
    }
    const confirmed = computeProgress(wayOff, route, legs, START_MS + 30_000, carry)!;
    expect(confirmed.progress.isOffRoute).toBe(true);
  });

  it("clears the off-route streak once a fix comes back on route", () => {
    const wayOff = { lat: BASE_LAT + 0.005, lng: BASE_LNG + 0.01 };
    let carry: ProgressCarry | undefined;
    for (let i = 0; i < OFF_ROUTE_CONFIRM_FIXES; i++) {
      carry = computeProgress(wayOff, route, legs, START_MS + i * 3000, carry)!.carry;
    }
    const back = computeProgress({ lat: BASE_LAT + 0.005, lng: BASE_LNG }, route, legs, START_MS + 20_000, carry)!;
    expect(back.progress.isOffRoute).toBe(false);
    expect(back.carry.offRouteStreak).toBe(0);
  });

  it("marks earlier legs complete as later ones begin", () => {
    const multi = [
      leg({ id: "walk", polyline: encodePolyline(line(4)) }),
      leg({ id: "ride", mode: "bus", polyline: encodePolyline(line(4, 3)) }),
    ];
    const multiRoute = indexRoute(multi);

    const onFirst = computeProgress({ lat: BASE_LAT + 0.001, lng: BASE_LNG }, multiRoute, multi, START_MS)!;
    expect(onFirst.progress.currentLegIndex).toBe(0);
    expect(onFirst.progress.completedLegIds).toEqual([]);

    const onSecond = computeProgress({ lat: BASE_LAT + 0.005, lng: BASE_LNG }, multiRoute, multi, START_MS + 60_000)!;
    expect(onSecond.progress.currentLegIndex).toBe(1);
    expect(onSecond.progress.completedLegIds).toEqual(["walk"]);
  });

  it("advances a stationary wait on the clock, not on distance", () => {
    const withWait = [
      leg({ id: "walk", polyline: encodePolyline(line(4)), durationMin: 5, startTime: START_ISO }),
      leg({
        id: "wait",
        polyline: "",
        isStationary: true,
        durationMin: 10,
        startTime: new Date(START_MS + 5 * 60_000).toISOString(),
      }),
      leg({
        id: "bus",
        mode: "bus",
        polyline: encodePolyline(line(4, 3)),
        durationMin: 12,
        startTime: new Date(START_MS + 15 * 60_000).toISOString(),
      }),
    ];
    const waitRoute = indexRoute(withWait);
    // Standing at the end of the walk, five minutes into a ten-minute wait.
    const atStop = { lat: BASE_LAT + 0.003, lng: BASE_LNG };
    const midWait = computeProgress(atStop, waitRoute, withWait, START_MS + 10 * 60_000)!;

    expect(midWait.progress.currentLegIndex).toBe(1);
    expect(midWait.progress.currentLegFraction).toBeCloseTo(0.5, 1);
    expect(midWait.progress.completedLegIds).toEqual(["walk"]);

    // Once the wait window has elapsed, the bus leg owns the same position.
    const boarded = computeProgress(atStop, waitRoute, withWait, START_MS + 16 * 60_000)!;
    expect(boarded.progress.currentLegIndex).toBe(2);
    expect(boarded.progress.completedLegIds).toEqual(["walk", "wait"]);
  });

  it("clamps the observed-pace factor rather than trusting a wild reading", () => {
    // Half a 20-minute leg covered in 60 minutes is a pace factor of 6 —
    // clamped to PACE_FACTOR_MAX, so the ETA stays sane.
    const crawling = computeProgress({ lat: BASE_LAT + 0.005, lng: BASE_LNG }, route, legs, START_MS, {
      distanceAlongM: 0,
      offRouteStreak: 0,
      legStartedAtMs: START_MS - 60 * 60_000,
      legStartedAtIndex: 0,
    })!;
    const plannedRemainingMin = 20 * (1 - crawling.progress.currentLegFraction);
    expect(crawling.progress.remainingMin).toBeCloseTo(plannedRemainingMin * PACE_FACTOR_MAX, 1);
  });

  it("does not scale the ETA before there is enough of the leg to judge", () => {
    const justStarted = computeProgress({ lat: BASE_LAT + 0.0002, lng: BASE_LNG }, route, legs, START_MS)!;
    expect(justStarted.progress.remainingMin).toBeCloseTo(20, 0);
    expect(justStarted.progress.etaMs).toBe(START_MS + justStarted.progress.remainingMin * 60_000);
  });

  it("never scales below the pace-factor floor", () => {
    const sprinting = computeProgress({ lat: BASE_LAT + 0.005, lng: BASE_LNG }, route, legs, START_MS, {
      distanceAlongM: 0,
      offRouteStreak: 0,
      legStartedAtMs: START_MS - 90_000,
      legStartedAtIndex: 0,
    })!;
    const plannedRemainingMin = 20 * (1 - sprinting.progress.currentLegFraction);
    expect(sprinting.progress.remainingMin).toBeGreaterThanOrEqual(plannedRemainingMin * PACE_FACTOR_MIN - 0.01);
  });

  it("reports a bearing along the direction of travel", () => {
    // The fixture line runs due north.
    const result = computeProgress({ lat: BASE_LAT + 0.002, lng: BASE_LNG }, route, legs, START_MS)!;
    expect(result.progress.bearingDeg).toBeCloseTo(0, 0);
  });
});

describe("splitPath", () => {
  const route = indexRoute([leg({ id: "a", polyline: encodePolyline(line(6)) })]);

  it("splits at the current position with the two halves meeting", () => {
    const { traveled, remaining } = splitPath(route, route.cumulativeM[3]);
    expect(traveled[traveled.length - 1]).toEqual(remaining[0]);
    // Every point appears, with exactly one shared at the join.
    expect(traveled.length + remaining.length).toBe(route.points.length + 1);
  });

  it("puts everything ahead of the user at the start of a journey", () => {
    const { traveled, remaining } = splitPath(route, 0);
    expect(traveled).toHaveLength(1);
    expect(remaining).toHaveLength(route.points.length);
  });

  it("puts everything behind the user at the end", () => {
    const { traveled, remaining } = splitPath(route, route.totalM);
    expect(traveled).toHaveLength(route.points.length);
    expect(remaining).toHaveLength(1);
  });

  it("handles a route with no geometry", () => {
    expect(splitPath(indexRoute([]), 0)).toEqual({ traveled: [], remaining: [] });
  });
});

describe("activeStepIndex", () => {
  const steps = [{ distanceM: 100 }, { distanceM: 300 }, { distanceM: 100 }];

  it("picks the step the user is partway through", () => {
    expect(activeStepIndex(steps, 0)).toBe(0);
    expect(activeStepIndex(steps, 0.1)).toBe(0);
    expect(activeStepIndex(steps, 0.5)).toBe(1);
    expect(activeStepIndex(steps, 0.95)).toBe(2);
  });

  it("stays on the last step at the end of the leg", () => {
    expect(activeStepIndex(steps, 1)).toBe(2);
  });

  it("clamps a fraction outside 0-1 rather than indexing off the end", () => {
    expect(activeStepIndex(steps, -1)).toBe(0);
    expect(activeStepIndex(steps, 5)).toBe(2);
  });

  it("returns 0 for an empty or distanceless list", () => {
    expect(activeStepIndex([], 0.5)).toBe(0);
    expect(activeStepIndex([{ distanceM: 0 }, { distanceM: 0 }], 0.5)).toBe(0);
  });

  it("does not let a zero-distance step swallow the start of the leg", () => {
    // A "depart" instruction with no distance of its own.
    expect(activeStepIndex([{ distanceM: 0 }, { distanceM: 200 }], 0.1)).toBe(1);
  });
});

describe("hasArrived", () => {
  const destination = { lat: BASE_LAT, lng: BASE_LNG };

  it("does not fire on proximity alone", () => {
    const result = hasArrived(destination, destination, START_MS, undefined);
    expect(result.arrived).toBe(false);
    expect(result.withinRadiusSinceMs).toBe(START_MS);
  });

  it("fires once the dwell has elapsed within the radius", () => {
    const first = hasArrived(destination, destination, START_MS, undefined);
    const later = hasArrived(destination, destination, START_MS + ARRIVAL_DWELL_MS, first.withinRadiusSinceMs);
    expect(later.arrived).toBe(true);
  });

  it("resets the dwell when the user leaves the radius", () => {
    const first = hasArrived(destination, destination, START_MS, undefined);
    const away = hasArrived({ lat: BASE_LAT + 0.01, lng: BASE_LNG }, destination, START_MS + 1000, first.withinRadiusSinceMs);
    expect(away.arrived).toBe(false);
    expect(away.withinRadiusSinceMs).toBeUndefined();
  });
});

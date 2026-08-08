import { applyAnnotationsToLegs, decodePolyline, distanceMeters, encodePolyline, matchAnnotationsToPoints } from "./annotations";
import type { EnvironmentAnnotation, JourneyLeg } from "../types";

// Encoding comes from the module under test now — a test-local copy of the
// encoder used to live here, written because there wasn't a real one.

function annotation(overrides: Partial<EnvironmentAnnotation>): EnvironmentAnnotation {
  return {
    id: "a1",
    label: "Test spot",
    effect: "wind-tunnel",
    lat: -36.8485,
    lng: 174.7633,
    radiusM: 100,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("decodePolyline", () => {
  it("decodes Google's documented example", () => {
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(points).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it("round-trips through the test encoder", () => {
    const original = [
      { lat: -36.8485, lng: 174.7633 },
      { lat: -36.8501, lng: 174.7658 },
    ];
    expect(decodePolyline(encodePolyline(original))).toEqual(original);
  });
});

describe("distanceMeters", () => {
  it("measures ~111m for 0.001° of latitude", () => {
    const d = distanceMeters({ lat: -36.8485, lng: 174.7633 }, { lat: -36.8475, lng: 174.7633 });
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(117);
  });
});

describe("matchAnnotationsToPoints", () => {
  const queenSt = { lat: -36.8485, lng: 174.7633 };
  // ~111m north of queenSt — outside a 100m radius, inside a 150m one.
  const nearby = { lat: -36.8475, lng: 174.7633 };

  it("matches an annotation within radius and records its id", () => {
    const stamps = matchAnnotationsToPoints([queenSt], [annotation({ effect: "wind-tunnel" })]);
    expect(stamps.windEffect).toBe("amplified");
    expect(stamps.matchedAnnotationIds).toEqual(["a1"]);
  });

  it("ignores an annotation outside its radius", () => {
    const stamps = matchAnnotationsToPoints([nearby], [annotation({ radiusM: 100 })]);
    expect(stamps).toEqual({});
  });

  it("applies same-category duplicates once but records all ids", () => {
    const stamps = matchAnnotationsToPoints(
      [queenSt],
      [annotation({ id: "a1" }), annotation({ id: "a2" })]
    );
    expect(stamps.windEffect).toBe("amplified");
    expect(stamps.matchedAnnotationIds).toEqual(expect.arrayContaining(["a1", "a2"]));
  });

  it("resolves a same-category conflict to the closer annotation, keeping both ids", () => {
    const stamps = matchAnnotationsToPoints(
      [queenSt],
      [
        annotation({ id: "far-shaded", effect: "shaded", lat: nearby.lat, radiusM: 150 }),
        annotation({ id: "near-sun", effect: "sun-exposed", radiusM: 150 }),
      ]
    );
    expect(stamps.sunEffect).toBe("exposed");
    expect(stamps.matchedAnnotationIds).toEqual(expect.arrayContaining(["far-shaded", "near-sun"]));
  });

  it("composes high-reflection additively with sun-exposed", () => {
    const stamps = matchAnnotationsToPoints(
      [queenSt],
      [
        annotation({ id: "sun", effect: "sun-exposed" }),
        annotation({ id: "reflect", effect: "high-reflection" }),
      ]
    );
    expect(stamps.sunEffect).toBe("exposed");
    expect(stamps.highReflection).toBe(true);
  });

  it("stamps rainCovered for a rain-cover annotation", () => {
    const stamps = matchAnnotationsToPoints([queenSt], [annotation({ effect: "rain-cover" })]);
    expect(stamps.rainCovered).toBe(true);
    expect(stamps.windEffect).toBeUndefined();
  });
});

describe("applyAnnotationsToLegs", () => {
  const baseLeg: JourneyLeg = {
    id: "l1",
    mode: "walk",
    label: "Walk down Queen St",
    durationMin: 10,
    startTime: "2026-07-21T08:00:00.000Z",
    outdoor: true,
    polyline: encodePolyline([
      { lat: -36.8485, lng: 174.7633 },
      { lat: -36.8501, lng: 174.7658 },
    ]),
  };

  it("stamps outdoor legs whose polyline passes through an annotation", () => {
    const [leg] = applyAnnotationsToLegs([baseLeg], [annotation({ effect: "wind-tunnel" })]);
    expect(leg.windEffect).toBe("amplified");
    expect(leg.matchedAnnotationIds).toEqual(["a1"]);
  });

  it("leaves indoor and polyline-less legs untouched", () => {
    const indoor: JourneyLeg = { ...baseLeg, id: "l2", mode: "indoor", outdoor: false, polyline: undefined };
    const [leg] = applyAnnotationsToLegs([indoor], [annotation({})]);
    expect(leg).toBe(indoor);
  });

  it("clears stale stamps when a re-run no longer matches", () => {
    const stale: JourneyLeg = { ...baseLeg, windEffect: "amplified", matchedAnnotationIds: ["gone"] };
    const [leg] = applyAnnotationsToLegs([stale], []);
    expect(leg.windEffect).toBeUndefined();
    expect(leg.matchedAnnotationIds).toBeUndefined();
  });

  // §5.6 point 3 (Phase 7) — a stationary wait leg has no polyline of its
  // own; its point is taken from the transit leg it precedes.
  it("matches a stationary wait leg against the following transit leg's first point", () => {
    const wait: JourneyLeg = {
      id: "wait",
      mode: "bus",
      label: "Waiting at Britomart",
      durationMin: 8,
      startTime: "2026-07-21T08:00:00.000Z",
      outdoor: true,
      isStationary: true,
      waitContext: "transit-stop",
    };
    const transit: JourneyLeg = {
      id: "bus-leg",
      mode: "bus",
      label: "Bus to Work",
      durationMin: 15,
      startTime: "2026-07-21T08:08:00.000Z",
      outdoor: true,
      polyline: encodePolyline([
        { lat: -36.8485, lng: 174.7633 },
        { lat: -36.86, lng: 174.77 },
      ]),
    };

    const [waitResult] = applyAnnotationsToLegs([wait, transit], [annotation({ effect: "wind-tunnel" })]);
    expect(waitResult.windEffect).toBe("amplified");
    expect(waitResult.matchedAnnotationIds).toEqual(["a1"]);
  });

  it("leaves a stationary wait leg untouched when the following leg has no polyline", () => {
    const wait: JourneyLeg = {
      id: "wait",
      mode: "bus",
      label: "Waiting at Britomart",
      durationMin: 8,
      startTime: "2026-07-21T08:00:00.000Z",
      outdoor: true,
      isStationary: true,
      waitContext: "transit-stop",
    };
    const [waitResult] = applyAnnotationsToLegs([wait], [annotation({ effect: "wind-tunnel" })]);
    expect(waitResult).toBe(wait);
  });
});

describe("encodePolyline", () => {
  // The property that matters: merging two walking segments into one leg
  // decodes both and re-encodes the joined path, so a round trip has to
  // survive to ~1e-5 precision (Google's own polyline resolution).
  it("round-trips a path through decodePolyline", () => {
    const path = [
      { lat: -36.8485, lng: 174.7633 },
      { lat: -36.8501, lng: 174.7669 },
      { lat: -36.8522, lng: 174.7701 },
    ];
    const decoded = decodePolyline(encodePolyline(path));
    expect(decoded).toHaveLength(path.length);
    decoded.forEach((point, i) => {
      expect(point.lat).toBeCloseTo(path[i].lat, 5);
      expect(point.lng).toBeCloseTo(path[i].lng, 5);
    });
  });

  it("handles an empty path", () => {
    expect(encodePolyline([])).toBe("");
    expect(decodePolyline("")).toEqual([]);
  });

  it("survives negative deltas in both axes", () => {
    const path = [
      { lat: -36.85, lng: 174.77 },
      { lat: -36.9, lng: 174.7 },
    ];
    const decoded = decodePolyline(encodePolyline(path));
    expect(decoded[1].lat).toBeCloseTo(-36.9, 5);
    expect(decoded[1].lng).toBeCloseTo(174.7, 5);
  });

  // Joining two segments as *text* is the bug this exists to prevent: the
  // second half's first delta would be measured from the wrong origin.
  it("joins two segments correctly, where string concatenation would not", () => {
    const first = [{ lat: -36.85, lng: 174.76 }, { lat: -36.86, lng: 174.77 }];
    const second = [{ lat: -36.86, lng: 174.77 }, { lat: -36.87, lng: 174.78 }];
    const joined = decodePolyline(encodePolyline([...first, ...second]));
    expect(joined[joined.length - 1].lat).toBeCloseTo(-36.87, 5);
    const naive = decodePolyline(encodePolyline(first) + encodePolyline(second));
    expect(naive[naive.length - 1].lat).not.toBeCloseTo(-36.87, 5);
  });
});

import {
  boundsKey,
  hexToRgba,
  isUsableCoordinate,
  MIN_REGION_DELTA,
  regionForCoordinates,
  SINGLE_POINT_DELTA,
  usableCoordinates,
} from "./mapGeometry";

// docs/11-testing-strategy.md — the map components themselves are
// renderers (untested by design), but the framing maths they both depend on
// is pure and is exactly the thing that silently broke before: the native
// map framed on a fixed window around the first stop, so a long commute ran
// off the edge.
const AUCKLAND = { lat: -36.8485, lng: 174.7633 };
const AIRPORT = { lat: -37.0082, lng: 174.7850 };

describe("isUsableCoordinate", () => {
  it("accepts a real coordinate", () => {
    expect(isUsableCoordinate(AUCKLAND)).toBe(true);
  });

  it("rejects missing, non-numeric, and non-finite values", () => {
    expect(isUsableCoordinate(undefined)).toBe(false);
    expect(isUsableCoordinate(null)).toBe(false);
    expect(isUsableCoordinate({ lat: -36.8 })).toBe(false);
    expect(isUsableCoordinate({ lat: NaN, lng: 174.7 })).toBe(false);
    expect(isUsableCoordinate({ lat: -36.8, lng: Infinity })).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(isUsableCoordinate({ lat: -91, lng: 174 })).toBe(false);
    expect(isUsableCoordinate({ lat: -36, lng: 181 })).toBe(false);
  });

  it("accepts (0, 0) — filtering Null Island is approximateLocation.ts's job, not the map's", () => {
    expect(isUsableCoordinate({ lat: 0, lng: 0 })).toBe(true);
  });
});

describe("usableCoordinates", () => {
  it("drops bad points instead of poisoning the whole set", () => {
    expect(usableCoordinates([AUCKLAND, { lat: NaN, lng: 1 }, AIRPORT])).toEqual([AUCKLAND, AIRPORT]);
  });

  it("handles undefined", () => {
    expect(usableCoordinates(undefined)).toEqual([]);
  });
});

describe("regionForCoordinates", () => {
  it("returns null with nothing to frame", () => {
    expect(regionForCoordinates([])).toBeNull();
    expect(regionForCoordinates([{ lat: NaN, lng: NaN }])).toBeNull();
  });

  it("gives a single point a fixed neighborhood window", () => {
    const region = regionForCoordinates([AUCKLAND]);
    expect(region).toEqual({
      latitude: AUCKLAND.lat,
      longitude: AUCKLAND.lng,
      latitudeDelta: SINGLE_POINT_DELTA,
      longitudeDelta: SINGLE_POINT_DELTA,
    });
  });

  it("centers on the midpoint of the extent, not the first point", () => {
    const region = regionForCoordinates([AUCKLAND, AIRPORT])!;
    expect(region.latitude).toBeCloseTo((AUCKLAND.lat + AIRPORT.lat) / 2, 6);
    expect(region.longitude).toBeCloseTo((AUCKLAND.lng + AIRPORT.lng) / 2, 6);
  });

  it("frames the whole span with padding — the bug the native map had", () => {
    const span = Math.abs(AUCKLAND.lat - AIRPORT.lat);
    const region = regionForCoordinates([AUCKLAND, AIRPORT])!;
    expect(region.latitudeDelta).toBeGreaterThan(span);
  });

  it("floors a very short leg at a zoom that still shows context", () => {
    const region = regionForCoordinates([
      { lat: -36.8485, lng: 174.7633 },
      { lat: -36.8486, lng: 174.7634 },
    ])!;
    expect(region.latitudeDelta).toBe(MIN_REGION_DELTA);
    expect(region.longitudeDelta).toBe(MIN_REGION_DELTA);
  });

  it("ignores unusable points when computing the extent", () => {
    const clean = regionForCoordinates([AUCKLAND, AIRPORT])!;
    const dirty = regionForCoordinates([AUCKLAND, { lat: NaN, lng: 999 }, AIRPORT])!;
    expect(dirty).toEqual(clean);
  });
});

describe("boundsKey", () => {
  it("is stable across separate but equal point sets", () => {
    expect(boundsKey([AUCKLAND, AIRPORT])).toBe(boundsKey([{ ...AUCKLAND }, { ...AIRPORT }]));
  });

  it("changes when the framed extent changes", () => {
    expect(boundsKey([AUCKLAND, AIRPORT])).not.toBe(boundsKey([AUCKLAND]));
  });

  it("has a distinct value for nothing to frame", () => {
    expect(boundsKey([])).toBe("empty");
    expect(boundsKey(undefined)).toBe("empty");
  });
});

describe("hexToRgba", () => {
  it("converts 6-digit hex", () => {
    expect(hexToRgba("#C86BFF", 0.12)).toBe("rgba(200, 107, 255, 0.12)");
  });

  it("converts 3-digit shorthand", () => {
    expect(hexToRgba("#0F8", 0.5)).toBe("rgba(0, 255, 136, 0.5)");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(hexToRgba(" #c86bff ", 1)).toBe("rgba(200, 107, 255, 1)");
  });

  it("passes anything it can't parse through untouched", () => {
    expect(hexToRgba("rgba(1, 2, 3, 0.5)", 0.2)).toBe("rgba(1, 2, 3, 0.5)");
    expect(hexToRgba("tomato", 0.2)).toBe("tomato");
  });
});

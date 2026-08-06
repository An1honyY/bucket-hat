// Longitude wrapping for the web map picker. Kept as its own test because the
// bug it guards is invisible in code review and expensive to find by hand:
// Leaflet reports longitude unwrapped across world copies, so panning west
// from Auckland to the Americas — a short, obvious drag on the map — produces
// longitudes past +180 that Google's Geocoding API rejects outright with
// `INVALID_REQUEST`. The pin silently never resolves, which reads as "the map
// doesn't recognise anywhere in the USA".
//
// Duplicated from LocationPickerMap.web.tsx rather than exported from it: that
// module imports react-leaflet, which jest-expo can't load in a node
// environment, and a four-line pure function isn't worth restructuring the
// component to share.
function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

describe("wrapLng", () => {
  it("leaves an in-range longitude alone", () => {
    expect(wrapLng(174.7633)).toBeCloseTo(174.7633);
    expect(wrapLng(-73.9855)).toBeCloseTo(-73.9855);
    expect(wrapLng(0)).toBe(0);
  });

  it("wraps the pan west from Auckland into the Americas", () => {
    // The actual failing case: New York, reached by dragging west across the
    // antimeridian, arrives from Leaflet as +286.
    expect(wrapLng(286.0145)).toBeCloseTo(-73.9855);
    expect(wrapLng(237.5806)).toBeCloseTo(-122.4194);
  });

  it("wraps the pan east as well", () => {
    expect(wrapLng(-433.9855)).toBeCloseTo(-73.9855);
    expect(wrapLng(-185)).toBeCloseTo(175);
  });

  it("survives several times around the world", () => {
    expect(wrapLng(174.7633 + 360 * 3)).toBeCloseTo(174.7633);
    expect(wrapLng(174.7633 - 360 * 2)).toBeCloseTo(174.7633);
  });

  it("keeps the antimeridian itself on one side rather than flipping it", () => {
    expect(wrapLng(180)).toBe(-180);
    expect(wrapLng(-180)).toBe(-180);
  });
});

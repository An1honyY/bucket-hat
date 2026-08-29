import { basemapFor } from "./leafletBasemap";

// CARTO began watermarking keyless raster tiles with "API KEY REQUIRED"
// (2026-08-28), so the provider is now conditional — and the condition is a
// build-time env var, which is exactly the kind of thing that is only ever
// exercised on the deploy that gets it wrong.

const originalKey = process.env.EXPO_PUBLIC_CARTO_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_CARTO_API_KEY;
  else process.env.EXPO_PUBLIC_CARTO_API_KEY = originalKey;
});

describe("basemapFor — without a CARTO key", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_CARTO_API_KEY;
  });

  it("serves keyless tiles rather than watermarked ones", () => {
    for (const isDark of [false, true]) {
      const basemap = basemapFor(isDark);
      expect(basemap.url).not.toContain("cartocdn");
      expect(basemap.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
      // No CARTO tiles, so no CARTO credit — OSM's alone.
      expect(basemap.attribution).not.toContain("carto.com");
      expect(basemap.attribution).toContain("openstreetmap.org");
    }
  });

  it("inverts the fallback's light tiles in dark mode, and leaves them alone in light", () => {
    expect(basemapFor(true).className).toBe("cwp-dark-basemap cwp-invert-tiles");
    expect(basemapFor(false).className).toBeUndefined();
  });

  it("doesn't ask OSM for retina tiles it doesn't have", () => {
    // `detectRetina` against a server with no @2x quadruples the requests.
    expect(basemapFor(false).detectRetina).toBe(false);
  });

  it("treats an empty variable as unset — a blank dashboard field is not a key", () => {
    process.env.EXPO_PUBLIC_CARTO_API_KEY = "";
    expect(basemapFor(false).url).not.toContain("cartocdn");
  });
});

describe("basemapFor — with a CARTO key", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_CARTO_API_KEY = "key/with+chars";
  });

  it("keeps Voyager and Dark Matter, keyed", () => {
    expect(basemapFor(false).url).toBe(
      "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=key%2Fwith%2Bchars"
    );
    expect(basemapFor(true).url).toContain("/dark_all/");
  });

  it("credits CARTO, and keeps the Dark Matter legibility filter", () => {
    expect(basemapFor(true).attribution).toContain("carto.com");
    expect(basemapFor(true).className).toBe("cwp-dark-basemap");
    expect(basemapFor(true).detectRetina).toBe(true);
  });

  it("leaves Leaflet's {r} placeholder for it to expand, not encoded away", () => {
    expect(basemapFor(false).url).toContain("{z}/{x}/{y}{r}.png");
  });
});

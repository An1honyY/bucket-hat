// Shared tile-provider config for both web maps (LocationPickerMap.web.tsx,
// JourneyMap.web.tsx).
//
// This used to be one line: CARTO's Voyager / Dark Matter raster tiles,
// picked in 2026-07-22 for being free, keyless and far cleaner than raw
// OpenStreetMap "Standard" next to this app's own UI. As of 2026-08-28 the
// keyless half is over — CARTO now watermarks unauthenticated raster tiles
// with "API KEY REQUIRED" across every tile, which is what the live site
// started showing on its location picker.
//
// So the provider is now a choice made at build time:
//
//   - `EXPO_PUBLIC_CARTO_API_KEY` set  -> CARTO, exactly as before, keyed.
//     Keys are free (no account, ~5M tiles/month) from
//     https://carto.com/basemaps/apikey.
//   - unset -> OpenStreetMap's own standard tiles, which are still keyless.
//     Busier and lighter than Dark Matter, but a map that works beats a map
//     that is prettier in principle and watermarked in practice.
//
// The fallback is the point: a deploy that forgets the variable degrades to
// a working map rather than a broken one, which is the same posture
// routesService/placesService take toward *their* key.

/** CARTO's own attribution line — required whenever its tiles are used. */
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** OSM's, for the keyless fallback: no CARTO tiles, so no CARTO credit. */
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface Basemap {
  url: string;
  attribution: string;
  isDark: boolean;
  /**
   * Class for the `MapContainer`, or undefined in light mode.
   *
   * `cwp-dark-basemap` themes Leaflet's own chrome and lifts Dark Matter's
   * muted labels; `cwp-invert-tiles` is added on top for the OSM fallback,
   * whose tiles are a light basemap that has to be inverted to sit in a dark
   * app at all. Both live in leafletCss.ts.
   */
  className?: string;
  /**
   * Whether to ask Leaflet for high-DPI tiles.
   *
   * On for CARTO, whose URLs carry `{r}` and answer with a real `@2x` tile.
   * Off for OSM, which has no `@2x`: `detectRetina` then falls back to
   * fetching a zoom level deeper at half size, quadrupling the request count
   * against a volunteer-funded tile server whose usage policy asks for the
   * opposite.
   */
  detectRetina: boolean;
}

function cartoApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_CARTO_API_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function basemapFor(isDark: boolean): Basemap {
  const key = cartoApiKey();

  if (key) {
    const style = isDark ? "dark_all" : "rastertiles/voyager";
    return {
      url: `https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      attribution: CARTO_ATTRIBUTION,
      isDark,
      className: isDark ? "cwp-dark-basemap" : undefined,
      detectRetina: true,
    };
  }

  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTRIBUTION,
    isDark,
    className: isDark ? "cwp-dark-basemap cwp-invert-tiles" : undefined,
    detectRetina: false,
  };
}

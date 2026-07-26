// Pure geometry/color helpers shared by both map implementations
// (JourneyMap.tsx / .web.tsx, LocationPickerMap.tsx / .web.tsx) —
// docs/09-design-system.md §9.3 item 1. Kept out of the components
// themselves so the framing maths is unit-testable without a native map or
// a DOM (docs/11-testing-strategy.md: pure logic gets tests, renderers
// don't), and so the native/web split can't drift on how a route is framed
// the way it did when only the web map fitted bounds at all.

export interface LatLngLike {
  lat: number;
  lng: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Used when there's nothing to frame *against* — a single point has no
// extent of its own, so it gets a fixed neighborhood-sized window.
export const SINGLE_POINT_DELTA = 0.05;
// Breathing room around the route's own bounding box, so the start/end pins
// don't sit flush against the map edge (the native equivalent of the web
// fitBounds() padding).
export const REGION_PADDING_FACTOR = 1.4;
// A very short leg (a two-minute walk) would otherwise frame at a zoom so
// tight the surrounding streets give no context at all.
export const MIN_REGION_DELTA = 0.008;

// Real journeys have produced NaN/undefined coordinates before (a leg whose
// polyline failed to decode, a saved location mid-edit) — one bad point
// poisons a min/max reduction and blanks the whole map, so they're dropped
// rather than propagated.
export function isUsableCoordinate(point: Partial<LatLngLike> | null | undefined): point is LatLngLike {
  if (!point) return false;
  const { lat, lng } = point;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function usableCoordinates(points: readonly (Partial<LatLngLike> | null | undefined)[] | undefined): LatLngLike[] {
  const usable: LatLngLike[] = [];
  for (const point of points ?? []) {
    if (isUsableCoordinate(point)) usable.push({ lat: point.lat, lng: point.lng });
  }
  return usable;
}

// The native counterpart to the web map's map.fitBounds() — a Region that
// contains every supplied point with padding. Returns null when there's
// nothing usable to frame, so callers can skip rendering rather than
// centering on (0, 0).
export function regionForCoordinates(points: readonly Partial<LatLngLike>[] | undefined): MapRegion | null {
  const usable = usableCoordinates(points);
  if (usable.length === 0) return null;

  let minLat = usable[0].lat;
  let maxLat = usable[0].lat;
  let minLng = usable[0].lng;
  let maxLng = usable[0].lng;
  for (const { lat, lng } of usable) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  if (usable.length === 1) {
    return { latitude, longitude, latitudeDelta: SINGLE_POINT_DELTA, longitudeDelta: SINGLE_POINT_DELTA };
  }

  return {
    latitude,
    longitude,
    latitudeDelta: Math.max((maxLat - minLat) * REGION_PADDING_FACTOR, MIN_REGION_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * REGION_PADDING_FACTOR, MIN_REGION_DELTA),
  };
}

// A cheap stability key for "has the thing we framed against actually
// changed" effect dependencies. A decoded route polyline is routinely
// thousands of points, so JSON.stringify-ing the whole path on every render
// (the web map's original approach) is real work done every frame for a
// value that only changes when the journey does — the framed extent is the
// only part that can affect framing, and it rounds to ~1m precision.
export function boundsKey(points: readonly Partial<LatLngLike>[] | undefined): string {
  const region = regionForCoordinates(points);
  if (!region) return "empty";
  const round = (n: number) => n.toFixed(5);
  return [
    usableCoordinates(points).length,
    round(region.latitude),
    round(region.longitude),
    round(region.latitudeDelta),
    round(region.longitudeDelta),
  ].join(":");
}

// Theme tokens are authored as #rrggbb (src/theme/tokens.ts), but the
// weather-mood palettes and any future token edit could reasonably use the
// #rgb shorthand — anything unrecognized passes through untouched so a
// stroke color is never silently swapped for a broken one.
export function hexToRgba(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : match[1];
  const int = parseInt(hex, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

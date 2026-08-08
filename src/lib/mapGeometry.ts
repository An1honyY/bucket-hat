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

// How far apart two condition pucks have to be before both are worth
// drawing. A routed walk is one leg per turn, so a ten-minute walk through
// town produced a dozen pucks stacked on top of each other, all reporting the
// same weather — the marker's job is "conditions along the route," and the
// weather does not change between one street corner and the next.
//
// 1500m is a suburb's width, give or take, across most of Auckland. Doing
// this by actual suburb would mean a reverse-geocode per marker per journey
// (placesService.reverseGeocodeSuburb) — a billed call to answer a question
// the geometry already answers well enough. Distance is the proxy; a genuine
// change in the weather is never thinned away regardless (see thinBySpacing's
// `keyOf`), so "one per suburb, or wherever the weather changes" is what
// comes out.
export const MIN_CONDITION_MARKER_SPACING_M = 1500;

// A condition puck sitting on top of a bus stop marker hides the more
// actionable of the two. Anything this close to a stop is dropped outright
// rather than nudged: near a stop the puck is redundant anyway, since the
// stop's own leg carries the same weather in the list below.
export const CONDITION_MARKER_STOP_CLEARANCE_M = 250;

// How far off the route line a condition puck sits. Fixed metres rather than
// pixels, because neither map exposes a zoom-aware offset for a marker — at
// street zoom this clears the 5px route stroke and its casing comfortably,
// and at city zoom it collapses back onto the line, which is the zoom where
// the line is a hairline and there was nothing to collide with anyway.
export const CONDITION_MARKER_OFFSET_M = 70;

// Distance between two coordinates, in metres. Duplicated deliberately from
// annotations.ts's distanceMeters rather than imported: that module is the
// annotation-matching pipeline (it pulls in JourneyLeg and the polyline
// decoder), and the map-geometry helpers stay dependency-free so they can be
// reasoned about — and tested — as pure maths.
const EARTH_RADIUS_M = 6371000;

export function metersBetween(a: LatLngLike, b: LatLngLike): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, in degrees clockwise from north. */
export function bearingBetween(a: LatLngLike, b: LatLngLike): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/**
 * The point `meters` away from `origin` along `bearingDeg`.
 *
 * A flat-earth approximation, which over the tens of metres this is used for
 * (nudging a marker off a route line) is accurate to well under a metre and
 * avoids the spherical formula's behaviour near the poles — irrelevant in
 * Auckland, but the simpler maths is also the easier one to reason about.
 */
export function offsetMeters(origin: LatLngLike, bearingDeg: number, meters: number): LatLngLike {
  const METERS_PER_DEGREE_LAT = 111_320;
  const rad = (bearingDeg * Math.PI) / 180;
  const north = Math.cos(rad) * meters;
  const east = Math.sin(rad) * meters;
  const latDelta = north / METERS_PER_DEGREE_LAT;
  // Longitude degrees get shorter towards the poles; at Auckland's latitude a
  // degree of longitude is about 80% of a degree of latitude.
  const lngScale = Math.cos((origin.lat * Math.PI) / 180) || 1;
  const lngDelta = east / (METERS_PER_DEGREE_LAT * lngScale);
  return { lat: origin.lat + latDelta, lng: origin.lng + lngDelta };
}

/**
 * Drops points that sit closer than `minSpacingM` to the last one kept, so a
 * dense run of markers thins to a legible scatter.
 *
 * `keyOf` is the escape hatch that keeps this from throwing away information:
 * a point whose key differs from the last kept one survives regardless of how
 * close it is. For condition markers the key is the weather itself, so the
 * spot where a route crosses from clear into rain is always drawn — proximity
 * only ever collapses markers that were saying the same thing twice.
 */
export function thinBySpacing<T extends LatLngLike>(
  points: readonly T[],
  minSpacingM: number,
  keyOf?: (point: T) => string
): T[] {
  const kept: T[] = [];
  let last: T | undefined;
  for (const point of points) {
    const changed = last !== undefined && keyOf !== undefined && keyOf(point) !== keyOf(last);
    if (last === undefined || changed || metersBetween(last, point) >= minSpacingM) {
      kept.push(point);
      last = point;
    }
  }
  return kept;
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

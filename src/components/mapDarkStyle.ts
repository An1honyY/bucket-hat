import type { MapStyleElement } from "react-native-maps";

// Dark basemap styling for the native maps (JourneyMap.tsx,
// LocationPickerMap.tsx), so a map dropped into this app's dark theme
// (§9.1) isn't a glaring white rectangle in the middle of an otherwise dark
// screen. The web maps already swap CARTO Voyager for Dark Matter tiles
// with the theme (leafletBasemap.ts) — this is the same idea on the only
// mechanism native offers:
//
//   - Android (Google Maps) reads `customMapStyle`, this array.
//   - iOS (Apple Maps) ignores `customMapStyle` entirely and instead honors
//     `userInterfaceStyle="dark"`, which the components pass alongside it.
//
// Deliberately restrained rather than a full designer palette: desaturated
// greys for land/roads with the app's own accent colors left to carry the
// route line and markers, which is what actually needs to stand out. POI
// and transit labels stay on — a commute map with no station or landmark
// names is harder to orient in, which was half the original complaint.
export const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#1b2036" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa2c4" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#151a2e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3a4166" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8d94b8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1d2a2b" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6f8a7c" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3050" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#a7aecd" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#333b60" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d456f" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#9aa2c4" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#2f3557" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#333b60" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#101529" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4d5680" }] },
];

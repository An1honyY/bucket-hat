import L from "leaflet";

// Shared inline-SVG marker icons for both web maps (LocationPickerMap.web.tsx,
// JourneyMap.web.tsx) — no external marker-image assets, matching the
// reasoning LocationPickerMap.web.tsx's header comment already established.

export function pinDivIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "cwp-location-marker",
    html: `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.6 7 11.5 7.3 11.7a1 1 0 0 0 1.4 0C13 21.5 20 15.6 20 10c0-4.4-3.6-8-8-8Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.2"/><circle cx="12" cy="10" r="2.6" fill="#FFFFFF"/></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });
}

// Start and intermediate stops used to be the *same* teardrop pin as the
// destination, so a three-stop journey rendered as three identical markers
// and the map couldn't tell you which end you were looking at. These two
// deliberately reuse PlanScreen's route-rail vocabulary — a filled dot for
// the origin, an outlined dot for each stop, the pin kept for the
// destination — so the rail you built the journey on and the map you read
// it back from say the same thing.
export function originDivIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "cwp-origin-marker",
    html: `<div style="width:18px;height:18px;border-radius:9px;background:${color};border:2.5px solid #FFFFFF;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Numbered, unlike the rail's plain outlined dot: on a rail the stops are
// already in reading order down the page, but scattered across a map
// "which stop is this" has no other answer.
export function stopDivIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "cwp-stop-marker",
    html: `<div style="width:20px;height:20px;border-radius:10px;background:#FFFFFF;border:2.5px solid ${color};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${color};line-height:1;box-shadow:0 1px 3px rgba(0,0,0,0.4);">${label}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Mirrors JourneyMap.tsx's native conditionMarker style: a 24px circular
// white-bordered badge holding a centered emoji.
export function conditionDivIcon(color: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: "cwp-condition-marker",
    html: `<div style="width:24px;height:24px;border-radius:12px;background:${color};border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;font-size:12px;box-sizing:border-box;">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// A saved EnvironmentAnnotation badge (§4.5) — mirrors JourneyMap.tsx's
// native annotationMarker: a 26px circular white-bordered badge in the
// annotationPin color holding the effect's emoji glyph.
export function annotationDivIcon(color: string, icon: string): L.DivIcon {
  return L.divIcon({
    className: "cwp-annotation-marker",
    html: `<div style="width:26px;height:26px;border-radius:13px;background:${color};border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;font-size:13px;box-sizing:border-box;">${icon}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

import type { TravelMode } from "../types";

// Shared 24x24 / stroke-1.8 path data for the transport-mode glyphs.
//
// Extracted out of ModeIcon.tsx so the two renderers that need it can read
// one source: ModeIcon.tsx draws them with react-native-svg, and
// leafletIcons.ts has to emit raw SVG markup into a Leaflet divIcon on web.
// Same reasoning that put the map framing maths in mapGeometry.ts — the
// native/web split shouldn't be able to drift on something this literal.
//
// Paths for walk/cycle/bus/train/hike adapted from Tabler Icons (MIT);
// drive reuses ClothingTypeIcon's "vehicle" car path from the same source;
// "stationary" (a waiting/standing figure, distinct from "walk" per
// docs/09-design-system.md §9.3) is hand-drawn, as is the "indoor" building
// glyph (Tabler "building", MIT).

export type ModeIconKind = TravelMode | "stationary" | "indoor";

export const MODE_ICON_PATHS: Record<ModeIconKind, string[]> = {
  walk: [
    "M12,4a1,1,0,1,0,2,0a1,1,0,1,0,-2,0",
    "M7,21l3,-4",
    "M16,21l-2,-4l-3,-3l1,-6",
    "M6,12l2,-3l4,-1l3,3l3,1",
  ],
  cycle: [
    "M2,18a3,3,0,1,0,6,0a3,3,0,0,0,-6,0",
    "M16,18a3,3,0,1,0,6,0a3,3,0,0,0,-6,0",
    "M12,19v-4l-3,-3l5,-4l2,3h3",
    "M13.007,5a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
  ],
  drive: [
    "M5,17a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
    "M15,17a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
    "M5,17h-2v-6l2,-5h9l4,5h1a2,2,0,0,1,2,2v4h-2m-4,0h-6m-6,-6h15m-6,0v-5",
  ],
  bus: [
    "M4,17a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
    "M16,17a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
    "M4,17h-2v-11a1,1,0,0,1,1,-1h14a5,7,0,0,1,5,7v5h-2m-4,0h-8",
    "M16,5l1.5,7l4.5,0",
    "M2,10l15,0",
    "M7,5l0,5",
    "M12,5l0,5",
  ],
  train: [
    "M21,13c0,-3.87,-3.37,-7,-10,-7h-8",
    "M3,15h16a2,2,0,0,0,2,-2",
    "M3,6v5h17.5",
    "M3,11v4",
    "M8,11v-5",
    "M13,11v-4.5",
    "M3,19h18",
  ],
  hike: [
    "M3,20h18l-6.921,-14.612a2.3,2.3,0,0,0,-4.158,0l-6.921,14.612",
    "M7.5,11l2,2.5l2.5,-2.5l2,3l2.5,-2",
  ],
  // A waiting figure — head + torso + planted legs, distinct from "walk"'s
  // mid-stride pose so a stationary leg reads as its own thing.
  stationary: ["M12,4a1,1,0,1,0,2,0a1,1,0,1,0,-2,0", "M12,9v8", "M9,10.5l3,-1.5l3,1.5", "M9,20l3,-3l3,3"],
  // A generic building glyph for an indoor leg with no AC/heated climate
  // flag to render as a text pill instead (Tabler Icons "building", MIT).
  indoor: [
    "M3,21l18,0",
    "M9,8l1,0",
    "M9,12l1,0",
    "M9,16l1,0",
    "M14,8l1,0",
    "M14,12l1,0",
    "M14,16l1,0",
    "M5,21v-16a2,2,0,0,1,2,-2h10a2,2,0,0,1,2,2v16",
  ],
};

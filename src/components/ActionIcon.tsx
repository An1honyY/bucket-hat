import Svg, { Path } from "react-native-svg";

// UI/UX polish pass 2 — replaces scattered UI-action glyphs (✕ ✓ ★ ☆ ⚠ ↻ ⇄
// 📍) with real icons in the same 24x24/stroke-1.8 convention as the app's
// other icon sets. Simple enough shapes to hand-draw reliably, unlike the
// clothing set — no external source needed.
export type ActionIconKind =
  | "check"
  | "close"
  | "star"
  | "warning"
  | "repeat"
  | "swap"
  | "pin"
  | "bookmark"
  | "crosshair"
  | "flag"
  | "search"
  | "arrowRight"
  | "chevronRight"
  | "chevronDown"
  | "chevronUp"
  | "expand"
  | "share";

const PATHS: Record<ActionIconKind, string[]> = {
  check: ["M5,13l4,4l10,-10"],
  close: ["M6,6l12,12", "M18,6l-6,6l-6,6"],
  star: ["M12,3l2.7,5.9l6.3,.7l-4.7,4.4l1.3,6.2l-5.6,-3.2l-5.6,3.2l1.3,-6.2l-4.7,-4.4l6.3,-.7z"],
  warning: ["M12,3l9.5,17h-19z", "M12,10.5v3.5", "M12,17v.01"],
  repeat: ["M4,12a8,8,0,0,1,13.9,-5.4l1.1,1.1", "M17,3v5h-5", "M20,12a8,8,0,0,1,-13.9,5.4l-1.1,-1.1", "M7,21v-5h5"],
  swap: ["M4,9h13l-3,-3", "M20,15h-13l3,3"],
  pin: ["M12,21c-4,-4.5,-7,-8.2,-7,-11.5a7,7,0,0,1,14,0c0,3.3,-3,7,-7,11.5", "M12,12.5a2.5,2.5,0,1,0,0,-5a2.5,2.5,0,0,0,0,5"],
  bookmark: ["M17,3a2,2,0,0,1,2,2v16l-7,-4l-7,4v-16a2,2,0,0,1,2,-2z"],
  // "Type a place instead", for onboarding's location options. A plain
  // magnifier: the address field it opens is a search, and `pin` already
  // means "a spot on a map" one row below it.
  search: ["M10.5,4a6.5,6.5,0,1,1,0,13a6.5,6.5,0,0,1,0,-13", "M15.3,15.3l4.7,4.7"],
  // "origin → destination", for the journey summary card. `swap` is the
  // two-way return-trip glyph and would read as the wrong relationship here.
  arrowRight: ["M4,12h15", "M13,6l6,6l-6,6"],
  // Disclosure state, replacing the "▸"/"▾" text glyphs several screens were
  // drawing inline. Those render at the font's own weight and baseline, so
  // they sat visually lighter and slightly high against the label beside
  // them, and their size drifted with whatever TYPE role wrapped them.
  chevronRight: ["M9,5l7,7l-7,7"],
  chevronDown: ["M5,9l7,7l7,-7"],
  chevronUp: ["M5,15l7,-7l7,7"],
  // "Where the route starts", for PlanScreen's route rail and the journey
  // maps' first marker. A flag rather than another circle: the rail's other
  // two markers are already a circle (each stop) and a teardrop (the
  // destination), so a third circular shape for the origin gave the one
  // marker you most want to find at a glance the least distinctive
  // silhouette of the three.
  flag: ["M7,3v18", "M7,4.5h11l-2.8,4l2.8,4h-11z"],
  // "Give this the whole screen", for Journey Detail's map. The four corner
  // brackets pushing outward — the universal expand glyph — rather than a
  // diagonal double-arrow, which reads as "resize" (a thing you drag) on a
  // control that is a single tap.
  expand: ["M4,9v-5h5", "M20,9v-5h-5", "M4,15v5h5", "M20,15v5h-5"],
  // "Send this somewhere else", for the shareable conditions card (§13.2).
  // The tray-and-arrow rather than iOS's own share glyph or Android's
  // three-node one: each of those reads as native furniture on the wrong
  // platform, and this app draws one icon set for both.
  share: ["M12,4v11", "M8,8l4,-4l4,4", "M5,14v4a2,2,0,0,0,2,2h10a2,2,0,0,0,2,-2v-4"],
  // The standard "locate me" target, for LocationPickerMap's recenter
  // button — deliberately not the `pin` glyph, which already means "the
  // dropped marker" everywhere else in this app.
  crosshair: [
    "M12,5a7,7,0,1,1,0,14a7,7,0,0,1,0,-14",
    "M12,10.6a1.4,1.4,0,1,1,0,2.8a1.4,1.4,0,0,1,0,-2.8",
    "M12,2v3",
    "M12,19v3",
    "M2,12h3",
    "M19,12h3",
  ],
};

// Kinds whose closed shape reads solid when `filled` is passed. For star and
// bookmark that's a toggle state (solid = active); for flag it isn't a state
// at all — a hollow banner at 18px is mostly whitespace, so the route rail
// asks for the solid version to keep the marker legible at marker size.
const FILLABLE_KINDS: ReadonlySet<ActionIconKind> = new Set(["star", "bookmark", "flag"]);

interface Props {
  kind: ActionIconKind;
  size?: number;
  color: string;
  // "star"/"bookmark" only — an active toggle renders solid-filled,
  // matching the filled/outline distinction the old ★/☆ glyphs carried.
  filled?: boolean;
}

export default function ActionIcon({ kind, size = 16, color, filled }: Props) {
  const useFill = FILLABLE_KINDS.has(kind) && filled;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[kind].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          fill={useFill ? color : "none"}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

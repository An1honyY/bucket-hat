import Svg, { Path } from "react-native-svg";

// UI/UX polish pass 2 — replaces scattered UI-action glyphs (✕ ✓ ★ ☆ ⚠ ↻ ⇄
// 📍) with real icons in the same 24x24/stroke-1.8 convention as the app's
// other icon sets. Simple enough shapes to hand-draw reliably, unlike the
// clothing set — no external source needed.
export type ActionIconKind = "check" | "close" | "star" | "warning" | "repeat" | "swap" | "pin" | "bookmark" | "crosshair";

const PATHS: Record<ActionIconKind, string[]> = {
  check: ["M5,13l4,4l10,-10"],
  close: ["M6,6l12,12", "M18,6l-6,6l-6,6"],
  star: ["M12,3l2.7,5.9l6.3,.7l-4.7,4.4l1.3,6.2l-5.6,-3.2l-5.6,3.2l1.3,-6.2l-4.7,-4.4l6.3,-.7z"],
  warning: ["M12,3l9.5,17h-19z", "M12,10.5v3.5", "M12,17v.01"],
  repeat: ["M4,12a8,8,0,0,1,13.9,-5.4l1.1,1.1", "M17,3v5h-5", "M20,12a8,8,0,0,1,-13.9,5.4l-1.1,-1.1", "M7,21v-5h5"],
  swap: ["M4,9h13l-3,-3", "M20,15h-13l3,3"],
  pin: ["M12,21c-4,-4.5,-7,-8.2,-7,-11.5a7,7,0,0,1,14,0c0,3.3,-3,7,-7,11.5", "M12,12.5a2.5,2.5,0,1,0,0,-5a2.5,2.5,0,0,0,0,5"],
  bookmark: ["M17,3a2,2,0,0,1,2,2v16l-7,-4l-7,4v-16a2,2,0,0,1,2,-2z"],
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

// Kinds where "filled" is a meaningful toggle state (solid = active) rather
// than always stroke-only — a favorited location's star, a saved route's
// bookmark. Both use the exact same closed-shape-fills-solid mechanic.
const FILLABLE_KINDS: ReadonlySet<ActionIconKind> = new Set(["star", "bookmark"]);

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

import Svg, { Path } from "react-native-svg";

// Phase 22 — turn-by-turn maneuver glyphs, in the same 24x24 / stroke-1.8
// convention as ModeIcon/NavIcon/ActionIcon. Hand-authored rather than
// pulled from an icon library, matching this repo's standing choice not to
// have one (see NavIcon.tsx's header).
//
// Google's maneuver enum is larger than this set; several values collapse
// onto one glyph deliberately. A "roundabout left" and a "fork left" are
// different instructions but the same *shape* of arrow, and the instruction
// text beside it already says which — an icon per enum value would be
// fifteen near-identical arrows for no added clarity.
export type ManeuverKind =
  | "straight"
  | "left"
  | "right"
  | "slight-left"
  | "slight-right"
  | "sharp-left"
  | "sharp-right"
  | "uturn"
  | "merge"
  | "depart"
  | "arrive";

const PATHS: Record<ManeuverKind, string[]> = {
  straight: ["M12,20v-15", "M7,10l5,-5l5,5"],
  left: ["M18,20v-8a4,4,0,0,0,-4,-4h-7", "M11,4l-4,4l4,4"],
  right: ["M6,20v-8a4,4,0,0,1,4,-4h7", "M13,4l4,4l-4,4"],
  "slight-left": ["M17,20v-6a5,5,0,0,0,-1.5,-3.5l-4.5,-4.5", "M7,6h5v5"],
  "slight-right": ["M7,20v-6a5,5,0,0,1,1.5,-3.5l4.5,-4.5", "M17,6h-5v5"],
  "sharp-left": ["M17,20v-9a4,4,0,0,0,-4,-4h-6", "M12,3l-5,4l5,4"],
  "sharp-right": ["M7,20v-9a4,4,0,0,1,4,-4h6", "M12,3l5,4l-5,4"],
  uturn: ["M8,20v-11a4,4,0,0,1,8,0v6", "M13,12l3,3l3,-3"],
  merge: ["M12,20v-7", "M12,13c0,-4,-2,-6,-5,-8", "M12,13c0,-4,2,-6,5,-8", "M9,7l-2,-2l2,-2"],
  depart: ["M12,21a2,2,0,1,0,0,-4a2,2,0,1,0,0,4", "M12,17v-8", "M8,12l4,-4l4,4"],
  // Mirrors ActionIcon's `flag`, which already means "the destination" on
  // the map — the step list and the map should agree about that.
  arrive: ["M7,21v-16", "M7,6h10l-2.5,3.5l2.5,3.5h-10"],
};

// Google's maneuver strings → the glyph set above. Anything unrecognized
// (or absent — the transit path never supplies one) falls back to
// "straight", which reads as "carry on" rather than as a wrong turn.
export function maneuverKindFor(maneuver: string | undefined): ManeuverKind {
  switch (maneuver) {
    case "TURN_LEFT":
    case "ROUNDABOUT_LEFT":
    case "ROUNDABOUT_SHARP_LEFT":
      return "left";
    case "TURN_RIGHT":
    case "ROUNDABOUT_RIGHT":
    case "ROUNDABOUT_SHARP_RIGHT":
      return "right";
    case "TURN_SLIGHT_LEFT":
    case "FORK_LEFT":
    case "RAMP_LEFT":
    case "ROUNDABOUT_SLIGHT_LEFT":
      return "slight-left";
    case "TURN_SLIGHT_RIGHT":
    case "FORK_RIGHT":
    case "RAMP_RIGHT":
    case "ROUNDABOUT_SLIGHT_RIGHT":
      return "slight-right";
    case "TURN_SHARP_LEFT":
      return "sharp-left";
    case "TURN_SHARP_RIGHT":
      return "sharp-right";
    case "TURN_U_TURN_LEFT":
    case "TURN_U_TURN_RIGHT":
    case "ROUNDABOUT_U_TURN":
      return "uturn";
    case "MERGE":
      return "merge";
    case "DEPART":
      return "depart";
    case "NAME_CHANGE":
    case "STRAIGHT":
    case "ROUNDABOUT_STRAIGHT":
      return "straight";
    default:
      return "straight";
  }
}

interface Props {
  kind: ManeuverKind;
  size?: number;
  color: string;
}

export default function ManeuverIcon({ kind, size = 18, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[kind].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

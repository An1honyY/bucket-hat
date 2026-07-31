import Svg, { Path } from "react-native-svg";
import { MODE_ICON_PATHS, type ModeIconKind } from "./modeIconPaths";

// UI/UX polish pass 2 — replaces LegRow's MODE_ICON emoji map (and the
// standalone 🧍 stationary-wait glyph) with real icons in the same 24x24/
// stroke-1.8 convention as ClothingTypeIcon/NavIcon/WeatherIcon.
//
// The path data itself moved to modeIconPaths.ts in Phase 22, so the web
// map's Leaflet divIcon can build the same glyphs as raw SVG markup without
// duplicating them. Re-exported here so existing `import ModeIcon, { type
// ModeIconKind }` call sites keep working.
export type { ModeIconKind };

interface Props {
  kind: ModeIconKind;
  size?: number;
  color: string;
}

export default function ModeIcon({ kind, size = 16, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {MODE_ICON_PATHS[kind].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

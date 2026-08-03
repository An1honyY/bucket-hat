import { StyleSheet } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import useTheme from "../theme/useTheme";

// The wash behind every screen's scroll content.
//
// Was a flat dot grid (2026-07-23): texture, but texture that could have
// belonged to any app — a notes app, a to-do list, a banking app. This is a
// weather app, so the background is now weather: a sky gradient falling from
// the top, one soft sun glow, and two low cloud banks drifting across the
// upper third. All of it in the caller's tint, which on the Today tab is the
// mood-reactive `patternTint` (§9.1.3) — so the sky behind the cards leans
// cool on a cold wet day and warm on a bright one, without any screen having
// to opt in.
//
// Still decoration, never a foreground element (§9.0's glanceability-first
// rule): everything here sits under 0.2 alpha before the container opacity is
// applied, the shapes are soft-edged with no hard lines to catch the eye, and
// the whole thing is `pointerEvents="none"`. If it ever competes with a card
// for attention, it's wrong.
interface Props {
  // Defaults to the theme's patternTint; callers override to match a
  // mood-tinted background (Today tab).
  tint?: string;
  opacity?: number;
}

// A 100×100 box scaled to cover (not stretch) whatever it's rendered into, so
// the clouds keep their shape on a phone and a tablet alike.
const VIEW_BOX = "0 0 100 100";

export default function ScreenPattern({ tint, opacity }: Props) {
  const theme = useTheme();
  const color = tint ?? theme.patternTint;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      pointerEvents="none"
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid slice"
      opacity={opacity ?? (theme.isLight ? 0.9 : 0.75)}
    >
      <Defs>
        {/* Sky: strongest at the very top, gone by just under halfway, so
            cards further down the scroll sit on the plain background. */}
        <LinearGradient id="cwp-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={theme.isLight ? 0.16 : 0.22} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.05} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
        {/* One diffuse light source, off to the trailing edge — enough to
            give the sky a direction without reading as a literal sun. */}
        <RadialGradient id="cwp-sun" cx="0.82" cy="0.06" r="0.55">
          <Stop offset="0" stopColor={color} stopOpacity={theme.isLight ? 0.2 : 0.26} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        {/* The cloud banks fade out at their own edges, so they have no
            outline anywhere — a hard-edged shape at this size would read as
            a UI element rather than as sky. */}
        <LinearGradient id="cwp-cloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.1} />
          <Stop offset="1" stopColor={color} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>

      <Rect width="100" height="100" fill="url(#cwp-sky)" />
      <Rect width="100" height="60" fill="url(#cwp-sun)" />

      {/* Upper bank: three overlapping lobes on one baseline, the usual way
          a cumulus silhouette is built. */}
      <Ellipse cx="18" cy="16" rx="17" ry="7" fill="url(#cwp-cloud)" />
      <Ellipse cx="31" cy="13" rx="13" ry="8" fill="url(#cwp-cloud)" />
      <Ellipse cx="44" cy="17" rx="15" ry="6" fill="url(#cwp-cloud)" />

      {/* Lower bank, further right and flatter — distance. */}
      <Ellipse cx="72" cy="30" rx="20" ry="6" fill="url(#cwp-cloud)" />
      <Ellipse cx="86" cy="27" rx="14" ry="7" fill="url(#cwp-cloud)" />

      {/* A single horizon line low in the frame, curved like the harbour
          edge this app was built for. Barely there — it exists to stop the
          bottom half being completely empty. */}
      <Path d="M-5,78 C25,72 60,84 105,74 L105,101 L-5,101 Z" fill={color} fillOpacity={0.04} />
    </Svg>
  );
}

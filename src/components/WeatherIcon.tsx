import Svg, { Path } from "react-native-svg";
import type { WeatherCondition } from "../lib/weather";

// UI/UX polish pass 2 — replaces classifyWeather()'s emoji `icon` field
// (still kept on WeatherCondition for map-marker/accessibility use, see
// DECISIONS.md) with a real icon everywhere RN renders the condition
// directly (RightNowCard, JourneyCard stage chips, LegRow's badge). Paths
// adapted from Tabler Icons (MIT) — same 24x24/round-line convention as
// ClothingTypeIcon/NavIcon.
export type WeatherIconKind = "sun" | "cloud" | "drizzle" | "rain" | "storm" | "fog" | "wind" | "moon";

// classifyWeather()'s 8 possible labels collapse onto 7 icon kinds — "Rain"
// and "Heavy rain" share one raindrop glyph, same as they already share one
// emoji, distinguished instead by the condition* colour they're rendered in.
const KIND_BY_LABEL: Record<string, WeatherIconKind> = {
  Dry: "sun",
  Overcast: "cloud",
  Windy: "wind",
  Foggy: "fog",
  "Light rain": "drizzle",
  Rain: "rain",
  "Heavy rain": "rain",
  Stormy: "storm",
};

// `isDaylight` is optional so every existing call site (RightNowCard,
// JourneyCard, LegRow — all built from a live WeatherSnapshot that's
// always "now," where the sun icon is only ever wrong for a few minutes
// around actual sunrise/sunset) keeps working unchanged. The hourly strip
// is the one place this actually matters — a 12-hour outlook routinely
// spans into the evening, where a "Dry" reading rendering as a bright sun
// reads as a mistake, not a real forecast.
export function weatherIconKindFor(condition: WeatherCondition, isDaylight?: boolean): WeatherIconKind {
  const kind = KIND_BY_LABEL[condition.label] ?? "cloud";
  return kind === "sun" && isDaylight === false ? "moon" : kind;
}

const PATHS: Record<WeatherIconKind, string[]> = {
  sun: ["M8,12a4,4,0,1,0,8,0a4,4,0,1,0,-8,0", "M3,12h1m8,-9v1m8,8h1m-9,8v1m-6.4,-15.4l.7,.7m12.1,-.7l-.7,.7m0,11.4l.7,.7m-12.1,-.7l-.7,.7"],
  cloud: ["M6.657,18c-2.572,0,-4.657,-2.007,-4.657,-4.483c0,-2.475,2.085,-4.482,4.657,-4.482c.393,-1.762,1.794,-3.2,3.675,-3.773c1.88,-.572,3.956,-.193,5.444,1c1.488,1.19,2.162,3.007,1.77,4.769h.99c1.913,0,3.464,1.56,3.464,3.486c0,1.927,-1.551,3.487,-3.465,3.487h-11.878"],
  drizzle: ["M7,18a4.6,4.4,0,0,1,0,-9a5,4.5,0,0,1,11,2h1a3.5,3.5,0,0,1,0,7", "M11,15v2"],
  rain: ["M7,18a4.6,4.4,0,0,1,0,-9a5,4.5,0,0,1,11,2h1a3.5,3.5,0,0,1,0,7", "M11,13v2m0,3v2m4,-5v2m0,3v2"],
  storm: ["M7,18a4.6,4.4,0,0,1,0,-9a5,4.5,0,0,1,11,2h1a3.5,3.5,0,0,1,0,7h-1", "M13,14l-2,4l3,0l-2,4"],
  fog: ["M7,16a4.6,4.4,0,0,1,0,-9a5,4.5,0,0,1,11,2h1a3.5,3.5,0,0,1,0,7h-12", "M5,20l14,0"],
  wind: ["M5,8h8.5a2.5,2.5,0,1,0,-2.34,-3.24", "M3,12h15.5a2.5,2.5,0,1,1,-2.34,3.24", "M4,16h5.5a2.5,2.5,0,1,1,-2.34,3.24"],
  // A crescent (two overlapping arcs) plus a small sparkle — "clear at
  // night," the dark-sky counterpart to "sun" for the same Dry/clear
  // reading, so the hourly outlook never shows a bright sun for 9pm.
  moon: ["M12,3a7.5,7.5,0,0,0,7.92,12.446a9,9,0,1,1,-8.313,-12.454z", "M19,3v3m-1.5,-1.5h3"],
};

interface Props {
  kind: WeatherIconKind;
  size?: number;
  color: string;
}

export default function WeatherIcon({ kind, size = 16, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[kind].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

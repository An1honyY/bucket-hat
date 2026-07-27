import Svg, { Path } from "react-native-svg";
import type { WeatherCondition } from "../lib/weather";

// UI/UX polish pass 2 — replaces classifyWeather()'s emoji `icon` field
// (still kept on WeatherCondition for map-marker/accessibility use, see
// DECISIONS.md) with a real icon everywhere RN renders the condition
// directly (RightNowCard, JourneyCard stage chips, LegRow's badge). Paths
// adapted from Tabler Icons (MIT) — same 24x24/round-line convention as
// ClothingTypeIcon/NavIcon.
export type WeatherIconKind =
  | "sun"
  | "cloud"
  | "drizzle"
  | "rain"
  | "storm"
  | "fog"
  | "wind"
  | "moon"
  | "partlyCloudyDay"
  | "partlyCloudyNight"
  | "snow";

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

// Display-only sibling of the above, for the hourly outlook: resolves the
// icon from the raw WMO code instead of classifyWeather()'s label.
//
// classifyWeather deliberately collapses codes into the eight labels the
// *recommendation engine* needs (docs/06) — 0 (clear), 1 (mainly clear) and
// 2 (partly cloudy) all become "Dry", and every frozen-precipitation code
// falls through its `code >= 61` branch into "Rain". That's the right
// grouping for deciding what to wear, and the wrong one for a 12-hour
// forecast row, where a partly-cloudy afternoon drawn as a bright sun reads
// as a bug rather than a forecast.
//
// This deliberately does NOT change classifyWeather: recommend.ts branches on
// those exact labels and severities, and they're covered by recommend.test.ts.
// The two functions answer different questions and are allowed to disagree.
export function hourlyIconKindForCode(code: number, isDaylight: boolean, windKph: number): WeatherIconKind {
  if (code >= 95) return "storm";
  if (code >= 85) return "snow"; // 85/86 snow showers
  if (code >= 80) return "rain"; // 80-82 rain showers
  if (code >= 71) return "snow"; // 71-77 snowfall / grains
  if (code >= 61) return "rain"; // 61-67, incl. 66/67 freezing rain
  if (code >= 51) return "drizzle"; // 51-57, incl. 56/57 freezing drizzle
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "cloud";
  if (code === 1 || code === 2) return isDaylight ? "partlyCloudyDay" : "partlyCloudyNight";
  // Wind only outranks a plain clear sky, matching classifyWeather's ordering.
  if (windKph > 25) return "wind";
  return isDaylight ? "sun" : "moon";
}

// Shown in the outlook's key and used as the spoken condition in each hour's
// accessibility label. Keyed on the icon rather than the condition so the key
// can never describe a glyph differently from what's drawn above it.
export const WEATHER_ICON_LABEL: Record<WeatherIconKind, string> = {
  sun: "Sunny",
  moon: "Clear",
  partlyCloudyDay: "Partly cloudy",
  partlyCloudyNight: "Partly cloudy",
  cloud: "Overcast",
  fog: "Fog",
  wind: "Windy",
  drizzle: "Light rain",
  rain: "Rain",
  snow: "Snow",
  storm: "Storm",
};

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
  // WMO 1/2 — "mainly clear" / "partly cloudy". The sun is drawn as a
  // three-quarter arc rather than a full circle so the cloud reads as being
  // in *front* of it; a closed circle behind a stroke-only cloud just looks
  // like two overlapping outlines.
  partlyCloudyDay: [
    "M6.6,11.4a3.6,3.6,0,1,1,6.3,-2.4",
    "M9.5,2.2v1.6M3.4,8.4h1.6M5.05,4.05l1.15,1.15M14.1,4.05l-1.15,1.15",
    "M9,19.8a3.5,3.5,0,0,1,.2,-7a4.6,4.6,0,0,1,8.7,1.2a3,3,0,0,1,-.4,5.8h-8.5z",
  ],
  // Same construction at night — a small crescent behind the same cloud.
  partlyCloudyNight: [
    "M8.5,2.5a3.75,3.75,0,0,0,3.96,6.22a4.5,4.5,0,1,1,-4.16,-6.23z",
    "M9,19.8a3.5,3.5,0,0,1,.2,-7a4.6,4.6,0,0,1,8.7,1.2a3,3,0,0,1,-.4,5.8h-8.5z",
  ],
  // WMO 71-77/85-86. Previously these fell into classifyWeather's rain
  // branch and drew raindrops; see hourlyIconKindForCode above.
  snow: [
    "M7,16a4.6,4.4,0,0,1,0,-9a5,4.5,0,0,1,11,2h1a3.5,3.5,0,0,1,0,7h-12",
    "M9,19.5v.01",
    "M12.5,21v.01",
    "M16,19.5v.01",
    "M12.5,18v.01",
  ],
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

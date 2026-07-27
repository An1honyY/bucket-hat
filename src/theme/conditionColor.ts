import type { WeatherIconKind } from "../components/WeatherIcon";
import type { ThemeTokens } from "./tokens";

// docs/09-design-system.md §9.1: "Map classifyWeather()'s severity (0–4)
// directly to the active theme's condition* tokens via a lookup array — don't
// branch in the render layer."
//
// The rule was in the spec but the lookup never existed, so every surface drew
// its weather icons in one flat `textSecondary`. That is what made the
// forecast rows read as colourless: a sunny noon, an overcast evening and a
// thunderstorm were the same grey-lavender, so nothing on the row drew the eye
// and there was no way to skim it for the part that mattered.
//
// Theme-agnostic by construction — it indexes whichever token object
// useTheme()/useWeatherTheme() returned, so it works unchanged in both themes
// and under a weather-mood override.
export const CONDITION_COLOR_BY_SEVERITY = [
  "conditionDry",
  "conditionLight",
  "conditionRain",
  "conditionHeavy",
  "conditionStorm",
] as const;

export function conditionColorForSeverity(theme: ThemeTokens, severity: 0 | 1 | 2 | 3 | 4): string {
  return theme[CONDITION_COLOR_BY_SEVERITY[severity]];
}

// The icon-kind equivalent, for the forecast rows. They resolve their glyph
// from the raw WMO code (hourlyIconKindForCode) rather than from
// classifyWeather's severity, so colouring by severity would put the new
// partly-cloudy and snow glyphs in whatever bucket their code happens to fall
// in. Keyed on what's actually drawn instead, so the colour and the shape
// always agree.
// Grouped by how much sky there is, not by an arbitrary hue per glyph, so the
// row reads as a gradient from clear to wet rather than a set of stickers:
//
//   clear      bright (warm by day, violet by night)
//   partly     neutral
//   overcast   dimmed
//   wet        blue, deepening with intensity
//   severe     violet / cyan
//
// The clear-day and partly-cloudy-day slots deliberately do NOT both use a
// yellow: uvBadge and conditionLight are the same #FFD23F in the dark theme,
// so pairing them would have made a sunny hour and a hazy one identical.
const COLOR_TOKEN_BY_ICON: Record<WeatherIconKind, keyof ThemeTokens> = {
  sun: "uvBadge",
  moon: "accentDrive",
  partlyCloudyDay: "textSecondary",
  partlyCloudyNight: "textSecondary",
  cloud: "conditionDry",
  fog: "conditionDry",
  wind: "accentTransit",
  drizzle: "conditionRain",
  rain: "conditionHeavy",
  snow: "acBadge",
  storm: "conditionStorm",
};

export function conditionColorForIcon(theme: ThemeTokens, kind: WeatherIconKind): string {
  return theme[COLOR_TOKEN_BY_ICON[kind]] as string;
}

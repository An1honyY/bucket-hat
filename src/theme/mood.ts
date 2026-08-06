import { classifyWeather, resolveWeatherMood, type WeatherMood } from "../lib/weather";
import { moodOverrides, type ThemeTokens } from "./tokens";
import type { WeatherSnapshot } from "../types";

// §9.1.3 — merges a weather reading's mood onto a base palette. The single
// place that turns a WeatherSnapshot into colours, shared by useTheme() (the
// app-wide mood) and useWeatherTheme() (a specific reading's mood).
//
// Only ever hands back one of the six palettes, and the mood changes in one
// step. Blending between two of them was built twice — once in JS per frame,
// once on an Animated.Value — and removed both times; see DECISIONS.md
// 2026-08-06 for the measurements, and don't rebuild it without repeating
// them.

// Merged palettes are cached by base-theme + mood, so a component that reads
// the theme every render gets the *same object* back rather than a fresh one.
// `useMemo(..., [theme])` in commonStyles.ts and every screen's
// `getStyles(theme)` depend on that identity holding still; there are only
// six possible results, so this never grows.
const merged = new Map<string, ThemeTokens>();

/** The mood a reading resolves to; "mild" for no reading at all. */
export function moodFor(weather: WeatherSnapshot | null | undefined): WeatherMood {
  if (!weather) return "mild";
  const severity = classifyWeather(weather.weatherCode, weather.precipMm, weather.windKph).severity;
  return resolveWeatherMood(weather.apparentTempC, severity);
}

/** The settled palette for one mood. */
export function paletteForMood(base: ThemeTokens, mood: WeatherMood): ThemeTokens {
  // "mild" *is* the base palette — moodOverrides has no entry for it.
  if (mood === "mild") return base;

  const scheme = base.isLight ? "light" : "dark";
  const key = `${scheme}:${mood}`;
  const cached = merged.get(key);
  if (cached) return cached;

  const next = { ...base, ...moodOverrides[mood][scheme] };
  merged.set(key, next);
  return next;
}

export function applyWeatherMood(base: ThemeTokens, weather: WeatherSnapshot | null | undefined): ThemeTokens {
  if (!weather) return base;
  return paletteForMood(base, moodFor(weather));
}

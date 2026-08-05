import { classifyWeather, resolveWeatherMood } from "../lib/weather";
import { moodOverrides, type ThemeTokens } from "./tokens";
import type { WeatherSnapshot } from "../types";

// §9.1.3 — merges a weather reading's mood onto a base palette. The single
// place that turns a WeatherSnapshot into colours, shared by useTheme() (the
// ambient, app-wide mood) and useWeatherTheme() (a specific reading's mood).

// Merged palettes are cached by base-theme + mood, so a component that reads
// the theme every render gets the *same object* back rather than a fresh one.
// `useMemo(..., [theme])` in commonStyles.ts and every screen's
// `getStyles(theme)` depend on that identity holding still; there are only
// six possible results, so this never grows.
const merged = new Map<string, ThemeTokens>();

export function applyWeatherMood(base: ThemeTokens, weather: WeatherSnapshot | null | undefined): ThemeTokens {
  if (!weather) return base;
  const severity = classifyWeather(weather.weatherCode, weather.precipMm, weather.windKph).severity;
  const mood = resolveWeatherMood(weather.apparentTempC, severity);
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

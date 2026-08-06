import { useColorScheme } from "react-native";
import { useThemeStore } from "./useThemeStore";
import { applyWeatherMood } from "./mood";
import { useTintWeather } from "./useAmbientWeatherStore";
import { darkTheme, lightTheme, type ThemeTokens } from "./tokens";

// §9.1 — the only sanctioned way for a component to read theme colors.
// Resolves "system" against RN's useColorScheme() so components never
// branch on themePreference themselves.
//
// Since 2026-08-05 this also carries the weather mood (§9.1.3), which used
// to be the Today tab's alone: every card, form, header and tab bar in the
// app leans cool in the cold and warm on a bright day, because they all read
// their colours from here. The reading comes from useAmbientWeatherStore — a
// value `useRightNow` publishes, never a fetch — so this costs no extra API
// calls, and a screen showing somewhere else (a saved location) can take the
// mood over while it's open. See DECISIONS.md.
//
// The mood changes in one step. A cross-fade between moods was built and
// removed on 2026-08-06 — see DECISIONS.md for the measurements that killed
// it. The short version: the tokens covering large areas differ by ~11 RGB
// units between moods, which cannot read as a gradient however it is
// animated, and the token that does differ (`accentWalk`, 251) only appears
// on text and icons.

/** The palette before any weather mood — light/dark resolution only. Used by
 *  useWeatherTheme(), which layers a *specific* reading's mood on top. */
export function useBaseTheme(): ThemeTokens {
  const themePreference = useThemeStore((s) => s.themePreference);
  const systemScheme = useColorScheme();
  const resolved = themePreference === "system" ? (systemScheme ?? "dark") : themePreference;
  return resolved === "light" ? lightTheme : darkTheme;
}

export default function useTheme(): ThemeTokens {
  const base = useBaseTheme();
  return applyWeatherMood(base, useTintWeather());
}

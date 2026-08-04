import { useColorScheme } from "react-native";
import { useThemeStore } from "./useThemeStore";
import { useAmbientWeatherStore } from "./useAmbientWeatherStore";
import { applyWeatherMood } from "./mood";
import { darkTheme, lightTheme, type ThemeTokens } from "./tokens";

// §9.1 — the only sanctioned way for a component to read theme colors.
// Resolves "system" against RN's useColorScheme() so components never
// branch on themePreference themselves.
//
// Since 2026-08-05 this also carries the weather mood (§9.1.3), which used
// to be the Today tab's alone: every card, form, header and tab bar in the
// app now leans cool in the cold and warm on a bright day, because they all
// read their colours from here. The reading comes from
// useAmbientWeatherStore — a value `useRightNow` publishes, never a fetch —
// so this costs no extra API calls. See DECISIONS.md.

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
  const ambient = useAmbientWeatherStore((s) => s.weather);
  return applyWeatherMood(base, ambient);
}

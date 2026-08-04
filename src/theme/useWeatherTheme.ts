import { useBaseTheme } from "./useTheme";
import { useAmbientWeatherStore } from "./useAmbientWeatherStore";
import { applyWeatherMood } from "./mood";
import type { ThemeTokens } from "./tokens";
import type { WeatherSnapshot } from "../types";

// §9.1.3 — the mood for one *specific* reading, rather than the app-wide
// ambient one useTheme() carries. Used where a card describes weather that
// isn't necessarily here-and-now: a journey's own conditions, or a saved
// location in another suburb.
//
// Passing `undefined`/`null` falls back to the ambient mood, so a card still
// agrees with the screen around it while its own reading is loading —
// returning the bare base palette there would have made the card visibly
// disagree with everything behind it for a frame or two.
export default function useWeatherTheme(weather: WeatherSnapshot | undefined | null): ThemeTokens {
  const base = useBaseTheme();
  const ambient = useAmbientWeatherStore((s) => s.weather);
  return applyWeatherMood(base, weather ?? ambient);
}

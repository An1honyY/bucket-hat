import { create } from "zustand";
import type { WeatherSnapshot } from "../types";

// The reading the whole app tints itself from (§9.1.3).
//
// Two slots, in priority order:
//
//   - `weather` — the *ambient* reading, i.e. wherever the user actually is.
//     Deliberately a published value, not a fetch: `useRightNow` writes here
//     whenever it resolves a reading for the user's own location, and nothing
//     else ever populates it. Every screen therefore reads the mood for free —
//     no screen holds a weather subscription, and the app-wide tint adds
//     exactly zero Open-Meteo calls over what the Today tab already made.
//
//   - `override` — a reading for somewhere the user is *looking at* rather
//     than standing in, which wins while it is set. A saved location's detail
//     screen publishes its suburb's weather here on mount and clears it on
//     unmount, so the background, header and tab bar answer "what's it like
//     there?" alongside the cards. This reverses the 2026-08-05 call that a
//     pinned reading never repaints the app — see DECISIONS.md.
//
// Only one screen may hold the override at a time; it is last-writer-wins by
// design, and every writer must clear it on unmount or the app stays tinted
// for a place the user has navigated away from.
//
// Both are null until a reading lands (or forever, if the user never opens
// Today), which resolves to the plain base palette — the same thing every
// screen showed before the tint existed.
type AmbientWeatherState = {
  weather: WeatherSnapshot | null;
  override: WeatherSnapshot | null;
  setAmbientWeather: (weather: WeatherSnapshot) => void;
  setMoodOverride: (weather: WeatherSnapshot | null) => void;
};

export const useAmbientWeatherStore = create<AmbientWeatherState>((set) => ({
  weather: null,
  override: null,
  setAmbientWeather: (weather) => set({ weather }),
  setMoodOverride: (override) => set({ override }),
}));

/** The reading the app's mood should currently resolve from — the override if
 *  a screen is showing another place, otherwise the ambient reading. */
export function useTintWeather(): WeatherSnapshot | null {
  return useAmbientWeatherStore((s) => s.override ?? s.weather);
}

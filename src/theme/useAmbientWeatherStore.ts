import { create } from "zustand";
import type { WeatherSnapshot } from "../types";

// The current-location reading the whole app tints itself from (§9.1.3).
//
// Deliberately a *published* value, not a fetch: `useRightNow` writes here
// whenever it resolves a reading for the user's own location, and nothing
// else ever populates it. Every screen therefore reads the mood for free —
// no screen holds a weather subscription, and turning the tint app-wide adds
// exactly zero Open-Meteo calls over what the Today tab already made.
//
// Null until the first reading lands (or forever, if the user never opens
// Today), which resolves to the plain base palette — the same thing every
// screen showed before the tint existed.
type AmbientWeatherState = {
  weather: WeatherSnapshot | null;
  setAmbientWeather: (weather: WeatherSnapshot) => void;
};

export const useAmbientWeatherStore = create<AmbientWeatherState>((set) => ({
  weather: null,
  setAmbientWeather: (weather) => set({ weather }),
}));

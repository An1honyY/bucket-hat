import { hourlyIconKindForCode, type WeatherIconKind } from "../components/WeatherIcon";
import type { RainIntensity } from "./weather";

// Display helpers shared by the hourly outlook card and its full-outlook
// panel. They live here rather than on either component because the panel
// needs them and the card renders the panel — importing them from the card
// created a require cycle (HourlyOutlook → HourlyOutlookPanel → HourlyOutlook),
// which Metro allows but warns about precisely because it can leave one of the
// two modules holding uninitialized bindings at import time.

export function iconKindFor(reading: { weatherCode: number; isDaylight: boolean; windKph: number }): WeatherIconKind {
  return hourlyIconKindForCode(reading.weatherCode, reading.isDaylight, reading.windKph);
}

export function formatHourLabel(iso: string, hour12: boolean): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: undefined, hour12 })
    .replace(" ", "")
    .toLowerCase();
}

// Collected across only what a given surface actually renders, so its key
// explains exactly what's on screen and nothing else.
export function collectKeyEntries(
  readings: { rainIntensity: RainIntensity; weatherCode: number; isDaylight: boolean; windKph: number }[]
): { rainBuckets: Set<RainIntensity>; skyKinds: Set<WeatherIconKind> } {
  const rainBuckets = new Set<RainIntensity>();
  const skyKinds = new Set<WeatherIconKind>();
  for (const r of readings) {
    rainBuckets.add(r.rainIntensity);
    skyKinds.add(iconKindFor(r));
  }
  return { rainBuckets, skyKinds };
}

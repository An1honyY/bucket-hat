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

// Local calendar day for an instant, as a comparable YYYY-MM-DD key. Built
// from the local getFullYear/getMonth/getDate rather than slicing the ISO
// string, which would group by the UTC day and put a New Zealand evening in
// the following day's bucket.
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Today" / "Tomorrow" / weekday name, relative to `nowIso` (defaulting to
// now). Relative labels beat bare weekday names on the first two days, which
// are the ones a commute actually spans.
export function dayLabelFor(iso: string, nowIso?: string): string {
  const key = localDayKey(iso);
  const now = nowIso ? new Date(nowIso) : new Date();
  const todayKey = localDayKey(now.toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === todayKey) return "Today";
  if (key === localDayKey(tomorrow.toISOString())) return "Tomorrow";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
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

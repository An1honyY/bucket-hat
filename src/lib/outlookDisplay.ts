import { hourlyIconKindForCode, type WeatherIconKind } from "../components/WeatherIcon";
import type { RainIntensity } from "./weather";

// Display helpers shared by the hourly outlook card and its full-outlook
// panel. They live here rather than on either component because the panel
// needs them and the card renders the panel — importing them from the card
// created a require cycle (HourlyOutlook → HourlyOutlookPanel → HourlyOutlook),
// which Metro allows but warns about precisely because it can leave one of the
// two modules holding uninitialized bindings at import time.

// The glyphs that say "it is raining right now". Snow and storm are wet too
// but carry their own meaning, and neither should be swapped for a raindrop.
const RAIN_KINDS: ReadonlySet<WeatherIconKind> = new Set(["drizzle", "rain"]);

// One hour's glyph, reconciled with the amount shown beneath it.
//
// The glyph comes from the WMO code and the gauge from the millimetres, and
// the two disagree more often than you'd expect: Open-Meteo reports the
// dominant *sky* condition, so an hour can be coded "overcast" and still
// carry 0.3mm, or coded "rain showers" and carry nothing. Either way the
// column contradicted itself — a cloud above "0.2mm", or a raindrop above a
// blank line and an empty droplet.
//
// The amount wins, because it's the number the user is reading: an hour with
// measurable rain gets a wet glyph, and an hour with none doesn't, whatever
// the code said. Nothing else about the glyph changes — the sky/cloud
// distinctions, snow and storms all still come straight from the code.
export function iconKindFor(reading: {
  weatherCode: number;
  isDaylight: boolean;
  windKph: number;
  rainIntensity?: RainIntensity;
}): WeatherIconKind {
  const kind = hourlyIconKindForCode(reading.weatherCode, reading.isDaylight, reading.windKph);
  // Callers without a bucket (the Plan strip's compact rows) keep the raw
  // code-derived glyph, since there's no amount displayed to contradict.
  if (reading.rainIntensity === undefined) return kind;
  if (kind === "snow" || kind === "storm") return kind;

  if (reading.rainIntensity === "none") {
    // A raindrop over an hour with nothing to catch. Overcast is the honest
    // downgrade: the sky is still doing whatever the code said, it just
    // isn't falling on you this hour.
    return RAIN_KINDS.has(kind) ? "cloud" : kind;
  }
  if (RAIN_KINDS.has(kind)) return kind;
  return reading.rainIntensity === "low" ? "drizzle" : "rain";
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

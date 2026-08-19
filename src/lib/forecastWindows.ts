import { classifyWeather, forecastConfidence } from "./weather";
import { HIGH_WIND_KPH, HOT_C } from "./recommend";
import type { HourlyReading } from "../services/weatherService";
import type { WeatherSnapshot } from "../types";

// What a shareable card can be *about* — docs/13-extended-features.md §13.2,
// extended past "right now" (2026-08-19).
//
// The card was worth sharing and then instantly stale: "17°C, dry" is a fact
// about the minute you sent it, and the person reading it is deciding about
// this afternoon. Everything here turns the hourly strip Today already has
// into spans worth sending — the ones the app can name a reason for first
// ("Rain 2–5pm"), then the plain ones ("Tomorrow").
//
// Pure, and takes `nowMs`: the whole thing is boundary arithmetic, which is
// exactly what breaks at 11pm on a Sunday if it is only ever run at 2pm.

/** How far ahead a window may start. Past this the forecast is soft enough
 *  (§5.3) that naming an hour range is more confidence than the data has. */
const HORIZON_HOURS = 36;

/** A run has to last this long to be worth naming. A single flagged hour is
 *  usually the shoulder of something the neighbouring hours already say. */
const MIN_RUN_HOURS = 2;

/** At most this many detected runs, so the picker stays a short list and not
 *  an hour-by-hour readout of a bad day. */
const MAX_NOTABLE = 3;

/** Evening starts here — "tonight" in the sense of "after you get home". */
const EVENING_START_HOUR = 18;
/** And the daylight part of a day, for "tomorrow". */
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;

export type WindowKind = "now" | "notable" | "span";

export interface ForecastWindow {
  id: string;
  kind: WindowKind;
  /** What the picker lists: "Rain tomorrow 11am–3pm", "Tomorrow". */
  title: string;
  /** What the card leads with: the same thing without the day, because the
   *  card says which day it is in its own footer and reading "tomorrow"
   *  twice in one picture is a wasted line. */
  cardTitle: string;
  startIso: string;
  /** Exclusive — the end of the last hour in the run. */
  endIso: string;
  hours: HourlyReading[];
}

export interface WindowSummary {
  minTempC: number;
  maxTempC: number;
  /** The hour that decides what the window is: worst weather, ties to the
   *  hottest. It is also the hour the gear recommendation is made for — the
   *  window's gear has to cover its worst hour, not its average one. */
  peak: HourlyReading;
  totalPrecipMm: number;
  maxWindKph: number;
  maxUvIndex: number;
  /** Whether the window is mostly in daylight. The peak hour alone can't say:
   *  "Tonight" runs 6–11pm and peaks at its first, still-lit hour, so a card
   *  drawn from the peak's own flag put a midday sun on a night card. */
  mostlyDaylight: boolean;
}

function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

function isSameLocalDay(aIso: string, bMs: number): boolean {
  const a = new Date(aIso);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isNextLocalDay(iso: string, nowMs: number): boolean {
  const tomorrow = new Date(nowMs);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameLocalDay(iso, tomorrow.getTime());
}

/** End of the last hour in a run — a reading stamped 2pm describes 2–3pm. */
function endOfHour(iso: string): string {
  return new Date(new Date(iso).getTime() + 3_600_000).toISOString();
}

/**
 * Everything the card needs to describe a span in one glance.
 *
 * `peak` is picked by `classifyWeather().severity` first — the hour that makes
 * the window worth mentioning — and by temperature only to break a tie, which
 * is what makes a hot window's peak its hottest hour and a wet one's peak its
 * wettest.
 */
export function summarizeWindow(window: ForecastWindow): WindowSummary {
  const hours = window.hours;
  let peak = hours[0];
  let peakSeverity = -1;
  let minTempC = Infinity;
  let maxTempC = -Infinity;
  let totalPrecipMm = 0;
  let maxWindKph = 0;
  let maxUvIndex = 0;
  let daylightHours = 0;

  for (const h of hours) {
    const severity = classifyWeather(h.weatherCode, h.precipMm, h.windKph).severity;
    if (severity > peakSeverity || (severity === peakSeverity && h.tempC > peak.tempC)) {
      peak = h;
      peakSeverity = severity;
    }
    minTempC = Math.min(minTempC, h.tempC);
    maxTempC = Math.max(maxTempC, h.tempC);
    totalPrecipMm += h.precipMm;
    maxWindKph = Math.max(maxWindKph, h.windKph);
    maxUvIndex = Math.max(maxUvIndex, h.uvIndex);
    if (h.isDaylight) daylightHours++;
  }

  return {
    minTempC,
    maxTempC,
    peak,
    totalPrecipMm,
    maxWindKph,
    maxUvIndex,
    mostlyDaylight: daylightHours * 2 >= hours.length,
  };
}

/** An hour of the strip as the engine's own input shape. */
export function snapshotFromHour(hour: HourlyReading, fetchedAtIso: string): WeatherSnapshot {
  return {
    time: hour.time,
    weatherCode: hour.weatherCode,
    precipMm: hour.precipMm,
    precipProbability: hour.precipProbability,
    tempC: hour.tempC,
    apparentTempC: hour.apparentTempC,
    windKph: hour.windKph,
    windGustKph: hour.windGustKph,
    relativeHumidityPct: hour.relativeHumidityPct,
    uvIndex: hour.uvIndex,
    isDaylight: hour.isDaylight,
    // §5.3 — stamped from the lead time, so a card about tomorrow can say out
    // loud that it is a forecast rather than implying a reading.
    forecastConfidence: forecastConfidence(hour.time, fetchedAtIso),
  };
}

/** The tests a run of hours can be flagged under, worst first — the order
 *  decides which label an hour that qualifies twice ends up under. */
const NOTABLE_TESTS: { id: string; noun: string; test: (h: HourlyReading) => boolean }[] = [
  // Rain the app would actually tell you to carry something for, not a
  // forecast trace of 0.1mm.
  { id: "rain", noun: "Rain", test: (h) => h.rainIntensity === "med" || h.rainIntensity === "high" },
  // §7.15's own threshold, and §7's gust one — reused rather than restated,
  // so a window can never be named for weather the engine doesn't act on.
  { id: "hot", noun: "Hot", test: (h) => h.apparentTempC >= HOT_C },
  { id: "wind", noun: "Windy", test: (h) => h.windGustKph >= HIGH_WIND_KPH },
];

/** Contiguous runs of hours passing `test`, at least MIN_RUN_HOURS long. */
function runsOf(hours: HourlyReading[], test: (h: HourlyReading) => boolean): HourlyReading[][] {
  const runs: HourlyReading[][] = [];
  let current: HourlyReading[] = [];
  for (const h of hours) {
    if (test(h)) {
      current.push(h);
    } else {
      if (current.length >= MIN_RUN_HOURS) runs.push(current);
      current = [];
    }
  }
  if (current.length >= MIN_RUN_HOURS) runs.push(current);
  return runs;
}

/** "2–5pm", "11am–2pm", "tomorrow 8–10am" — the phrase after the noun. */
function whenPhrase(startIso: string, endIso: string, nowMs: number, hour12: boolean, withDay: boolean): string {
  const day = !withDay || isSameLocalDay(startIso, nowMs) ? "" : isNextLocalDay(startIso, nowMs) ? "tomorrow " : "";
  const from = clockParts(startIso, hour12);
  const to = clockParts(endIso, hour12);
  // "2–5pm", not "2pm–5pm": the meridiem is only worth saying twice when the
  // range crosses it ("11am–2pm"), and this is the form a person would say
  // out loud.
  const fromText = from.meridiem && from.meridiem === to.meridiem ? from.clock : `${from.clock}${from.meridiem}`;
  return `${day}${fromText}–${to.clock}${to.meridiem}`;
}

/** Deliberately terser than `formatTime`: a title wants "2pm", not "2:00 PM",
 *  and the minutes are always zero here — these are hour boundaries. */
function clockParts(iso: string, hour12: boolean): { clock: string; meridiem: string } {
  const h = new Date(iso).getHours();
  if (!hour12) return { clock: `${String(h).padStart(2, "0")}:00`, meridiem: "" };
  return { clock: String(h % 12 === 0 ? 12 : h % 12), meridiem: h < 12 ? "am" : "pm" };
}

/**
 * The spans worth offering, best first.
 *
 * Ordered by how much the app can say about *why* you would send one: a named
 * run of weather beats a calendar slice, and the earliest run beats a later
 * one. "Right now" is not in here — the caller always has it, and it is the
 * one option that needs no forecast at all.
 */
export function shareableWindows(hourly: HourlyReading[], nowMs: number, hour12: boolean): ForecastWindow[] {
  const horizonMs = nowMs + HORIZON_HOURS * 3_600_000;
  const ahead = hourly.filter((h) => {
    const ms = new Date(h.time).getTime();
    return ms + 3_600_000 > nowMs && ms <= horizonMs;
  });
  if (ahead.length === 0) return [];

  const notable: ForecastWindow[] = [];
  for (const { id, noun, test } of NOTABLE_TESTS) {
    for (const run of runsOf(ahead, test)) {
      const startIso = run[0].time;
      const endIso = endOfHour(run[run.length - 1].time);
      // One name per stretch of weather. A wet afternoon is usually a windy
      // one too, and offering "Rain 2–5pm" and "Windy 2–5pm" as separate
      // things to send is the same picture twice under the less useful label
      // — so a run that overlaps one already named is dropped. NOTABLE_TESTS
      // is ordered worst-first for exactly this: rain outranks heat outranks
      // wind, and the survivor is the reason you would send the card.
      const overlaps = notable.some((w) => startIso < w.endIso && endIso > w.startIso);
      if (overlaps) continue;
      notable.push({
        id: `${id}-${startIso}`,
        kind: "notable",
        title: `${noun} ${whenPhrase(startIso, endIso, nowMs, hour12, true)}`,
        cardTitle: `${noun} ${whenPhrase(startIso, endIso, nowMs, hour12, false)}`,
        startIso,
        endIso,
        hours: run,
      });
    }
  }
  // Earliest first, then capped: three named runs is already a busy day, and
  // a picker longer than that stops being a choice and becomes a report.
  notable.sort((a, b) => a.startIso.localeCompare(b.startIso));
  const notableCapped = notable.slice(0, MAX_NOTABLE);

  const spans: ForecastWindow[] = [];
  const spanOf = (id: string, title: string, keep: (h: HourlyReading) => boolean): void => {
    const hours = ahead.filter(keep);
    if (hours.length < MIN_RUN_HOURS) return;
    spans.push({
      id,
      kind: "span",
      title,
      // A span's name is already day-shaped ("Tomorrow", "Tonight"), so there
      // is nothing to strip for the card.
      cardTitle: title,
      startIso: hours[0].time,
      endIso: endOfHour(hours[hours.length - 1].time),
      hours,
    });
  };

  // The rest of today, up to the evening — which is a different thing to send
  // than tonight, and usually the one that answers "should I take a jacket?"
  spanOf("today", "Rest of today", (h) => isSameLocalDay(h.time, nowMs) && hourOf(h.time) < EVENING_START_HOUR);
  spanOf("tonight", "Tonight", (h) => isSameLocalDay(h.time, nowMs) && hourOf(h.time) >= EVENING_START_HOUR);
  spanOf(
    "tomorrow",
    "Tomorrow",
    (h) => isNextLocalDay(h.time, nowMs) && hourOf(h.time) >= DAY_START_HOUR && hourOf(h.time) <= DAY_END_HOUR
  );

  return [...notableCapped, ...spans];
}

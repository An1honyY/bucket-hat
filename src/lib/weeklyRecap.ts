import { classifyWeather } from "./weather";
import type { Journey } from "../types";

// Phase 13's weekly recap — docs/13-extended-features.md §13.1.
//
// A read-only aggregate over journeys the app already stored: no new external
// call, no new table, and nothing here feeds back into the recommendation
// engine. Everything below is pure and takes `nowMs`, so the whole week
// boundary/threshold story is testable without a clock or a database.

/** §13.1 — "a recap over 1–2 journeys total isn't a real pattern." */
export const MIN_JOURNEYS = 2;

/** §13.1 — nor is one over a history shorter than the pattern it claims. */
export const MIN_HISTORY_DAYS = 14;

/** How often a gear item must have been recommended before the line names it.
 *  "Your rain shell got 1 use" is a fact about last Tuesday, not about a week. */
const MIN_GEAR_USES = 2;

export interface WeekWindow {
  /** Monday 00:00 local, inclusive. */
  startIso: string;
  /** The following Monday 00:00 local, exclusive. */
  endIso: string;
}

/** Monday 00:00 local of the week containing `ms`. Monday because §13.1's
 *  window is Mon–Sun, and JS weeks start on Sunday. */
function mondayOf(ms: number): Date {
  const d = new Date(ms);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay(): 0 = Sunday, so Sunday is 6 days *after* its Monday.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/**
 * The row key a recap is filed under: the Monday of the week it is shown in.
 *
 * A plain local date rather than an ISO week number — the only thing it has
 * to do is differ from last week's, and a date is legible in the stored row.
 */
export function weekKey(nowMs: number): string {
  const monday = mondayOf(nowMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

/** The week the recap is *about*: the Mon–Sun that just finished. */
export function previousWeekWindow(nowMs: number): WeekWindow {
  const thisMonday = mondayOf(nowMs);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  return { startIso: lastMonday.toISOString(), endIso: thisMonday.toISOString() };
}

/** Whether there is enough history behind `nowMs` for a week to be a pattern
 *  rather than the only week there has ever been. */
export function hasEnoughHistory(earliestDepartIso: string | undefined, nowMs: number): boolean {
  if (!earliestDepartIso) return false;
  return nowMs - new Date(earliestDepartIso).getTime() >= MIN_HISTORY_DAYS * 86_400_000;
}

/**
 * One word for a whole journey's weather, from its first outdoor leg.
 *
 * §13.1 groups by "top-level `classifyWeather().label`", which is why the
 * three rain labels collapse to one word here: "2 rainy trips" is the point,
 * and a week split across "Light rain" and "Heavy rain" would report neither.
 * Undefined when the journey never went outside — an all-indoor trip has no
 * weather to characterise, and counting it as "dry" would be a claim about
 * the day rather than about the trip.
 */
export function weatherWord(journey: Journey): string | undefined {
  const leg = journey.legs.find((l) => l.outdoor && l.weather);
  if (!leg?.weather) return undefined;
  const { label } = classifyWeather(leg.weather.weatherCode, leg.weather.precipMm, leg.weather.windKph);
  if (label === "Stormy") return "stormy";
  if (label === "Heavy rain" || label === "Rain" || label === "Light rain") return "rainy";
  if (label === "Foggy") return "foggy";
  if (label === "Overcast") return "overcast";
  if (label === "Windy") return "windy";
  return "dry";
}

/** Ordered by how much a week of it is worth remarking on, so a tie between
 *  two words is broken towards the one the user actually noticed. */
const NOTABILITY = ["dry", "overcast", "foggy", "windy", "rainy", "stormy"];

function mostCommon<T>(values: T[], tieBreak: (a: T, b: T) => number): { value: T; count: number } | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { value: T; count: number } | undefined;
  for (const [value, count] of counts) {
    if (!best || count > best.count || (count === best.count && tieBreak(value, best.value) > 0)) {
      best = { value, count };
    }
  }
  return best;
}

/**
 * Every gear item a journey's frozen snapshot named, once each — a journey
 * that recommended the same jacket as a layer and as a spare is still one
 * outing for that jacket.
 *
 * Ordered outermost layer first, then umbrella, shoes, accessories: the same
 * priority §9.4's compact card uses to pick the one thing worth naming, and
 * what breaks a tie between two items worn the same number of times. Layers
 * are stored base-first, hence the reverse.
 */
function gearNames(journey: Journey): string[] {
  const snapshot = journey.recommendationSnapshot;
  if (!snapshot) return [];
  const named = [
    ...[...snapshot.layerNames].reverse(),
    snapshot.umbrellaName,
    snapshot.shoeName,
    ...snapshot.accessoryNames,
  ];
  return [...new Set(named.filter((n): n is string => !!n))];
}

/**
 * §13.1's one line, or null when the week has nothing to say.
 *
 * Null rather than a thinner line on purpose: the card is absent on a quiet
 * week rather than present and boring, which is also what keeps it worth
 * reading on the weeks it does appear.
 */
export function buildRecapLine(journeys: Journey[]): string | null {
  if (journeys.length < MIN_JOURNEYS) return null;

  const words = journeys.map(weatherWord).filter((w): w is string => w !== undefined);
  const weather = mostCommon(words, (a, b) => NOTABILITY.indexOf(a) - NOTABILITY.indexOf(b));
  // No tie-break of its own: `gearNames` already yields the items in the order
  // that decides it, and `mostCommon` keeps the incumbent.
  const gear = mostCommon(journeys.flatMap(gearNames), () => 0);

  const trips = weather
    ? `${weather.count} ${weather.value} ${weather.count === 1 ? "trip" : "trips"}`
    : `${journeys.length} ${journeys.length === 1 ? "trip" : "trips"}`;
  // The gear clause is dropped rather than padded: an item worn once says
  // less than the sentence it would cost.
  if (!gear || gear.count < MIN_GEAR_USES) return `Your week: ${trips}.`;
  return `Your week: ${trips}, your ${gear.value} got ${gear.count} uses.`;
}

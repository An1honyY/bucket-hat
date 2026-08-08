// What to tell the user *while* a journey is running (Phase 22) — the part
// no general-purpose maps app can do, because it needs both where you are
// on the route and what the weather does further along it.
//
// Pure and unit-tested, same reasoning as journeyProgress.ts. Everything
// here is derived from leg fields the app already stamps at plan time
// (docs/03 §3.4, docs/05 §5.5), so nothing here re-fetches or re-computes a
// forecast.
//
// A deliberate limit worth stating: `Recommendation` (src/lib/recommend.ts)
// is journey-*wide*, not per-leg — there is no per-leg recommendation to
// sequence, and re-running the engine once per leg would be a different
// feature with its own design questions (which calibration applies, whether
// a leg's pick can contradict the journey's). So the gear alerts below key
// off leg fields directly, and say only what those fields actually support.
import { distanceMeters, type LatLng } from "./annotations";
import { classifyWeather } from "./weather";
import { WARM_OUTDOOR_C } from "./recommend";
import type { EnvironmentAnnotation, JourneyLeg } from "../types";
import type { JourneyProgress } from "./journeyProgress";
import { formatDuration } from "./formatDuration";

// ---- Named thresholds — tune these, don't touch control flow below ----

// Far enough ahead to act on, near enough to be about now. Beyond this the
// alert is just the journey plan restated, which the leg list already does.
export const ALERT_HORIZON_MIN = 25;
// A severity step this size or larger is a real change in conditions rather
// than the forecast wobbling between "dry" and "overcast".
export const SEVERITY_STEP = 2;
// Matches recommend.ts's own wind threshold so the two never disagree about
// what counts as windy.
export const WINDY_KPH = 30;

export type JourneyAlertKind = "weather" | "gear" | "annotation";

export interface JourneyAlert {
  /** Stable across recomputes, so a surfaced alert doesn't flicker or re-fire. */
  id: string;
  kind: JourneyAlertKind;
  message: string;
  /** Lower sorts first. */
  priority: number;
  legId?: string;
}

/**
 * Minutes until a given leg begins, measured from where the user actually
 * is rather than from the clock — the whole point of doing this live.
 */
function minutesUntilLeg(legs: JourneyLeg[], progress: JourneyProgress, targetIndex: number): number {
  if (targetIndex <= progress.currentLegIndex) return 0;
  const currentRemaining = legs[progress.currentLegIndex]
    ? legs[progress.currentLegIndex].durationMin * (1 - progress.currentLegFraction)
    : 0;
  const between = legs
    .slice(progress.currentLegIndex + 1, targetIndex)
    .reduce((sum, leg) => sum + leg.durationMin, 0);
  return currentRemaining + between;
}

function inMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded <= 1) return "now";
  // "in 373 min" is not a lead time anyone can act on — an overnight journey
  // waiting for the first morning service produces exactly that.
  return `in ${formatDuration(rounded)}`;
}

/**
 * The next real change in conditions on the route *ahead* — "rain in 6 min,
 * on the Queen St leg" rather than a restatement of today's forecast.
 *
 * Only worsening conditions qualify. An improvement needs no action and
 * saying so would be noise on a screen the user is glancing at while
 * walking.
 */
export function weatherAheadAlerts(legs: JourneyLeg[], progress: JourneyProgress): JourneyAlert[] {
  const current = legs[progress.currentLegIndex];
  const currentSeverity =
    current?.outdoor && current.weather
      ? classifyWeather(current.weather.weatherCode, current.weather.precipMm, current.weather.windKph).severity
      : 0;

  for (let i = progress.currentLegIndex + 1; i < legs.length; i++) {
    const leg = legs[i];
    if (!leg.outdoor || !leg.weather) continue;

    const minutes = minutesUntilLeg(legs, progress, i);
    if (minutes > ALERT_HORIZON_MIN) break;

    const condition = classifyWeather(leg.weather.weatherCode, leg.weather.precipMm, leg.weather.windKph);
    if (condition.severity - currentSeverity < SEVERITY_STEP) continue;

    return [
      {
        id: `weather-${leg.id}`,
        kind: "weather",
        // Lowercased because it lands mid-sentence; classifyWeather's
        // labels are written as standalone badge text.
        message: `${condition.label.toLowerCase()} ${inMinutes(minutes)}, on the ${legShortLabel(leg)} leg`,
        priority: 0,
        legId: leg.id,
      },
    ];
  }
  return [];
}

/**
 * When to actually do something about the gear you were told to bring.
 *
 * Each of these keys off a leg field that already exists, and says only
 * what that field supports — no inference about which specific item, since
 * the engine's picks aren't resolved per leg.
 */
export function gearTimingAlerts(legs: JourneyLeg[], progress: JourneyProgress): JourneyAlert[] {
  const alerts: JourneyAlert[] = [];

  for (let i = progress.currentLegIndex + 1; i < legs.length; i++) {
    const leg = legs[i];
    const minutes = minutesUntilLeg(legs, progress, i);
    if (minutes > ALERT_HORIZON_MIN) break;
    const when = inMinutes(minutes);

    // Rain you're about to walk into, with nothing overhead.
    if (leg.outdoor && !leg.rainCovered && (leg.weather?.precipMm ?? 0) > 0) {
      alerts.push({
        id: `gear-umbrella-${leg.id}`,
        kind: "gear",
        message: `Umbrella out ${when} — rain on the ${legShortLabel(leg)} leg`,
        priority: 1,
        legId: leg.id,
      });
    }

    // The AC-contrast case §6 already reasons about at plan time, surfaced
    // at the moment it's actionable: don't shed the layer you're about to
    // want. Gated on it being warm enough outside that you plausibly would
    // have — WARM_OUTDOOR_C is the engine's own threshold for that, reused
    // rather than re-picked so the two can't disagree.
    if (!leg.outdoor && leg.climate === "ac") {
      const outdoorTemp = legs[progress.currentLegIndex]?.weather?.apparentTempC;
      if (outdoorTemp === undefined || outdoorTemp >= WARM_OUTDOOR_C) {
        alerts.push({
          id: `gear-ac-${leg.id}`,
          kind: "gear",
          message: `${legShortLabel(leg)} is air-conditioned ${when} — keep a layer on`,
          priority: 2,
          legId: leg.id,
        });
      }
    }

    // A stretch you've marked as a wind tunnel, or one the forecast says is
    // windy on its own.
    if (leg.outdoor && (leg.windEffect === "amplified" || (leg.weather?.windKph ?? 0) > WINDY_KPH)) {
      alerts.push({
        id: `gear-wind-${leg.id}`,
        kind: "gear",
        message: `Windy stretch ${when} on the ${legShortLabel(leg)} leg`,
        priority: 3,
        legId: leg.id,
      });
    }
  }

  // The covered-walkway case is the one alert about the leg you're already
  // on: it's an instruction to put something *away*, which only makes sense
  // once you're under cover.
  const current = legs[progress.currentLegIndex];
  if (current?.rainCovered && (current.weather?.precipMm ?? 0) > 0) {
    alerts.push({
      id: `gear-covered-${current.id}`,
      kind: "gear",
      message: "Covered along here — umbrella down",
      priority: 4,
      legId: current.id,
    });
  }

  return alerts;
}

/**
 * Saved local-knowledge spots the user has just walked into.
 *
 * Point-radius, the same check annotations.ts already uses to match
 * annotations to legs at plan time — so a spot that fires here is exactly a
 * spot the leg list already credits.
 */
export function annotationAlerts(
  fix: LatLng,
  annotations: EnvironmentAnnotation[],
  alreadyFired: ReadonlySet<string>
): JourneyAlert[] {
  return annotations
    .filter((a) => !alreadyFired.has(a.id) && distanceMeters(fix, { lat: a.lat, lng: a.lng }) <= a.radiusM)
    .map((a) => ({
      id: `annotation-${a.id}`,
      kind: "annotation" as const,
      message: `${a.label} — ${ANNOTATION_ADVICE[a.effect]}`,
      priority: 5,
    }));
}

// One short piece of advice per effect, in the §9.0.1 register: what to do,
// not what the weather is.
const ANNOTATION_ADVICE: Record<EnvironmentAnnotation["effect"], string> = {
  "wind-tunnel": "it gets windy through here",
  "wind-sheltered": "sheltered along here",
  "sun-exposed": "no shade along here",
  shaded: "shaded along here",
  "high-reflection": "bright glare off the buildings here",
  "rain-cover": "you're covered along here",
};

/**
 * The single alert worth showing right now, or null.
 *
 * One at a time by design: this sits under the map on a screen someone is
 * glancing at mid-stride, and a stack of chips there is a stack nobody
 * reads. Weather changes outrank gear timing, which outranks the ambient
 * local-knowledge notes.
 */
export function topAlert(alerts: JourneyAlert[]): JourneyAlert | null {
  return [...alerts].sort((a, b) => a.priority - b.priority)[0] ?? null;
}

// Leg labels are full sentences ("Walk to Kingsland Station") and read
// badly inside another one. The destination half is the part that locates
// it for the user.
function legShortLabel(leg: JourneyLeg): string {
  const match = /\b(?:to|at|for)\s+(.+)$/i.exec(leg.label);
  const tail = match ? match[1] : leg.label;
  // Every caller reads "on the <this> leg", so a label that already starts
  // with an article stutters: "Waiting for the 15" became "on the the 15
  // leg". The article belongs to the sentence, not to the fragment.
  return tail.replace(/^(?:the|a|an)\s+/i, "");
}

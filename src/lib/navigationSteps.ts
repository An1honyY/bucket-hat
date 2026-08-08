import type { NavigationStep } from "../types";

// Making a routed leg's turn list readable — §9.3.
//
// Google returns a step per geometric change, not per decision. A ten-minute
// walk across town comes back as fifteen or twenty of them, and most carry no
// instruction a person needs: a 6m jog across a driveway, a "continue" where
// the road simply changes name. Rendered verbatim under every leg, the
// directions list buried the journey it was describing.
//
// Two things fix that, and they're separate on purpose: this module makes the
// list shorter *without losing distance*, and StepList collapses what's left
// behind a disclosure. Neither drops a turn you'd miss.

/**
 * Below this, a step is not a decision — it's geometry. Their distance is
 * folded into the step that follows, so the running total a reader adds up
 * still matches the leg.
 */
export const NEGLIGIBLE_STEP_M = 25;

/** Google maneuvers that carry no instruction beyond "keep going". */
const NON_DECISION_MANEUVERS = new Set(["STRAIGHT", "NAME_CHANGE", "DEPART", "CONTINUE"]);

function isNegligible(step: NavigationStep): boolean {
  if (step.distanceM >= NEGLIGIBLE_STEP_M) return false;
  // A short step at a real junction still has to be shown — "turn left in
  // 15m" is exactly the kind of instruction that's easy to miss and
  // expensive to get wrong. Only the non-decisions are absorbed.
  return step.maneuver === undefined || NON_DECISION_MANEUVERS.has(step.maneuver);
}

/**
 * Folds negligible steps into the one that follows them, preserving total
 * distance and duration.
 *
 * The last step is never folded away — it's the one that says you've arrived,
 * and there is nothing after it to fold into.
 */
export function condenseSteps(steps: readonly NavigationStep[]): NavigationStep[] {
  if (steps.length <= 1) return [...steps];

  const result: NavigationStep[] = [];
  let carriedDistanceM = 0;
  let carriedDurationMin = 0;

  steps.forEach((step, i) => {
    const isLast = i === steps.length - 1;
    if (!isLast && isNegligible(step)) {
      carriedDistanceM += step.distanceM;
      carriedDurationMin += step.durationMin;
      return;
    }
    result.push({
      ...step,
      distanceM: step.distanceM + carriedDistanceM,
      durationMin: step.durationMin + carriedDurationMin,
    });
    carriedDistanceM = 0;
    carriedDurationMin = 0;
  });

  return result;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a step's instruction says nothing the leg's own label didn't.
 *
 * Google's transit responses give each WALK step a single coarse instruction
 * — "Walk to Britomart Train Station" — and `parseTransitSteps` names the leg
 * from the very same stop, so rendering both puts the identical sentence on
 * two consecutive lines. Only the turn-and-street-name instructions are worth
 * a row of their own; this is what tells them apart.
 */
export function stepRepeatsLabel(instruction: string, legLabel: string): boolean {
  const step = normalize(instruction);
  const label = normalize(legLabel);
  if (step.length === 0) return true;
  return step === label || label.includes(step) || step.includes(label);
}

/** Total ground distance across a step list, in metres. */
export function totalStepDistanceM(steps: readonly NavigationStep[]): number {
  return steps.reduce((sum, step) => sum + Math.max(0, step.distanceM), 0);
}

/** "450 m" / "1.2 km" — one shared formatter, used by the rows and by the
 *  collapsed summary above them. */
export function formatDistance(distanceM: number): string {
  if (distanceM <= 0) return "";
  if (distanceM < 1000) return `${Math.round(distanceM / 10) * 10} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

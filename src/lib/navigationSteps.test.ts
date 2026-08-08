import { condenseSteps, formatDistance, NEGLIGIBLE_STEP_M, stepRepeatsLabel, totalStepDistanceM } from "./navigationSteps";
import type { NavigationStep } from "../types";

function step(partial: Partial<NavigationStep>): NavigationStep {
  return { instruction: "Head north", distanceM: 200, durationMin: 3, polyline: "", ...partial };
}

describe("condenseSteps", () => {
  it("folds a geometry-only step into the one after it, keeping the distance", () => {
    const steps = [
      step({ instruction: "Head north", maneuver: "DEPART", distanceM: 8, durationMin: 1 }),
      step({ instruction: "Turn left onto Queen St", maneuver: "TURN_LEFT", distanceM: 400, durationMin: 5 }),
    ];
    const condensed = condenseSteps(steps);
    expect(condensed).toHaveLength(1);
    expect(condensed[0].instruction).toBe("Turn left onto Queen St");
    expect(condensed[0].distanceM).toBe(408);
    expect(condensed[0].durationMin).toBe(6);
  });

  // The whole point of folding rather than dropping: a reader adding up the
  // rows must still arrive at the leg's real distance.
  it("preserves total distance and duration", () => {
    const steps = [
      step({ maneuver: "DEPART", distanceM: 10, durationMin: 1 }),
      step({ maneuver: "NAME_CHANGE", distanceM: 15, durationMin: 1 }),
      step({ maneuver: "TURN_RIGHT", distanceM: 300, durationMin: 4 }),
      step({ maneuver: "STRAIGHT", distanceM: 5, durationMin: 1 }),
      step({ maneuver: "TURN_LEFT", distanceM: 120, durationMin: 2 }),
    ];
    const condensed = condenseSteps(steps);
    expect(totalStepDistanceM(condensed)).toBe(totalStepDistanceM(steps));
    expect(condensed.reduce((s, x) => s + x.durationMin, 0)).toBe(9);
    expect(condensed.length).toBeLessThan(steps.length);
  });

  it("keeps a short step at a real junction — that's the one you'd miss", () => {
    const steps = [
      step({ instruction: "Turn left onto the lane", maneuver: "TURN_LEFT", distanceM: 12 }),
      step({ instruction: "Continue on Ponsonby Rd", maneuver: "STRAIGHT", distanceM: 500 }),
    ];
    expect(condenseSteps(steps).map((s) => s.instruction)).toEqual([
      "Turn left onto the lane",
      "Continue on Ponsonby Rd",
    ]);
  });

  it("never folds away the last step — it's the one that says you've arrived", () => {
    const steps = [
      step({ instruction: "Walk down Queen St", maneuver: "STRAIGHT", distanceM: 600 }),
      step({ instruction: "Destination on your right", maneuver: "STRAIGHT", distanceM: 5 }),
    ];
    expect(condenseSteps(steps)).toHaveLength(2);
  });

  it("keeps steps at or above the negligible threshold", () => {
    const steps = [
      step({ maneuver: "STRAIGHT", distanceM: NEGLIGIBLE_STEP_M }),
      step({ maneuver: "TURN_LEFT", distanceM: 100 }),
    ];
    expect(condenseSteps(steps)).toHaveLength(2);
  });

  it("passes through empty and single-step lists untouched", () => {
    expect(condenseSteps([])).toEqual([]);
    const one = [step({ maneuver: "DEPART", distanceM: 3 })];
    expect(condenseSteps(one)).toEqual(one);
  });
});

describe("formatDistance", () => {
  it("rounds metres to the nearest ten and switches to km past 1000", () => {
    expect(formatDistance(444)).toBe("440 m");
    expect(formatDistance(1250)).toBe("1.3 km");
  });

  it("says nothing about a zero-length step", () => {
    expect(formatDistance(0)).toBe("");
  });
});

describe("stepRepeatsLabel", () => {
  // The case this exists for: Google gives a transit WALK step one coarse
  // instruction, and parseTransitSteps names the leg from the same stop, so
  // rendering both prints the identical sentence twice in a row.
  it("catches a walk step that just restates its leg", () => {
    expect(stepRepeatsLabel("Walk to Britomart", "Walk to Britomart")).toBe(true);
    expect(stepRepeatsLabel("Walk to Britomart", "Walk to Britomart Train Station")).toBe(true);
  });

  it("ignores punctuation and casing", () => {
    expect(stepRepeatsLabel("walk to britomart.", "Walk to Britomart")).toBe(true);
  });

  it("keeps a real turn instruction", () => {
    expect(stepRepeatsLabel("Turn left onto Queen St", "Walk to Britomart")).toBe(false);
    expect(stepRepeatsLabel("Continue onto Customs Street East", "Walk to Britomart")).toBe(false);
  });

  it("treats an empty instruction as nothing worth a row", () => {
    expect(stepRepeatsLabel("   ", "Walk to Britomart")).toBe(true);
  });
});

import type { JourneyLeg, TravelMode } from "../types";

// A journey's dominant mode, not just its first leg — a bus/train trip's
// first leg is usually a short walk-to-stop connector (mockJourney/
// planJourney insert these around the transit leg itself), which
// shouldn't be read as "this is a walking trip." Shared by Journey
// Detail's map accent and Today's recurring-journey materialization
// (needs a mode to re-plan with, since Journey itself has no top-level
// mode field — it's implied by its legs).
const MODE_PRIORITY: TravelMode[] = ["bus", "train", "drive", "cycle", "walk"];

export function dominantMode(legs: JourneyLeg[]): TravelMode {
  return MODE_PRIORITY.find((mode) => legs.some((l) => l.mode === mode)) ?? "walk";
}

// How you actually leave — the first leg you travel under your own steam or
// otherwise, ignoring indoor dwell legs and stationary waits.
//
// Distinct from dominantMode() on purpose, and not a replacement for it: "what
// kind of trip is this" (dominant) and "what am I doing at the start of it"
// (departure) are different questions, and the origin marker asks the second
// one. A bus commute that begins with a six-minute walk to the stop was
// showing a bus glyph over the point where you are standing on the footpath.
export function departureMode(legs: JourneyLeg[]): TravelMode {
  // `JourneyLeg.mode` includes "indoor", which isn't a travel mode — checking
  // it against the priority list narrows the type and skips dwell legs in one
  // step, rather than trusting `outdoor` to imply both.
  const first = legs.find(
    (leg): leg is JourneyLeg & { mode: TravelMode } =>
      !leg.isStationary && (MODE_PRIORITY as string[]).includes(leg.mode)
  );
  return first?.mode ?? dominantMode(legs);
}

// Phase 21's mascot state selector — docs/13-extended-features.md §13.9.
//
// Lives here rather than in recommend.ts because it is presentational
// mapping, not recommendation logic (§13.9 is explicit about the split): it
// reads conclusions the engine has already reached and decides which face to
// put on them. Nothing here may influence what gets recommended, and nothing
// here derives a new threshold — every trigger below is one of the engine's
// own named constants, read through `Recommendation.signals`.
import { BOTTOMS_COLD_WARMTH_LEVEL, type Recommendation } from "./recommend";

/**
 * The exclusive, pose-driving state. `shivering` (below) is the one modifier
 * that composes on top of it.
 */
export type MascotStateName = "idle" | "umbrellaHuddle" | "windBlown" | "sunSquint" | "fanning";

export interface MascotState {
  primary: MascotStateName;
  /**
   * §13.9's shiver. Modelled as a flag rather than as a sixth `primary`
   * because shiver and wind-blown are the one pair the spec says *compose* —
   * they are physically compatible poses — so the type has to be able to hold
   * both at once. `{ primary: "idle", shivering: true }` is the plain shiver.
   */
  shivering: boolean;
}

/** An umbrella the user actually owns, as opposed to a `fallbackText` stand-in. */
function isRealItem(pick: Recommendation["umbrella"]): boolean {
  return !!pick && "id" in pick;
}

/**
 * Map an already-computed `Recommendation` onto §13.9's state table.
 *
 * Pure, and deliberately takes the whole `Recommendation` rather than a
 * journey: the Journey Detail instance has to reflect *that journey's*
 * recommendation rather than the weather right now (§13.9), and passing the
 * thing it is illustrating is what makes that impossible to get wrong.
 *
 * The wave is not here. It fires on focus/mount, which is a fact about the
 * screen rather than about the weather, so it belongs to the component.
 */
export function mascotStateFor(recommendation: Recommendation): MascotState {
  const { warmthLevel, highUv, windAmplified, isHot } = recommendation.signals;

  // §7.13's genuine-cold-snap threshold, reused rather than restated.
  const shivering = warmthLevel >= BOTTOMS_COLD_WARMTH_LEVEL;

  // "Worst case wins, don't stack", the same instinct as `notes[]` ordering
  // in §7. Ordered by how much weather it takes to reach the state: rain hard
  // enough to resolve an umbrella (severity >= 2) outranks a flagged wind
  // tunnel, which outranks high UV, which outranks plain heat. Heat sits last
  // because it is the state with the least for the user to do about it — the
  // three above all correspond to something the card is telling them to carry.
  let primary: MascotStateName = "idle";
  if (isRealItem(recommendation.umbrella)) primary = "umbrellaHuddle";
  else if (windAmplified) primary = "windBlown";
  else if (highUv) primary = "sunSquint";
  // Guarded on `!shivering` as well as `isHot`. §13.9 argues the two can't
  // both hold, since `warmthLevel` is driven by the coldest leg and `isHot`
  // by the hottest — but that is an argument about Auckland, not a property
  // of the types, and a journey with a 1°C leg and a 25°C leg would otherwise
  // produce a penguin fanning itself while it shivers. Cold wins: it is the
  // one of the two the engine adds gear for.
  else if (isHot && !shivering) primary = "fanning";

  return { primary, shivering };
}

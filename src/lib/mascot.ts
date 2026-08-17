// Phase 21's mascot state selector — docs/13-extended-features.md §13.9.
//
// Lives here rather than in recommend.ts because it is presentational
// mapping, not recommendation logic (§13.9 is explicit about the split): it
// reads conclusions the engine has already reached and decides which face to
// put on them. Nothing here may influence what gets recommended, and nothing
// here derives a new threshold — every trigger below is one of the engine's
// own named constants, read through `Recommendation.signals`.
import { BOTTOMS_COLD_WARMTH_LEVEL } from "./recommend";
import type { RecommendationSignals } from "../types";
import { mascotSwatchHex } from "../theme/mascotSwatches";
import type { MascotGarmentFills } from "../components/mascot/MascotBase";

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

/**
 * Whether the jacket overlay is dressed onto the character.
 *
 * **Off**, and deliberately: Antony's call after seeing it in the app — the
 * shape isn't good enough to ship, and an orange coat under an orange umbrella
 * also read as one colour blob rather than two garments. He is better bare
 * than in it.
 *
 * Nothing was deleted to do this. `JACKET` and its sleeve are still in
 * `garments.ts`, `MascotBase` still draws the slot when it's filled, and the
 * hard-won reasoning about why it is one path is still in both. Turning it
 * back on is this one line. Typed `boolean` rather than left as the literal so
 * the branch below doesn't narrow to dead code.
 *
 * See `DECISIONS.md` 2026-08-17 and the README's paper-doll section.
 */
export const JACKET_OVERLAY_ENABLED: boolean = false;

/**
 * Resolve §13.9's clothing slots to the fills the component draws.
 *
 * The absent/null distinction from `RecommendationGarments` survives exactly
 * one more step and dies here: an absent slot stays absent, and a null one —
 * a garment that was recommended but has no `color` — becomes the neutral
 * grey. That is §13.9's graceful fallback, and it is required rather than
 * optional: `color` is a Phase 21 field, so the overwhelming majority of
 * existing wardrobes have none of it, and omitting the overlay instead would
 * leave the mascot undressed for almost everybody.
 */
export function mascotGarmentFills(signals: RecommendationSignals): MascotGarmentFills {
  const { garments } = signals;
  if (!garments) return {};
  const fills: MascotGarmentFills = {};
  if (JACKET_OVERLAY_ENABLED && "jacket" in garments) fills.jacket = mascotSwatchHex(garments.jacket ?? undefined);
  // Independent of the huddle *state*, per §13.9's "shown whenever those
  // fields are set". The two can differ: a journey that needs an umbrella the
  // user doesn't own sets this slot (in the neutral fill) while `hasUmbrella`
  // stays false, so he carries one without hunching under it. That is the
  // honest reading — it is raining either way.
  if ("umbrella" in garments) fills.umbrella = mascotSwatchHex(garments.umbrella ?? undefined);
  return fills;
}

/**
 * What to show before there is a `Recommendation` to read — a cold start, or
 * a weather fetch that failed. §9.7 is explicit that the mascot never gets a
 * loading state of its own, so he stands there idling rather than being
 * withheld until the data lands.
 */
export const MASCOT_IDLE: MascotState = { primary: "idle", shivering: false };

/**
 * Map the engine's own conclusions onto §13.9's state table.
 *
 * Pure, and takes `RecommendationSignals` rather than a whole
 * `Recommendation` or a journey. That is what lets a *frozen*
 * `RecommendationSnapshot` drive the same states as a live recommendation —
 * it stores this same block — so a journey whose leave-by has passed still
 * shows the companion it was frozen with instead of losing it. A "leave now"
 * journey freezes the moment you open it, so that is not an edge case; it is
 * the most common Journey Detail view there is.
 *
 * The wave is not here. It fires on focus/mount, which is a fact about the
 * screen rather than about the weather, so it belongs to the component.
 */
export function mascotStateFor(signals: RecommendationSignals): MascotState {
  const { warmthLevel, highUv, windAmplified, isHot, hasUmbrella } = signals;

  // §7.13's genuine-cold-snap threshold, reused rather than restated.
  const shivering = warmthLevel >= BOTTOMS_COLD_WARMTH_LEVEL;

  // "Worst case wins, don't stack", the same instinct as `notes[]` ordering
  // in §7. Ordered by how much weather it takes to reach the state: rain hard
  // enough to resolve an umbrella (severity >= 2) outranks a flagged wind
  // tunnel, which outranks high UV, which outranks plain heat. Heat sits last
  // because it is the state with the least for the user to do about it — the
  // three above all correspond to something the card is telling them to carry.
  let primary: MascotStateName = "idle";
  if (hasUmbrella) primary = "umbrellaHuddle";
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

// The shape of one hop, in milliseconds — shared by the animation that plays
// it (PerchedMascot) and the layout that has to wait for it
// (useMascotPerches).
//
// It lives in its own module because those two need the same numbers and
// PerchedMascot already imports from useMascotPerches; putting the timings in
// either one would make the pair circular, and putting a copy in both is how
// the cards drift back out of step with his feet.

/** Gather before the launch. */
export const CROUCH_MS = 150;
/** Time in the air. */
export const TRAVEL_MS = 400;
/** Absorbing the landing, then standing back up. */
export const LAND_MS = 90;
export const RECOVER_MS = 150;

/**
 * From asking for a hop to his feet touching down.
 *
 * This is the beat the cards move on. He is weight, so the stack reacting
 * before he arrives reads as the cards moving *themselves* and him chasing
 * them — which is exactly what it looked like when the layout changed at the
 * moment the perch was chosen, half a second early.
 */
export const HOP_LANDING_MS = CROUCH_MS + TRAVEL_MS;

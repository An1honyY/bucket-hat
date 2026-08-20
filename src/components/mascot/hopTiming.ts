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
/** Compressing over his feet as he arrives. Slow enough to have mass — at 90
 *  the impact was over before the eye caught it. */
export const LAND_MS = 150;
/** Held at the bottom of that compression: his weight is fully on the card and
 *  the card has not given yet. See `CARD_SINK_MS`. */
export const SINK_HOLD_MS = 90;
/** Rising back out of the compression, on the way down with the card. */
export const RECOVER_MS = 220;

/**
 * From asking for a hop to his feet touching down.
 *
 * He is weight, so the stack reacting *before* he arrives reads as the cards
 * moving themselves and him chasing them — which is exactly what it looked
 * like when the layout changed at the moment the perch was chosen, half a
 * second early.
 */
export const HOP_LANDING_MS = CROUCH_MS + TRAVEL_MS;

/**
 * From asking for a hop to the cards giving way under him.
 *
 * Not the same instant as the landing, and that gap is the whole effect.
 * Moving the stack on the touchdown frame is accurate but reads as a cut: the
 * card is simply somewhere else the moment he touches it, with nothing to say
 * the two are connected. Letting him compress first and holding him at the
 * bottom of it gives the card something to resist, so when it does move it
 * reads as giving way rather than as a jump.
 *
 * The card therefore moves as he starts to rise, and he rides it down —
 * `RECOVER_MS` runs from this instant, not from the landing.
 */
export const CARD_SINK_MS = HOP_LANDING_MS + LAND_MS + SINK_HOLD_MS;

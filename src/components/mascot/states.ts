import type { MascotPose } from "./MascotBase";
import type { MascotStateName } from "../../lib/mascot";

// How each §13.9 state actually moves. Split from `mascotStateFor()` on
// purpose: that decides *which* state, this decides what it looks like, and
// only this half changes when the art does.
//
// The motion is split across two mechanisms, which is the one structural
// decision in this file worth explaining.
//
// - **Whole-body motion** (the weight-shift rock, any held lean, the shiver
//   jitter) runs on Reanimated, on a wrapping view. It is continuous, wants
//   60fps, and touches nothing inside the SVG.
// - **Limbs and face** (flipper angles, foot lifts, eyes, mouth) run as
//   *keyframes* — held poses with explicit durations, swapped from JS.
//
// The alternative was to thread Reanimated shared values into MascotBase and
// animate the flipper `rotation` prop directly. That was rejected twice over:
// it would make MascotBase's "every pose is a number passed in" purity
// conditional (the property the README leans on hardest), and animated props
// on react-native-svg are the least-supported corner of both libraries on
// react-native-web, which is the surface this component has actually been
// verified on. Keyframed limbs cost a handful of shallow re-renders per
// second — and a tap, a flap or a blink *is* a keyframe animation; nothing
// here wants a smooth interpolation of an elbow.
//
// A state is a list of **beats**. One beat means that beat on a loop, which
// is what the weather states want. Several means idle: they are drawn from a
// shuffled bag, so he alternates between rocking, tapping a foot, flapping
// and blinking without settling into a visible cycle — and several of the
// beats are pure rest, because a living thing is still most of the time.

/** One held pose and how long it holds. */
export interface MascotFrame {
  pose: MascotPose;
  ms: number;
}

export interface BodyMotion {
  /**
   * Weight shift: how far the character rocks either side of the state's
   * lean, in degrees. Mascot.tsx pivots this about whichever foot the lean
   * puts the weight on, so the planted foot stays put and the other lifts.
   *
   * This replaced a vertical bob. A bob moves both feet off the ground
   * together, which on a bird standing on the ground reads as hovering — and
   * the sway it sat alongside rotated about the point *between* the feet,
   * which drives the far foot through the floor. One rock does the job of
   * both and is the motion a real penguin actually makes.
   */
  rockDeg?: number;
  /** Time to travel from one extreme to the other, ms. */
  periodMs?: number;
  /**
   * There-and-back cycles to run, each `2 × periodMs`. Omitted means forever,
   * which also picks a different shape: a finite rock starts and ends
   * upright, so the next beat can begin from rest, while an endless one just
   * swings between the extremes.
   */
  cycles?: number;
}

/** One unit of behaviour: a run of frames, and what the body does under them. */
export interface MascotBeat {
  /** Played once, in order. A frame of `Infinity` holds the beat forever. */
  frames: MascotFrame[];
  /** Omitted means stand still — which is the point of the rest beats. */
  body?: BodyMotion;
}

export interface MascotAnimation {
  /** Held lean for the state as a whole, degrees clockwise. Beats rock either side of it. */
  leanDeg?: number;
  beats: MascotBeat[];
  /**
   * Held instead of the beats when reduce motion is on. §9.7 is specific that
   * this is the state's *final* pose held still, not the neutral one — a
   * reduce-motion user should still see the mascot squinting into the sun.
   */
  reduced: MascotPose;
}

/**
 * Standing still — but blinking once partway through, which is the whole
 * difference between resting and frozen.
 *
 * Blinks live *inside* the rests rather than as beats of their own because
 * the bag can legitimately deal every rest in a row: measured on screen, that
 * produced an eleven-second stretch with nothing moving at all, which reads
 * as a hung render rather than as a calm animal. Splitting each rest around a
 * blink caps the worst case at the tail of one rest plus the head of the next
 * — 3.3s measured over a 48s run, against a 3.6s theoretical worst.
 */
function rest(ms: number): MascotBeat {
  const half = Math.max(0, Math.round((ms - BLINK_MS) / 2));
  return { frames: [{ pose: {}, ms: half }, ...BLINK, { pose: {}, ms: half }] };
}

/**
 * A finite weight shift, with the frame held exactly as long as the rock
 * takes. Deriving the two from one call is what stops the beat ending
 * mid-swing and snapping the character upright.
 */
function rockBeat(rockDeg: number, periodMs: number, cycles: number): MascotBeat {
  return { frames: [{ pose: {}, ms: 2 * periodMs * cycles }], body: { rockDeg, periodMs, cycles } };
}

/** A beat that holds one pose while the body rocks endlessly under it. */
function held(pose: MascotPose, body: BodyMotion): MascotBeat {
  return { frames: [{ pose, ms: Number.POSITIVE_INFINITY }], body };
}

/** Two closures 180ms apart. One at this size reads as a glitch rather than a
 *  blink, and `happy` is the only fully closed eye the art has. */
const BLINK: MascotFrame[] = [
  { pose: { eyes: "happy" }, ms: 120 },
  { pose: {}, ms: 180 },
  { pose: { eyes: "happy" }, ms: 120 },
];

const BLINK_MS = BLINK.reduce((total, f) => total + f.ms, 0);

const FOOT_TAP_LIFT = 4;

/** Three quick taps of one foot. No body motion — the torso stays put and
 *  only the foot moves, which is the whole difference between a tap and a
 *  hop. */
function footTap(side: "left" | "right"): MascotBeat {
  const key = side === "left" ? "leftFootLift" : "rightFootLift";
  const up: MascotFrame = { pose: { [key]: FOOT_TAP_LIFT }, ms: 110 };
  const down: MascotFrame = { pose: {}, ms: 130 };
  return { frames: [up, down, up, down, up, { pose: {}, ms: 240 }] };
}

/** Both flippers lifting and dropping together — a small ruffle, not a wave.
 *  22° keeps it well under the greeting's 86° so the two never read alike. */
const FLIPPER_TAP: MascotBeat = {
  frames: [
    { pose: { leftFlipperDeg: 22, rightFlipperDeg: 22 }, ms: 130 },
    { pose: {}, ms: 150 },
    { pose: { leftFlipperDeg: 22, rightFlipperDeg: 22 }, ms: 130 },
    { pose: {}, ms: 240 },
  ],
};

export const MASCOT_ANIMATIONS: Record<MascotStateName, MascotAnimation> = {
  // Idle is the only state with more than one beat, and the only one that
  // has to survive being looked at for a minute. A full pass through the bag
  // is about 17.5s, of which roughly 5s is actual movement — the rest is
  // standing still or blinking. That ratio is the point: constant motion is
  // what makes a character read as a mechanism rather than as something
  // alive, so the rests are load-bearing, not filler.
  idle: {
    beats: [
      rockBeat(5, 1500, 1),
      footTap("left"),
      footTap("right"),
      FLIPPER_TAP,
      rest(1800),
      rest(2600),
      rest(3300),
      rest(4000),
    ],
    reduced: {},
  },

  // Hunched under a raised flipper, holding the handle. The umbrella itself
  // is a garment-slot overlay that does not exist yet (see the README) —
  // until it does this is deliberately a *held* raise plus a lean into it, so
  // it doesn't read as the wave, which is a moving raise on a smile.
  umbrellaHuddle: {
    leanDeg: 4,
    beats: [held({ rightFlipperDeg: 88, eyes: "half" }, { rockDeg: 2, periodMs: 2100 })],
    reduced: { rightFlipperDeg: 88, eyes: "half" },
  },

  // Blown off the vertical, windward flipper streaming higher than the
  // leeward one. The lean goes past the ~8° the README calls unsteady, which
  // is the point of this one, and it never crosses zero — so the downwind
  // foot stays the pivot throughout and it is the upwind one that keeps being
  // lifted, which is what bracing against gusts looks like.
  windBlown: {
    leanDeg: 7,
    beats: [
      {
        frames: [
          { pose: { leftFlipperDeg: 52, rightFlipperDeg: 28 }, ms: 260 },
          { pose: { leftFlipperDeg: 66, rightFlipperDeg: 42 }, ms: 220 },
          { pose: { leftFlipperDeg: 44, rightFlipperDeg: 22 }, ms: 300 },
        ],
        body: { rockDeg: 3, periodMs: 1300 },
      },
    ],
    reduced: { leftFlipperDeg: 60, rightFlipperDeg: 36 },
  },

  // A flipper up at the brow, eyes narrowed, leaning away from the light.
  // poses.ts's "shield" put the flipper at 48°, which renders as an arm held
  // straight out — pointing, not shading. 88° is where it actually goes
  // vertical and the tip tucks behind the hat brim beside the temple.
  sunSquint: {
    leanDeg: 5,
    beats: [held({ leftFlipperDeg: 88, eyes: "half" }, { rockDeg: 3, periodMs: 1900 })],
    reduced: { leftFlipperDeg: 88, eyes: "half" },
  },

  // A flipper fanning the face, beak open. The flipper cannot physically
  // reach the face — it is shoulder-mounted and longer than the body is tall
  // — so what sells this one is the *rate*: a fast short flap high up beside
  // the head, against the wave's slow wide one, and a faster weight shift
  // under it. The sweat-drop §13.9 mentions is art that doesn't exist yet,
  // same category as the breath puff.
  fanning: {
    beats: [
      {
        frames: [
          { pose: { rightFlipperDeg: 58, mouth: "open", eyes: "half" }, ms: 140 },
          { pose: { rightFlipperDeg: 86, mouth: "open", eyes: "half" }, ms: 140 },
        ],
        body: { rockDeg: 4, periodMs: 1100 },
      },
    ],
    reduced: { rightFlipperDeg: 74, mouth: "open", eyes: "half" },
  },
};

/**
 * Merged *under* the active beat's frames, so a frame that sets `eyes` wins
 * and idle's blink still lands while shivering. §13.9's visible breath puff
 * needs art that doesn't exist yet; the jitter and the narrowed eyes are what
 * ships.
 */
export const SHIVER_UNDERLAY: MascotPose = { eyes: "half" };

/** Shiver jitter, as a fraction of the rendered size, and its half-period. */
export const SHIVER_AMPLITUDE = 0.02;
export const SHIVER_PERIOD_MS = 55;

/**
 * §13.9's on-focus greeting: a one-shot raise that falls back to whatever the
 * weather state is. Up, a wag, and down.
 */
export const GREETING: MascotAnimation = {
  beats: [
    {
      frames: [
        { pose: { rightFlipperDeg: 24, eyes: "happy" }, ms: 90 },
        { pose: { rightFlipperDeg: 60, eyes: "happy" }, ms: 110 },
        { pose: { rightFlipperDeg: 86, eyes: "happy", mouth: "open" }, ms: 160 },
        { pose: { rightFlipperDeg: 62, eyes: "happy", mouth: "open" }, ms: 140 },
        { pose: { rightFlipperDeg: 86, eyes: "happy", mouth: "open" }, ms: 160 },
        { pose: { rightFlipperDeg: 52, eyes: "happy" }, ms: 130 },
        { pose: { rightFlipperDeg: 18, eyes: "happy" }, ms: 110 },
      ],
    },
  ],
  // §9.7: "the wave shows the arm already raised". Held for the same window
  // the animated wave occupies, then the state's own pose takes over.
  reduced: { rightFlipperDeg: 86, eyes: "happy", mouth: "open" },
};

export const GREETING_MS = GREETING.beats[0].frames.reduce((total, f) => total + f.ms, 0);

/**
 * Orders idle's beats. A fixed sequence would be a loop with extra steps —
 * watch a mascot on the Today tab for a minute and you would see it come
 * round. This deals from a shuffled bag instead and refills when empty, so
 * every behaviour still turns up at a predictable *rate* (nothing gets
 * starved, and the rest-heavy mix holds) while the order never repeats.
 *
 * Pure and separable from the component so it can be tested; `random` is
 * injectable for the same reason.
 */
export function createBeatBag(count: number, random: () => number = Math.random): (previous: number) => number {
  let remaining: number[] = [];
  return (previous: number): number => {
    if (count <= 1) return 0;
    if (remaining.length === 0) {
      remaining = Array.from({ length: count }, (_, i) => i);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      // A fresh bag can otherwise open on the beat that just finished, which
      // is the one place back-to-back repeats can happen.
      if (remaining[0] === previous) [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
    }
    return remaining.shift()!;
  };
}

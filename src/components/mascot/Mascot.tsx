import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import MascotBase, {
  HALF_STANCE,
  mascotBoxHeight,
  TILT_ORIGIN,
  VIEW_BOX_HEADROOM,
  VIEW_BOX_HEIGHT_UNITS,
  VIEW_BOX_UNITS,
  type MascotGarmentFills,
  type MascotPose,
} from "./MascotBase";
import {
  createBeatBag,
  GREETING,
  GREETING_MS,
  MASCOT_ANIMATIONS,
  SHIVER_AMPLITUDE,
  SHIVER_PERIOD_MS,
  SHIVER_UNDERLAY,
  type MascotAnimation,
} from "./states";
import type { MascotState } from "../../lib/mascot";

// The animated mascot — docs/13-extended-features.md §13.9, docs/09-design-system.md §9.7.
//
// This is the only place motion lives; MascotBase stays a pure function of a
// pose and states.ts stays data. See states.ts for why the body animates on
// Reanimated while the limbs and face are keyframed.

/** The feet, as the CSS-style percentage pair a view transform pivots about.
 *  Exported because a wrapper that squashes him has to pivot about the same
 *  point, or the crouch reads as the whole character shrinking rather than as
 *  his torso dropping over his feet. */
export const MASCOT_FEET_ORIGIN = `${(TILT_ORIGIN.x / VIEW_BOX_UNITS) * 100}% ${((TILT_ORIGIN.y + VIEW_BOX_HEADROOM) / VIEW_BOX_HEIGHT_UNITS) * 100}%`;

/**
 * Distance from the top of the rendered box down to the soles, in px.
 *
 * The box has empty space both above the character (`VIEW_BOX_HEADROOM`, for
 * the umbrella) and below his feet (about 11% of the artwork's own height), so
 * laying a mascot out by its box puts him floating well above whatever he is
 * meant to be standing on. Callers position him with `-mascotFeetOffset(size)`
 * to stand him on an edge — which is the whole idea of the placements in
 * §9.7, and consistent with a character whose every motion pivots on a foot.
 *
 * It doubles as the clearance a perch needs: it is exactly how much of the
 * screen he occupies above the line he stands on.
 */
export function mascotFeetOffset(size: number): number {
  return Math.round(((TILT_ORIGIN.y + VIEW_BOX_HEADROOM) / VIEW_BOX_UNITS) * size);
}

/**
 * Tracks the OS reduce-motion setting, live. §13.9 requires respecting it,
 * and the listener matters as much as the initial read: someone who turns the
 * setting on to stop a moving thing should see it stop, not have to reopen
 * the screen.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    // Never throws on a platform that doesn't implement it; falls back to
    // "motion is fine", which is the pre-existing behaviour rather than a
    // blank mascot. §9.7: this feature never surfaces its own failures.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

interface Props {
  size: number;
  state: MascotState;
  /**
   * Replays §13.9's greeting whenever this value changes. The greeting plays
   * once on mount regardless; a caller that wants it on every screen focus
   * (Today does) passes something that changes then.
   */
  greetToken?: unknown;
  /**
   * Merged *over* the current frame, so it wins. Used for poses that belong to
   * something happening to him rather than to the weather — the flippers going
   * up for a hop. Null the rest of the time.
   */
  poseOverride?: MascotPose | null;
  /** §13.9's paper-doll slots, already resolved to fills. */
  garments?: MascotGarmentFills;
}

export default function Mascot({ size, state, greetToken, poseOverride, garments }: Props) {
  const reduceMotion = useReduceMotion();
  const [greeting, setGreeting] = useState(true);
  const [cursor, setCursor] = useState({ beat: 0, frame: 0 });

  // Both blocks below adjust state *during render* rather than in an effect —
  // React's own documented pattern for "reset some state when a prop
  // changes", and the one the react-hooks lint rule is pushing towards. React
  // re-runs this body before committing, so everything downstream reads the
  // adjusted values in the same pass and nothing renders a stale frame.
  const [lastGreetToken, setLastGreetToken] = useState(greetToken);
  if (lastGreetToken !== greetToken) {
    setLastGreetToken(greetToken);
    setGreeting(true);
  }

  const animation: MascotAnimation = greeting ? GREETING : MASCOT_ANIMATIONS[state.primary];

  const [lastAnimation, setLastAnimation] = useState(animation);
  if (lastAnimation !== animation) {
    setLastAnimation(animation);
    setCursor({ beat: 0, frame: 0 });
  }

  const beat = animation.beats[Math.min(cursor.beat, animation.beats.length - 1)];
  const { leanDeg = 0 } = animation;
  const { rockDeg = 0, periodMs = 1500, cycles } = beat.body ?? {};
  const shivering = state.shivering;

  const lean = useSharedValue(0);
  const jitter = useSharedValue(0);

  useEffect(() => {
    if (!greeting) return;
    const timer = setTimeout(() => setGreeting(false), GREETING_MS);
    return () => clearTimeout(timer);
  }, [greeting]);

  // Keyframe scheduler, walking frames within a beat and then handing over to
  // the next beat. Each frame carries its own duration — a foot tap is 110ms
  // and a rest is three seconds, and one frame rate can't express both
  // without a wasteful array. A frame of `Infinity` parks the beat (that is
  // how the held weather poses cost no timers at all), and a single-beat
  // animation just repeats its own beat.
  //
  // The cursor is mirrored locally rather than read back from state so the
  // effect doesn't restart on every frame, which would reset the bag and the
  // beat with it.
  useEffect(() => {
    if (reduceMotion) return;

    const nextBeat = createBeatBag(animation.beats.length);
    let beatIndex = 0;
    let frameIndex = 0;
    let timer: ReturnType<typeof setTimeout>;

    const queueNext = () => {
      const { ms } = animation.beats[beatIndex].frames[frameIndex];
      if (!Number.isFinite(ms)) return;
      timer = setTimeout(() => {
        frameIndex += 1;
        if (frameIndex >= animation.beats[beatIndex].frames.length) {
          frameIndex = 0;
          beatIndex = nextBeat(beatIndex);
        }
        setCursor({ beat: beatIndex, frame: frameIndex });
        queueNext();
      }, ms);
    };
    queueNext();
    return () => clearTimeout(timer);
  }, [animation, reduceMotion]);

  // The weight shift. Two shapes, because a rock that runs forever and one
  // that has to hand back to a rest beat want different endpoints:
  //
  // - **Endless** (the weather states) swings between the extremes.
  //   `withRepeat(..., true)` reverses between the value at the moment it's
  //   assigned and the target, so the line before it sets the *from* end.
  // - **Finite** (idle) starts and ends upright, so the beat after it begins
  //   from rest instead of from a 5° list. One iteration is out, across, and
  //   back — hence the half/full/half durations.
  //
  // Eased in and out throughout, which is where a weight shift pauses; a
  // linear rock reads as a metronome.
  useEffect(() => {
    cancelAnimation(lean);
    if (reduceMotion || rockDeg === 0) {
      lean.value = leanDeg;
      return;
    }
    const easing = Easing.inOut(Easing.cubic);
    if (cycles === undefined) {
      lean.value = leanDeg - rockDeg;
      lean.value = withRepeat(withTiming(leanDeg + rockDeg, { duration: periodMs, easing }), -1, true);
      return;
    }
    lean.value = leanDeg;
    lean.value = withRepeat(
      withSequence(
        withTiming(leanDeg + rockDeg, { duration: periodMs / 2, easing }),
        withTiming(leanDeg - rockDeg, { duration: periodMs, easing }),
        withTiming(leanDeg, { duration: periodMs / 2, easing })
      ),
      cycles,
      false
    );
  }, [lean, leanDeg, rockDeg, periodMs, cycles, reduceMotion]);

  // Shiver, on its own value so it composes with the wind-blown lean rather
  // than replacing it — §13.9's one state pair that stacks.
  useEffect(() => {
    cancelAnimation(jitter);
    if (reduceMotion || !shivering) {
      jitter.value = 0;
      return;
    }
    jitter.value = -SHIVER_AMPLITUDE * size;
    const timing = { duration: SHIVER_PERIOD_MS, easing: Easing.linear };
    jitter.value = withRepeat(withTiming(SHIVER_AMPLITUDE * size, timing), -1, true);
  }, [jitter, shivering, reduceMotion, size]);

  // Rotate about the foot bearing the weight, not about the point between the
  // feet. `transformOrigin` is fixed at the midpoint, so the pivot is moved by
  // adding the translation that a rotation about an offset point works out to:
  // for a pivot at P and an origin at C, that is (P−C) − R(P−C).
  //
  // Doing it this way rather than animating `transformOrigin` keeps the pivot
  // switch continuous — the offset is proportional to sin(lean), so it passes
  // through zero exactly where the character is upright and the two pivots
  // agree. The character never jumps as its weight crosses over.
  //
  // The translations come before the rotation in the array so they apply in
  // the parent's frame rather than the rotated one.
  const halfStance = (HALF_STANCE / VIEW_BOX_UNITS) * size;
  const bodyStyle = useAnimatedStyle(() => {
    const deg = lean.value;
    const rad = (deg * Math.PI) / 180;
    // Positive lean puts the weight on the right foot, negative on the left.
    const pivot = deg >= 0 ? halfStance : -halfStance;
    return {
      transform: [
        { translateX: pivot * (1 - Math.cos(rad)) + jitter.value },
        { translateY: -pivot * Math.sin(rad) },
        { rotate: `${deg}deg` },
      ],
    };
  });

  // The shiver underlay goes *under* the frame so a frame that sets `eyes`
  // still wins — idle's blink lands even while shivering.
  const framePose = reduceMotion ? animation.reduced : beat.frames[Math.min(cursor.frame, beat.frames.length - 1)].pose;
  const shivered: MascotPose = shivering ? { ...SHIVER_UNDERLAY, ...framePose } : framePose;
  const pose: MascotPose = poseOverride ? { ...shivered, ...poseOverride } : shivered;

  return (
    <Animated.View
      // Decorative, in full. Everything the mascot conveys is already in the
      // gear card and leg list as text (§13.9), so it must not be reachable
      // at all. `no-hide-descendants` rather than §13.9's literal `"no"`:
      // the same intent, but it also takes the SVG's own subtree out, which
      // is what actually stops it becoming a screen-reader trap.
      //
      // `aria-hidden` as well, and not as belt-and-braces: measured in the
      // browser, react-native-web emits *neither* of the two props below —
      // they are Android- and iOS-only — so on web the SVG was still in the
      // accessibility tree with nothing marking it decorative. `aria-hidden`
      // is the cross-platform prop that maps to all three.
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: mascotBoxHeight(size), transformOrigin: MASCOT_FEET_ORIGIN }, bodyStyle]}
    >
      <MascotBase size={size} pose={pose} garments={garments} />
    </Animated.View>
  );
}

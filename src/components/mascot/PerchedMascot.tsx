import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Mascot, { MASCOT_FEET_ORIGIN, mascotFeetOffset } from "./Mascot";
import type { MascotGarmentFills, MascotPose } from "./MascotBase";
import { perchOffsetX, type Perch } from "./useMascotPerches";
import type { MascotState } from "../../lib/mascot";

// The mascot, absolutely positioned over a stack of cards and hopping between
// them. See useMascotPerches for why he is positioned rather than laid out.
//
// The hop is built the way a cartoon jump is: anticipate, launch, hold the
// shape in the air, absorb the landing. Without the crouch he slides between
// perches; the arc alone reads as being carried rather than jumping.

/** Gather before the launch. */
const CROUCH_MS = 150;
/** Time in the air. */
const TRAVEL_MS = 400;
/** Absorbing the landing, then standing back up. */
const LAND_MS = 90;
const RECOVER_MS = 150;

/** How far above the higher perch the arc peaks, as a fraction of his size. */
const HOP_LIFT = 0.26;
/** Vertical compression at the deepest crouch. `1 - CROUCH` is the scale. */
const CROUCH = 0.14;
/** Vertical extension at the moment of takeoff. */
const STRETCH = 0.07;

/** Flippers out and up, held from the crouch until he lands. */
const AIRBORNE_POSE: MascotPose = { leftFlipperDeg: 62, rightFlipperDeg: 62 };
const AIRBORNE_MS = CROUCH_MS + TRAVEL_MS;

interface Props {
  size: number;
  state: MascotState;
  greetToken?: unknown;
  /** Where he should be standing. Null before the first perch has been measured. */
  target: Perch | null;
  /** Skips the whole hop and places him directly — reduce motion, and the first placement. */
  instant: boolean;
  garments?: MascotGarmentFills;
}

export default function PerchedMascot({ size, state, greetToken, target, instant, garments }: Props) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  /** −1 fully crouched, +1 fully stretched, 0 standing. */
  const squash = useSharedValue(0);

  const targetX = target ? perchOffsetX(target, size) : 0;
  const targetY = target ? target.y - mascotFeetOffset(size) : 0;
  const hasTarget = target !== null;

  // Where he was last put, and whether getting there was a jump. Recorded
  // during render — React's documented "adjust state when a prop changes" —
  // so the animation effect runs exactly once per placement and carries its
  // own answer, rather than re-deciding from a value that changes underneath
  // it mid-hop.
  const [placement, setPlacement] = useState<{ x: number; y: number; jumped: boolean } | null>(null);
  const [hopId, setHopId] = useState(0);
  const [landedId, setLandedId] = useState(0);
  if (hasTarget && (placement === null || placement.x !== targetX || placement.y !== targetY)) {
    // The first placement is never a jump: he should already be standing
    // there when the screen appears, not hop on from the top-left corner.
    const jumped = placement !== null && !instant;
    setPlacement({ x: targetX, y: targetY, jumped });
    if (jumped) setHopId((n) => n + 1);
  }

  const airborne = hopId !== landedId;

  // Flippers come down on landing, which is well before the squash has
  // finished settling — so this timer is deliberately shorter than the
  // animation it overlaps.
  useEffect(() => {
    if (!airborne) return;
    const timer = setTimeout(() => setLandedId(hopId), AIRBORNE_MS);
    return () => clearTimeout(timer);
  }, [airborne, hopId]);

  useEffect(() => {
    if (placement === null) return;
    const { x: toX, y: toY, jumped } = placement;
    if (!jumped) {
      x.value = toX;
      y.value = toY;
      lift.value = 0;
      squash.value = 0;
      return;
    }
    const targetX = toX;
    const targetY = toY;

    const travel = { duration: TRAVEL_MS, easing: Easing.inOut(Easing.quad) };
    // Travel waits out the crouch, so he gathers himself *then* goes.
    x.value = withDelay(CROUCH_MS, withTiming(targetX, travel));
    y.value = withDelay(CROUCH_MS, withTiming(targetY, travel));
    lift.value = withDelay(
      CROUCH_MS,
      withSequence(
        withTiming(-HOP_LIFT * size, { duration: TRAVEL_MS * 0.45, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: TRAVEL_MS * 0.55, easing: Easing.in(Easing.quad) })
      )
    );
    squash.value = withSequence(
      // Down over the feet — the anticipation.
      withTiming(-1, { duration: CROUCH_MS, easing: Easing.out(Easing.quad) }),
      // Snap tall as he leaves the ground.
      withTiming(1, { duration: TRAVEL_MS * 0.25, easing: Easing.out(Easing.quad) }),
      // Neutral through the rest of the arc.
      withTiming(0, { duration: TRAVEL_MS * 0.75, easing: Easing.inOut(Easing.quad) }),
      // Absorb, then stand back up.
      withTiming(-0.7, { duration: LAND_MS, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: RECOVER_MS, easing: Easing.out(Easing.quad) })
    );
  }, [placement, x, y, lift, squash, size]);

  const hopStyle = useAnimatedStyle(() => {
    const s = squash.value;
    // One value drives both axes so volume roughly holds: crouching widens
    // him, stretching narrows him. Scaling about the feet (see the shared
    // origin below) is what makes it read as the torso dropping over them
    // rather than the whole character shrinking.
    const scaleY = 1 + s * (s < 0 ? CROUCH : STRETCH);
    const scaleX = 1 - s * (s < 0 ? CROUCH : STRETCH) * 0.6;
    return {
      transform: [
        { translateX: x.value },
        { translateY: y.value + lift.value },
        { scaleX },
        { scaleY },
      ],
    };
  });

  if (!hasTarget) return null;

  return (
    <Animated.View
      // Decorative and floating over real content, so it must never eat a tap
      // meant for the card underneath.
      pointerEvents="none"
      style={[styles.floating, { transformOrigin: MASCOT_FEET_ORIGIN }, hopStyle]}
    >
      <Mascot
        size={size}
        state={state}
        greetToken={greetToken}
        poseOverride={airborne ? AIRBORNE_POSE : null}
        garments={garments}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // `elevation` as well as being drawn last, because being last is only enough
  // on web and iOS. On Android elevation decides draw order outright, and
  // every card carries `cardElevationStyle`'s elevation 6 — so without this
  // the cards would paint over his feet there exactly as they did on web
  // before he was lifted out of the flow. No background, so it casts no
  // shadow of its own.
  floating: { position: "absolute", top: 0, left: 0, zIndex: 1, elevation: 12 },
});

import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Mascot, { MASCOT_FEET_ORIGIN } from "./Mascot";
import { mascotFeetOffset, type MascotGarmentFills, type MascotPose } from "./MascotBase";
import { perchOffsetX, type PerchTarget } from "./useMascotPerches";
import { CROUCH_MS, HOP_LANDING_MS, LAND_MS, RECOVER_MS, SINK_HOLD_MS, TRAVEL_MS, TRAVEL_TIMING } from "./hopTiming";
import type { MascotState } from "../../lib/mascot";

// The mascot, absolutely positioned over a stack of cards and hopping between
// them. See useMascotPerches for why he is positioned rather than laid out.
//
// The hop is built the way a cartoon jump is: anticipate, launch, hold the
// shape in the air, absorb the landing. Without the crouch he slides between
// perches; the arc alone reads as being carried rather than jumping.
//
// He is given the card's top edge as it currently is, and the cards hold still
// until he gets there — so he always lands on something the user can see. The
// stack then settles under him a beat later, and that arrives here as a
// `sag`: a target change he follows with his feet and nothing else, over the
// same curve the margins are easing along. The landing is timed against that
// move — he compresses, holds, and the card gives at the end of the hold — so
// the two files share hopTiming rather than each guessing.

/** How far above the higher perch the arc peaks, as a fraction of his size. */
const HOP_LIFT = 0.26;
/** Vertical compression at the deepest crouch. `1 - CROUCH` is the scale. */
const CROUCH = 0.14;
/** Vertical extension at the moment of takeoff. */
const STRETCH = 0.07;
/** How far into the crouch the landing drives him, on the same -1..1 scale as
 *  `squash`. Deeper than the old 0.7: this is the pose the card is holding up,
 *  so it has to look like an effort. */
const LANDING_SQUASH = 0.85;

/** Flippers out and up, held from the crouch until he lands. */
const AIRBORNE_POSE: MascotPose = { leftFlipperDeg: 62, rightFlipperDeg: 62 };

interface Props {
  size: number;
  state: MascotState;
  greetToken?: unknown;
  /** Where he should be standing, and whether getting there is a jump of his
   *  own or the card moving under him. Null before the first measurement. */
  target: PerchTarget | null;
  /** The perch line under his feet, from `useMascotPerches`, which owns every
   *  write to it — including the travel of a hop, so a settle can move his
   *  feet on the same frame as the margins and the scroll. Read-only here. */
  standingY: SharedValue<number>;
  /** Skips the whole hop and places him directly — reduce motion, and the first placement. */
  instant: boolean;
  garments?: MascotGarmentFills;
}

export default function PerchedMascot({ size, state, greetToken, target, standingY, instant, garments }: Props) {
  const x = useSharedValue(0);
  const lift = useSharedValue(0);
  /** −1 fully crouched, +1 fully stretched, 0 standing. */
  const squash = useSharedValue(0);

  const feetOffset = mascotFeetOffset(size);
  const targetX = target ? perchOffsetX(target, size) : 0;
  const targetY = target ? target.y : 0;
  const hasTarget = target !== null;

  // Where he was last put, and how he got there. Recorded during render —
  // React's documented "adjust state when a prop changes" — so the animation
  // effect runs exactly once per placement and carries its own answer, rather
  // than re-deciding from a value that changes underneath it mid-hop.
  //
  //  - "place" resets everything and puts him down. The first placement (he
  //    should already be standing there when the screen appears, not hop on
  //    from the top-left corner) and reduce motion.
  //  - "hop" is the full jump.
  //  - "sag" moves his feet and touches nothing else. It is the card giving
  //    way under him at the end of a hop, so it must not restart the squash
  //    he is in the middle of — that landing compression is *why* the card is
  //    moving, and resetting it would cut the effect in half.
  type Arrival = "place" | "hop" | "sag";
  const [placement, setPlacement] = useState<{ x: number; y: number; arrival: Arrival } | null>(null);
  const [hopId, setHopId] = useState(0);
  const [landedId, setLandedId] = useState(0);
  if (hasTarget && (placement === null || placement.x !== targetX || placement.y !== targetY)) {
    const arrival: Arrival = placement === null || instant ? "place" : target.arrival === "sag" ? "sag" : "hop";
    setPlacement({ x: targetX, y: targetY, arrival });
    if (arrival === "hop") setHopId((n) => n + 1);
  }

  const airborne = hopId !== landedId;

  // Flippers come down on landing, which is well before the squash has
  // finished settling — so this timer is deliberately shorter than the
  // animation it overlaps.
  useEffect(() => {
    if (!airborne) return;
    const timer = setTimeout(() => setLandedId(hopId), HOP_LANDING_MS);
    return () => clearTimeout(timer);
  }, [airborne, hopId]);

  useEffect(() => {
    if (placement === null) return;
    const { x: toX, arrival } = placement;
    if (arrival === "sag") {
      // Nothing to do: the hook has already eased `standingY` in the same
      // frame it moved the margins and the scroll, which is the whole reason
      // that value lives out there. His x cannot change without a hop, and the
      // landing squash is deliberately left running — that compression is why
      // the card is moving at all.
      return;
    }
    if (arrival === "place") {
      x.value = toX;
      lift.value = 0;
      squash.value = 0;
      return;
    }
    const targetX = toX;

    // Travel waits out the crouch, so he gathers himself *then* goes. The
    // vertical half of this is the hook's `standingY`, on the same delay and
    // the same TRAVEL_TIMING.
    x.value = withDelay(CROUCH_MS, withTiming(targetX, TRAVEL_TIMING));
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
      // Absorb the landing, deeper and slower than a bounce would be.
      withTiming(-LANDING_SQUASH, { duration: LAND_MS, easing: Easing.out(Easing.quad) }),
      // Held there, weight fully on a card that hasn't given yet. Timed with
      // the layout, which moves at the end of this hold — see CARD_SINK_MS.
      withTiming(-LANDING_SQUASH, { duration: SINK_HOLD_MS, easing: Easing.linear }),
      // The card gives, and he comes up as it goes down.
      withTiming(0, { duration: RECOVER_MS, easing: Easing.out(Easing.quad) })
    );
  }, [placement, x, lift, squash, size]);

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
        // His box hangs above the line he stands on; `lift` is the hop's arc.
        { translateY: standingY.value - feetOffset + lift.value },
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

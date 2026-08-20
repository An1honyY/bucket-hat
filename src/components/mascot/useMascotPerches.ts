import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from "react-native";
import { useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import { CARD_SINK_MS, CROUCH_MS, SAG_TIMING, TRAVEL_TIMING } from "./hopTiming";
import { choosePerch, samePerch, type Perch, type PerchAlign, type PerchTarget } from "./perchGeometry";
import type { MascotPerchProps } from "./MascotPerch";

// Re-exported so callers have one place to import a perch from, and so the
// geometry can stay in a module that jest can load (see perchGeometry.ts).
export * from "./perchGeometry";

// Which card the mascot is standing on, for a screen that has several.
//
// He is not laid out in the flow between cards. That was the first attempt and
// it put the next card's background over his feet — he read as sunk into the
// card rather than standing on it, because two unpositioned siblings paint in
// document order. He is now absolutely positioned over the whole stack and
// drawn last, which fixes the overlap and is also what lets him move.
//
// Perches are chosen by scroll position rather than by a timer: he hops to the
// topmost card that has room to hold him. That is self-limiting (he can never
// hop somewhere off screen and strand himself), it needs no clock, and it
// motivates the movement — he follows what you are reading rather than
// wandering at random.
//
// The room he needs travels with him (`rooms` below). A screen used to reserve
// it permanently, at every perch, which meant the cards were spaced for a
// character standing on one of them at a time — the gaps he wasn't in were
// just holes. Now a perch is at its natural spacing until he lands on it.
//
// *Lands on*, literally. The room used to be applied the moment a new perch
// was chosen, which is half a second before he arrives: the cards shuffled,
// and then he hopped after them. So the choice now moves in two beats — he is
// sent to the card's top edge *as it currently is*, the layout holds
// completely still for the whole hop, and the room is applied once he has
// landed on it and taken a beat to compress (`CARD_SINK_MS` — deliberately
// later than the touchdown; the reason is written up there).
//
// On that frame he moves too, by exactly what the card moves (`nextY`), in
// the same commit. Sending him to the *predicted* position instead was the
// first attempt and it was worse than the bug it replaced: he flew to a spot
// no card was at yet, hung there, and then dropped 76px to meet a card that
// had only moved 24. Landing on what you can see and sagging with it is the
// whole point — nothing moves until he is standing on it, and then he and it
// move together.

/** How long scrolling must be still before he commits to a new perch. Without
 *  it he hops once per frame down a long flick. */
const SETTLE_MS = 350;

export interface MascotPerches {
  /**
   * Attach to the container holding every perch and the mascot itself.
   *
   * A callback ref rather than a RefObject, deliberately: anything this hook
   * hands back gets read during the caller's render, and `react-hooks/refs`
   * (rightly) treats a returned RefObject as making the whole bag unreadable
   * there. A function has no `.current` to misuse.
   */
  stackRef: (node: View | null) => void;
  /**
   * Attach to the ScrollView the stack lives in, alongside `onScroll`.
   *
   * Needed because a room that disappears from *above* the viewport would
   * otherwise take the page with it: the content shortens, the offset doesn't,
   * and everything the user was reading jumps up by the height of the room.
   * The hook scrolls by exactly that much to cancel it out.
   */
  scrollRef: (node: ScrollView | null) => void;
  /**
   * Attach to each spot he may stand on, top to bottom. Declare these
   * deliberately — a perch is somewhere the screen *knows* has room above it,
   * not simply the next card down. Deriving one per card put him over the
   * hourly forecast strip, because every card but the first has content
   * pressed right against its top edge.
   *
   * Spread onto a `MascotPerch`, which turns these into the animated margin
   * that is the perch's share of `rooms` — applied only while he is standing
   * there, and eased on and off so the stack settles under him rather than
   * teleporting.
   */
  perchProps: (index: number, align?: PerchAlign) => Omit<MascotPerchProps, "children">;
  /** Attach to the ScrollView, along with `scrollEventThrottle={16}`. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Where he should be standing now, and how to get there. Null until the
   *  first card has been measured. */
  target: PerchTarget | null;
  /**
   * The perch line under his feet, as a Reanimated value. Pass it to
   * `PerchedMascot`.
   *
   * It is out here rather than inside the mascot because of *who has to write
   * it and when*. A settle moves three things — the leaving margin, the
   * arriving margin and the scroll offset — and they only look like one
   * movement if they are written on one frame. His feet are the fourth, and a
   * position that arrives through React state is two renders behind: he stayed
   * put for two frames while the ground went out from under him, then slid
   * back to meet it. The hook writes all four together instead.
   *
   * So the hook writes it, always — a settle, a card growing under him, and
   * the travel of a hop as well. `PerchedMascot` only reads it, and owns the
   * parts of a jump that are about him rather than about the ground: his
   * horizontal move, the arc over it and the squash around it. (It cannot
   * write it in any case: a shared value arriving as a prop is frozen, and
   * React Compiler rejects assignments to it.)
   */
  standingY: SharedValue<number>;
}

/**
 * The three values a settle moves, and the one thing that has to know which
 * perch is which.
 *
 * All Reanimated, and deliberately: the sink writes every one of them in a
 * single synchronous block alongside the scroll offset, so the leaving margin,
 * the arriving margin, the mascot's feet and the page all move on one frame.
 * Anything here that went through React state instead would arrive two renders
 * late and re-render the whole card stack on the frame the movement starts.
 */
export interface PerchRooms {
  /** Which perch is being stood on, and which is still giving its room back.
   *  `leaving` is -1 when nothing is. Set instantly; never animated. */
  routing: SharedValue<{ active: number; leaving: number }>;
  arrivingRoom: SharedValue<number>;
  leavingRoom: SharedValue<number>;
}

/** Promise wrapper around measureLayout, which is callback-shaped and has a
 *  failure path (an unmounted or not-yet-attached node). */
function measureAgainst(node: View, stack: View, align: PerchAlign): Promise<Perch | null> {
  return new Promise((resolve) => {
    node.measureLayout(
      stack as never,
      (x, y, width) => resolve({ x, y, width, align }),
      () => resolve(null)
    );
  });
}

/**
 * @param clearance how much of the screen he occupies above the line he stands
 *   on — `mascotClearance`, which follows the umbrella. A perch is only
 *   eligible if this much of it is on screen, so he is never half a mascot
 *   pinned under the top edge.
 * @param pinned keeps him on the first perch and never moves him — what
 *   reduce motion asks for, since a hop is motion however short.
 * @param rooms extra space, by perch index, that the perch adds above itself
 *   *while he is standing on it* and gives back when he leaves. 0 for a perch
 *   whose natural spacing already holds him — the space above a perch is often
 *   the empty corner of the card above, which he is welcome to overlap. Must
 *   be referentially stable (`useMemo`): a fresh array every render would
 *   re-measure every render.
 */
export function useMascotPerches(clearance: number, pinned: boolean, rooms: readonly number[]): MascotPerches {
  const stack = useRef<View | null>(null);
  const scroll = useRef<ScrollView | null>(null);
  const nodes = useRef<Map<number, { node: View; align: PerchAlign }>>(new Map());
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Fires when his feet touch down — the moment the rooms are allowed to
   *  move. Deliberately not cleared by the measure effect's cleanup: a card
   *  reporting a layout mid-hop must not cancel his landing. */
  const landingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reflowFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  /** True from launching a hop until the layout that answers it has settled —
   *  so it now covers the flight as well as the reflow. Measurements taken in
   *  between describe spacing that is on its way out and would place him
   *  against it: one hop to the wrong spot, then another to the right one. */
  const awaitingReflow = useRef(false);
  /** Mirrors `activeIndex` for the measure pass, which must not re-run on the
   *  state change itself: at that moment the room it asked for is still not in
   *  the layout. It re-runs on the reflow below instead. */
  const activeRef = useRef(0);
  /** Whether he has been put down anywhere yet. The first placement is not a
   *  hop (PerchedMascot places it instantly), so it has no flight to wait out
   *  and its room applies immediately. A ref rather than reading `target`, so
   *  the measure effect doesn't take a dependency on its own output. */
  const placed = useRef(false);
  /** The room currently asked for, so a re-render doesn't restart the tween. */
  const appliedRoom = useRef(rooms[0] ?? 0);

  const [target, setTarget] = useState<PerchTarget | null>(null);
  /**
   * The last target handed out, mirrored.
   *
   * The `samePerch` check used to be made inside `setTarget`'s updater, using
   * the `current` React passes it — and the same updater wrote `standingY`.
   * A state updater has to be pure: React calls it during render, is free to
   * call it more than once, and is free to throw the render away and call it
   * again later. Writing a shared value in there is none of those things, and
   * Reanimated says so out loud at runtime ("Writing to `value` during
   * component render", logged from this file). A duplicate call restarts the
   * `withTiming` from wherever the last one had got to, and a discarded render
   * leaves his feet moving toward a perch React decided not to render — which
   * is the mascot standing somewhere no card is, or off screen entirely.
   *
   * With the previous target in a ref, the comparison and the write both
   * happen here, in a promise callback, where side effects belong; `setTarget`
   * goes back to being handed a plain value.
   */
  const lastTarget = useRef<PerchTarget | null>(null);

  // The two rooms in play during a hop, as Reanimated values so the settle
  // runs on the UI thread and costs the screen no re-renders at all — this is
  // a whole card stack, and tweening a margin through React state would mean
  // fifteen full re-renders in a quarter of a second.
  //
  // Two, because a hop changes two margins at once: the perch he left gives
  // its room back while the one he landed on takes its own, and the regions
  // those move are different. One value each is also why they can be animated
  // independently — see the sink below, where only part of the leaving room is
  // ever worth animating.
  const arrivingRoom = useSharedValue(rooms[0] ?? 0);
  const leavingRoom = useSharedValue(0);
  const routing = useSharedValue({ active: 0, leaving: -1 });
  const standingY = useSharedValue(0);
  // Bumped whenever a card reports a layout, which is the cue to re-measure.
  const [revision, setRevision] = useState(0);
  const [settledScrollY, setSettledScrollY] = useState(0);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (landingTimer.current) clearTimeout(landingTimer.current);
      if (reflowFrame.current !== null) cancelAnimationFrame(reflowFrame.current);
    },
    []
  );

  // `onLayout` is a *signal*, not the measurement. On web react-native-web
  // implements it with a ResizeObserver, which fires when a view changes size
  // but not when it merely moves — so a card that shifts down because the one
  // above it grew never re-reports, and its stored position goes stale. That
  // is not hypothetical: the forecast card grows when its data lands, and the
  // checklist below it kept a perch 445px up the page, which put the mascot in
  // the middle of nowhere. Measuring on the signal rather than trusting its
  // payload is correct on both platforms.
  const stackRef = useCallback((node: View | null) => {
    stack.current = node;
    // Attaching is the first chance to measure anything at all.
    if (node) setRevision((n) => n + 1);
  }, []);

  const scrollRef = useCallback((node: ScrollView | null) => {
    scroll.current = node;
  }, []);

  // The room he needs can change while he is standing still — the umbrella
  // appears and his clearance grows. Animated with the same curve, so it reads
  // as the card making space rather than as a layout glitch.
  useEffect(() => {
    if (awaitingReflow.current) return;
    const wanted = rooms[activeRef.current] ?? 0;
    if (appliedRoom.current === wanted) return;
    appliedRoom.current = wanted;
    arrivingRoom.value = pinned ? wanted : withTiming(wanted, SAG_TIMING);
  }, [rooms, pinned, arrivingRoom]);

  const perchRooms = useMemo(
    () => ({ routing, arrivingRoom, leavingRoom }),
    [routing, arrivingRoom, leavingRoom]
  );

  const perchProps = useCallback(
    (index: number, align: PerchAlign = "center") => ({
      index,
      rooms: perchRooms,
      perchRef: (node: View | null) => {
        if (node) nodes.current.set(index, { node, align });
        else nodes.current.delete(index);
      },
      onLayout: () => setRevision((n) => n + 1),
    }),
    [perchRooms]
  );


  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pinned) return;
      const scrollY = event.nativeEvent.contentOffset.y;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => setSettledScrollY(scrollY), SETTLE_MS);
    },
    [pinned]
  );

  useEffect(() => {
    let cancelled = false;
    const container = stack.current;
    if (!container || awaitingReflow.current) return;

    const indices = [...nodes.current.keys()].sort((a, b) => a - b);
    Promise.all(
      indices.map((i) => {
        const entry = nodes.current.get(i)!;
        return measureAgainst(entry.node, container, entry.align);
      })
    ).then((measured) => {
      if (cancelled || awaitingReflow.current) return;
      const perches = indices
        .map((index, n) => ({ index, perch: measured[n], room: rooms[index] ?? 0 }))
        .filter((p): p is { index: number; perch: Perch; room: number } => p.perch !== null);
      if (perches.length === 0) return;

      const active = activeRef.current;
      const choice = choosePerch(
        perches.map((p) => ({ index: p.index, y: p.perch.y, room: p.room })),
        active,
        clearance,
        settledScrollY,
        pinned
      );
      if (!choice) return;

      if (choice.index === active) {
        // A sag either way: this is the re-measure that closes a hop, and it
        // is also what runs when a card he is already standing on moves
        // because something above it grew. Both are the ground shifting under
        // him, and he should ride it rather than jump to it.
        const standing: PerchTarget = { ...perches.find((p) => p.index === active)!.perch, arrival: "sag" };
        // Held by identity when nothing has really moved — see `samePerch`.
        if (!samePerch(lastTarget.current, standing)) {
          // Ease him onto it, unless this is the first time he has been put
          // anywhere — then he is simply standing there when the screen opens.
          standingY.value = placed.current && !pinned ? withTiming(standing.y, SAG_TIMING) : standing.y;
          lastTarget.current = standing;
          setTarget(standing);
        }
        placed.current = true;
        return;
      }

      // Beat one: send him to the card's top edge as it is *right now*, and
      // touch nothing else. The stack keeps its current spacing for the whole
      // flight, so he lands on a card the user can see, at the line they can
      // see it at.
      const landing = perches.find((p) => p.index === choice.index)!;
      lastTarget.current = { ...landing.perch, arrival: "hop" };
      setTarget(lastTarget.current);
      awaitingReflow.current = true;
      // His feet travel from here; PerchedMascot supplies the arc over them
      // and the squash around them, on the matching timings from hopTiming.
      const hopping = placed.current && !pinned;
      standingY.value = hopping
        ? withDelay(CROUCH_MS, withTiming(landing.perch.y, TRAVEL_TIMING))
        : landing.perch.y;

      // Beat two: he lands, compresses, and the card gives under him. The
      // first placement has no flight to wait for (he is put down, not
      // thrown), and reduce motion has no flight at all.
      const flight = placed.current && !pinned ? CARD_SINK_MS : 0;
      placed.current = true;
      if (landingTimer.current) clearTimeout(landingTimer.current);
      const leaving = perches.find((p) => p.index === active);
      const leavingRoomTotal = leaving ? leaving.room : 0;
      landingTimer.current = setTimeout(() => {
        // Not one line of React in this block, deliberately. Everything the
        // settle moves is written here, synchronously, so it all lands on one
        // frame — and re-rendering a screen of cards on the frame the movement
        // starts is what a jolt actually is.
        activeRef.current = choice.index;
        routing.value = { active: choice.index, leaving: active };

        // The one instant step, and it is invisible by construction. Whatever
        // of the departing room is *above* the viewport can only be cancelled
        // by the scroll offset, so both come off together and nothing on
        // screen moves by a pixel — which also means there is nothing there
        // worth easing.
        standingY.value = landing.perch.y - choice.roomAboveViewport;
        if (choice.roomAboveViewport > 0) {
          scroll.current?.scrollTo({ y: choice.scrollBase, animated: false });
        }
        // What is left of it is the part you can see, and that is what eases
        // out. Splitting the room this way is what lets the settle need no
        // scrolling of its own: shrinking a margin that starts at the top of
        // the viewport moves only what is below it.
        leavingRoom.value = leavingRoomTotal - choice.roomAboveViewport;
        arrivingRoom.value = 0;
        if (pinned) {
          leavingRoom.value = 0;
          arrivingRoom.value = landing.room;
          standingY.value = choice.nextY;
        } else {
          // One curve, three values, one frame — see SAG_TIMING. `nextY` is
          // where the perch's top line ends up, so his feet ride it down.
          leavingRoom.value = withTiming(0, SAG_TIMING);
          arrivingRoom.value = withTiming(landing.room, SAG_TIMING);
          standingY.value = withTiming(choice.nextY, SAG_TIMING);
        }

        // Everything React needs to know waits until the stack has stopped
        // moving, so the render it causes lands on a still screen. Two frames
        // more before measuring, because a margin only becomes a position once
        // layout has run.
        landingTimer.current = setTimeout(
          () => {
            routing.value = { active: choice.index, leaving: -1 };
            appliedRoom.current = landing.room;
            lastTarget.current = { ...landing.perch, y: choice.nextY, arrival: "sag" };
            setTarget(lastTarget.current);
            if (choice.roomAboveViewport > 0) setSettledScrollY(choice.scrollBase);
            reflowFrame.current = requestAnimationFrame(() => {
              reflowFrame.current = requestAnimationFrame(() => {
                awaitingReflow.current = false;
                setRevision((n) => n + 1);
              });
            });
          },
          pinned ? 0 : SAG_TIMING.duration
        );
      }, flight);
    });

    return () => {
      cancelled = true;
    };
  }, [revision, settledScrollY, pinned, clearance, rooms, arrivingRoom, leavingRoom, routing, standingY]);

  return { stackRef, scrollRef, perchProps, onScroll, target, standingY };
}

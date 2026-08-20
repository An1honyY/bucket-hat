import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from "react-native";
import { CARD_SINK_MS } from "./hopTiming";

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

/**
 * Where inside a perch's width he stands. Defaults to centre.
 *
 * This exists because a mascot is 96pt tall and stands *above* the line he is
 * on, so he always occupies a chunk of whatever is up there. Centre is only
 * right when the space above is genuinely empty. Beside a short row — a
 * section label, a collapsed disclosure — the clear space is the far end of
 * it, and that is where he belongs.
 */
export type PerchAlign = "left" | "center" | "right";

export interface Perch {
  /** Top-left of the perch line, relative to the stack the mascot is positioned in. */
  x: number;
  y: number;
  width: number;
  align: PerchAlign;
}

/**
 * A perch plus how he is to get to it.
 *
 * The distinction is the difference between a jump and being carried. A `hop`
 * is him crossing to another card under his own power. A `sag` is the card
 * moving *under his feet* — it happens at the end of a hop, when the room is
 * finally applied and the whole stack settles — and he has to follow it
 * exactly, on the same frame, or he reads as detached from it.
 */
export interface PerchTarget extends Perch {
  arrival: "hop" | "sag";
}

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
   * The returned `style` carries that perch's own share of `rooms`, applied
   * only while he is standing there.
   */
  perchProps: (
    index: number,
    align?: PerchAlign
  ) => { ref: (node: View | null) => void; onLayout: () => void; style: { marginTop: number } };
  /** Attach to the ScrollView, along with `scrollEventThrottle={16}`. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Where he should be standing now, and how to get there. Null until the
   *  first card has been measured. */
  target: PerchTarget | null;
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

/** One perch as the choice below sees it: where it was measured, and what it
 *  adds above itself while he is standing there. */
export interface PerchCandidate {
  index: number;
  /** Measured top, in the *current* layout — so it includes whichever room is
   *  applied right now. */
  y: number;
  room: number;
}

export interface PerchChoice {
  /** The perch he belongs on. */
  index: number;
  /**
   * Where that perch's top line ends up once the rooms have swapped.
   *
   * Not where he flies to — he lands on the card where it is now. This is
   * where *both* of them go afterwards, applied to the layout and to his feet
   * in the same commit, so the card sags with him standing on it.
   *
   * Only meaningful when `index` differs from the perch he is on; for a perch
   * he is already standing on it is simply where it is.
   */
  nextY: number;
  /** The scroll offset with the departing room taken out of it — what the
   *  ScrollView must be set to for nothing on screen to move. Only worth
   *  applying when `index` differs from the perch he is on. */
  scrollBase: number;
  /** How much of his current room is already scrolled past. Zero means the
   *  room is entirely on screen and losing it moves nothing above it. */
  roomAboveViewport: number;
}

/**
 * Which perch he should be standing on, and what that costs the scroll offset.
 *
 * Pure, and the whole reason the hook can move his room around without the
 * page lurching. Two coordinate spaces meet here: `y` is measured in the
 * layout as it stands, with the *active* perch's room in it, while the choice
 * has to be made in the layout each candidate would produce if he stood there.
 * So the active room is subtracted back out of everything from that perch down
 * (only one room is ever applied), and each candidate is then judged with its
 * own room added.
 *
 * Getting that wrong doesn't look like a rounding error: judge the top perch
 * without the room it would have, and it can never satisfy its own clearance
 * again, so he leaves it on the first scroll and never comes back.
 */
export function choosePerch(
  candidates: readonly PerchCandidate[],
  active: number,
  clearance: number,
  scrollY: number,
  pinned: boolean
): PerchChoice | null {
  if (candidates.length === 0) return null;

  const occupied = candidates.find((c) => c.index === active);
  const applied = occupied ? occupied.room : 0;
  // Whatever part of his current room is above the viewport is holding up the
  // offset; when the room goes, so does that.
  const roomAboveViewport = occupied ? Math.max(0, Math.min(applied, scrollY - (occupied.y - applied))) : 0;
  const scrollBase = scrollY - roomAboveViewport;

  const baseY = (c: PerchCandidate) => c.y - (c.index >= active ? applied : 0);
  // The first card with enough room above it to show him in full. Falls back
  // to the last one, so scrolling to the bottom doesn't strand him up the page
  // where nobody can see him.
  const found = pinned ? 0 : candidates.findIndex((c) => baseY(c) + c.room - clearance >= scrollBase);
  const next = candidates[found === -1 ? candidates.length - 1 : found];

  return { index: next.index, nextY: baseY(next) + next.room, scrollBase, roomAboveViewport };
}

/**
 * Two measurements of the same spot, to within a pixel.
 *
 * The landing re-measure has to confirm he is where the arithmetic said he
 * would be, and sub-pixel layout rounding means "confirm" can't be `===`:
 * a target that differs by a fraction is a *new* placement to PerchedMascot,
 * and he would hop again on the spot, forever.
 */
export function samePerch(a: Perch | null, b: Perch): boolean {
  // Geometry only: `arrival` says how he got here, not where here is, and a
  // re-measure that agrees must not count as a move.
  return (
    a !== null &&
    a.align === b.align &&
    Math.abs(a.x - b.x) < 1 &&
    Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.width - b.width) < 1
  );
}

/** Where his box's left edge goes, for a perch of this width. */
export function perchOffsetX(perch: Perch, size: number): number {
  if (perch.align === "left") return perch.x;
  if (perch.align === "right") return perch.x + perch.width - size;
  return perch.x + perch.width / 2 - size / 2;
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

  const [activeIndex, setActiveIndex] = useState(0);
  const [target, setTarget] = useState<PerchTarget | null>(null);
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

  const perchProps = useCallback(
    (index: number, align: PerchAlign = "center") => ({
      ref: (node: View | null) => {
        if (node) nodes.current.set(index, { node, align });
        else nodes.current.delete(index);
      },
      onLayout: () => setRevision((n) => n + 1),
      style: { marginTop: activeIndex === index ? (rooms[index] ?? 0) : 0 },
    }),
    [activeIndex, rooms]
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
        placed.current = true;
        // Held by identity when nothing has really moved — see `samePerch`.
        setTarget((current) => (samePerch(current, standing) ? current : standing));
        return;
      }

      // Beat one: send him to the card's top edge as it is *right now*, and
      // touch nothing else. The stack keeps its current spacing for the whole
      // flight, so he lands on a card the user can see, at the line they can
      // see it at.
      const landing = perches.find((p) => p.index === choice.index)!;
      setTarget({ ...landing.perch, arrival: "hop" });
      awaitingReflow.current = true;

      // Beat two: he lands, compresses, and the card gives under him. The
      // first placement has no flight to wait for (he is put down, not
      // thrown), and reduce motion has no flight at all.
      const flight = placed.current && !pinned ? CARD_SINK_MS : 0;
      placed.current = true;
      if (landingTimer.current) clearTimeout(landingTimer.current);
      landingTimer.current = setTimeout(() => {
        activeRef.current = choice.index;
        setActiveIndex(choice.index);
        // He goes down with it, in the same commit, by exactly the same
        // amount — `nextY` is where the perch's top line ends up, so his feet
        // stay on it. Anything that lets these two land on different frames
        // puts him back in mid-air waiting for a card to arrive under him.
        setTarget({ ...landing.perch, y: choice.nextY, arrival: "sag" });
        if (choice.roomAboveViewport > 0) {
          // Hold the page still: the room above the viewport is going away, so
          // the offset comes down by exactly as much and nothing on screen moves
          // except the card he is landing on.
          scroll.current?.scrollTo({ y: choice.scrollBase, animated: false });
          setSettledScrollY(choice.scrollBase);
        }
        // Two frames, because a room only becomes a position once layout has
        // run: measuring straight after the commit still reports the old one on
        // native. He keeps standing where he was until then.
        reflowFrame.current = requestAnimationFrame(() => {
          reflowFrame.current = requestAnimationFrame(() => {
            awaitingReflow.current = false;
            setRevision((n) => n + 1);
          });
        });
      }, flight);
    });

    return () => {
      cancelled = true;
    };
  }, [revision, settledScrollY, pinned, clearance, rooms]);

  return { stackRef, scrollRef, perchProps, onScroll, target };
}

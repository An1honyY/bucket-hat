import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, View } from "react-native";
import { mascotFeetOffset } from "./Mascot";

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
   * Attach to each spot he may stand on, top to bottom. Declare these
   * deliberately — a perch is somewhere the screen *knows* has room above it,
   * not simply the next card down. Deriving one per card put him over the
   * hourly forecast strip, because every card but the first has content
   * pressed right against its top edge.
   */
  perchProps: (index: number, align?: PerchAlign) => { ref: (node: View | null) => void; onLayout: () => void };
  /** Attach to the ScrollView, along with `scrollEventThrottle={16}`. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Where he should be standing now. Null until the first card has been measured. */
  target: Perch | null;
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

/** Where his box's left edge goes, for a perch of this width. */
export function perchOffsetX(perch: Perch, size: number): number {
  if (perch.align === "left") return perch.x;
  if (perch.align === "right") return perch.x + perch.width - size;
  return perch.x + perch.width / 2 - size / 2;
}

/**
 * @param size the rendered mascot size, which decides how much clearance a
 *   card needs above it before he can stand there.
 * @param pinned keeps him on the first perch and never moves him — what
 *   reduce motion asks for, since a hop is motion however short.
 */
export function useMascotPerches(size: number, pinned: boolean): MascotPerches {
  const stack = useRef<View | null>(null);
  const nodes = useRef<Map<number, { node: View; align: PerchAlign }>>(new Map());
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [target, setTarget] = useState<Perch | null>(null);
  // Bumped whenever a card reports a layout, which is the cue to re-measure.
  const [revision, setRevision] = useState(0);
  const [settledScrollY, setSettledScrollY] = useState(0);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
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

  const perchProps = useCallback(
    (index: number, align: PerchAlign = "center") => ({
      ref: (node: View | null) => {
        if (node) nodes.current.set(index, { node, align });
        else nodes.current.delete(index);
      },
      onLayout: () => setRevision((n) => n + 1),
    }),
    []
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
    if (!container) return;

    const indices = [...nodes.current.keys()].sort((a, b) => a - b);
    Promise.all(
      indices.map((i) => {
        const entry = nodes.current.get(i)!;
        return measureAgainst(entry.node, container, entry.align);
      })
    ).then((measured) => {
      if (cancelled) return;
      const perches = measured.filter((p): p is Perch => p !== null);
      if (perches.length === 0) return;
      if (pinned) {
        setTarget(perches[0]);
        return;
      }
      const clearance = mascotFeetOffset(size);
      // The first card with enough room above it to show him in full. Falls
      // back to the last one, so scrolling to the bottom doesn't strand him up
      // the page where nobody can see him.
      const found = perches.findIndex((p) => p.y - clearance >= settledScrollY);
      setTarget(perches[found === -1 ? perches.length - 1 : found]);
    });

    return () => {
      cancelled = true;
    };
  }, [revision, settledScrollY, pinned, size]);

  return { stackRef, perchProps, onScroll, target };
}

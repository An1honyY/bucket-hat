// The geometry behind the mascot's perches — pure, and deliberately free of
// React and Reanimated.
//
// Split out of `useMascotPerches` when the hook grew an animated margin: that
// import chain reaches react-native-worklets, which does not load under
// jest-expo, and it took the whole tested surface down with it. These are the
// parts worth testing anyway; the hook is the wiring around them.

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

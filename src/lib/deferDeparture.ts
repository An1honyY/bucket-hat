// "Leave now" when nothing is running — docs/05-data-wiring.md §5.6.
//
// Ask for a bus at 12:08 am and Google answers honestly: walk 23 minutes to
// the stop, wait 5 h 21 min, catch the 5:52. Every number in that is correct
// and the itinerary as a whole is a fiction — nobody walks to a bus stop at
// half past midnight to stand there until dawn. Left alone it poisons
// everything downstream: the journey claims to take 6 h 34 min, the leave-by
// notification fires immediately, the gear engine dresses you for five hours
// of standing in the wind, and the weather shown for the walk is midnight's
// rather than the weather at the hour you'd actually walk.
//
// What every transit app does instead is anchor the journey to the *service*:
// Google Maps says "Departs 5:52 AM", Citymapper says "Next departure", and
// the walk is scheduled backwards from it. That's what this does — the ride
// stays exactly where Google put it, and the departure moves to meet it.
//
// Doing it here, on the assembled legs before times and forecasts are
// stamped, means every consumer is fixed at once rather than each one
// learning to special-case an implausible wait.

/**
 * Past this, a wait has stopped being a wait and become a later departure.
 *
 * Under it, waiting is a real thing people do — you leave a margin for a bus,
 * and a 20-minute gap at a stop is an ordinary part of a trip that the app
 * should show and dress you for. Beyond it nobody stands at the stop; they
 * leave later. 45 minutes is about where that flips.
 */
export const LONG_WAIT_MIN = 45;

/**
 * What's left of the wait after deferring — the margin you'd actually want at
 * the stop, rather than arriving on the dot and watching it pull away.
 */
export const PLATFORM_BUFFER_MIN = 5;

export interface DeferrableLeg {
  mode: string;
  durationMin: number;
  isStationary?: boolean;
}

/** Modes that mean the journey is genuinely under way — you are on board
 *  something, and the departure is behind you. */
const RIDING_MODES = new Set(["bus", "train", "drive"]);

export interface DeferralResult<T extends DeferrableLeg> {
  legs: T[];
  /** The departure the journey should actually use. */
  departTime: string;
  /**
   * Set only when a deferral happened: what the user originally asked for,
   * so the UI can say the departure moved rather than silently moving it.
   */
  deferredFrom?: string;
  /** Minutes the departure moved by. */
  deferredByMin?: number;
}

/**
 * Moves the departure forward when the journey opens with a wait so long that
 * nobody would sit through it.
 *
 * Only the *leading* wait qualifies — the one before anything has moved.
 * A long wait mid-journey is a transfer: you're already out, the departure is
 * behind you, and shifting it would move a bus you've already caught. Those
 * are left exactly as they are (and are genuinely worth dressing warmly for,
 * which is why the gear engine still sees them).
 *
 * The wait itself isn't deleted, only cut back to `PLATFORM_BUFFER_MIN`; the
 * absolute time the service leaves is unchanged, because the departure moves
 * by exactly what the wait gave up.
 */
export function deferToFirstService<T extends DeferrableLeg>(legs: T[], departTime: string): DeferralResult<T> {
  const unchanged: DeferralResult<T> = { legs, departTime };

  const waitIndex = legs.findIndex((leg) => leg.isStationary === true);
  if (waitIndex === -1) return unchanged;

  // Anything before the wait has to be the approach to it. A ride in front
  // means this is a transfer: the journey is under way, and moving its
  // departure would move a service already caught.
  if (legs.slice(0, waitIndex).some((leg) => RIDING_MODES.has(leg.mode))) return unchanged;

  const wait = legs[waitIndex];
  if (wait.durationMin < LONG_WAIT_MIN) return unchanged;

  const shiftMin = wait.durationMin - PLATFORM_BUFFER_MIN;
  if (shiftMin <= 0) return unchanged;

  const shifted = legs.map((leg, i) => (i === waitIndex ? { ...leg, durationMin: PLATFORM_BUFFER_MIN } : leg));
  const departMs = new Date(departTime).getTime();
  if (!Number.isFinite(departMs)) return unchanged;

  return {
    legs: shifted,
    departTime: new Date(departMs + shiftMin * 60_000).toISOString(),
    deferredFrom: departTime,
    deferredByMin: shiftMin,
  };
}

/**
 * A long wait the deferral deliberately left alone — a transfer you'll be
 * standing through for real, so the journey should say so rather than let it
 * sit unremarked in the middle of the leg list.
 *
 * Returns the wait's length in minutes, or undefined when there isn't one.
 */
export function longTransferWaitMin(legs: readonly DeferrableLeg[]): number | undefined {
  let ridden = false;
  for (const leg of legs) {
    if (RIDING_MODES.has(leg.mode) && !leg.isStationary) ridden = true;
    if (leg.isStationary && ridden && leg.durationMin >= LONG_WAIT_MIN) return leg.durationMin;
  }
  return undefined;
}

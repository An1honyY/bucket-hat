// How long something takes, in the units a person would say it in.
//
// Everything in this app measures durations in minutes, and every screen
// printed them raw — "95 min" for a journey, "127 min left". Past an hour
// that stops being a quantity anyone reads and becomes one they have to do
// arithmetic on. Below an hour, minutes are exactly right and "0 h 45 min"
// would be worse, so the hour part only appears when there is one.

/**
 * "45 min", "1 h 25 min", "2 h".
 *
 * Rounds to whole minutes and never returns "0 min" — anything under half a
 * minute still took *some* time, and a journey leg that claims to take none
 * reads as a bug.
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/** The same figure spoken rather than abbreviated, for accessibility labels
 *  (§9.6) — a screen reader saying "h" as a letter is not a duration. */
export function spokenDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const hourPart = hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : "";
  const minPart = mins > 0 ? `${mins} minute${mins === 1 ? "" : "s"}` : "";
  return [hourPart, minPart].filter(Boolean).join(" ");
}

// Default names for the things the user shouldn't have to name.
//
// Both a saved location and a saved journey have a label, and both already
// have something perfectly serviceable to be called: an address, or the two
// ends of the route. Requiring a name before either can be saved makes the
// user invent "Countdown Ponsonby" when the address already says that, so
// the label field is optional everywhere and these fill the gap.
//
// Kept here rather than in either form because the same default has to be
// derivable later: SavedJourneysScreen checks whether a route is *still*
// using its default label before deciding what to show as the subtitle, and
// a default computed in two places is a default that drifts.

/**
 * The short, human name inside a formatted address — "12 Queen Street" out
 * of "12 Queen Street, Auckland CBD, Auckland 1010, New Zealand".
 *
 * Google's formatted addresses put the most specific component first, which
 * is the part a person would actually say. Falls back to the whole string
 * when there's no comma to cut on (a bare place name), and returns "" for
 * nothing, so callers can treat the empty case as "still unnamed."
 */
export function shortAddressLabel(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length === 0) return "";
  const first = trimmed.split(",")[0]?.trim();
  return first && first.length > 0 ? first : trimmed;
}

/** The name a saved journey takes when the user doesn't give it one. */
export function defaultRouteLabel(originLabel: string, destinationLabel: string): string {
  return `${originLabel} → ${destinationLabel}`;
}

/**
 * The label to actually store for a location, given whatever the user typed.
 *
 * The default is resolved here, at save time, rather than left null in the
 * database and filled in by every reader. `SavedLocation.label` stays a
 * required non-empty string, so nothing downstream — the pickers, the route
 * subtitle, the accessibility labels, the sync payload — has to learn about
 * an unnamed location. The cost is that renaming the address later won't
 * re-derive the label, which is the right trade: by then it *is* the name
 * the user knows the place by.
 */
export function resolveLocationLabel(typedLabel: string, address: string): string {
  return typedLabel.trim() || shortAddressLabel(address);
}

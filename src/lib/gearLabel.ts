// docs/09-design-system.md §9.0.1 — how a gear pick's name is capitalised
// where it's displayed.
//
// Two different jobs, deliberately kept apart:
//
//  - The app's own generic labels ("Warm jacket", "Gloves and a hat") are
//    written in sentence case in recommend.ts. They read as names of things
//    in the UI — they sit in a list beside real garments — so they're
//    title-cased for display.
//  - The user's own item names are *theirs*. §9.0 is explicit that gear keeps
//    the user's names wherever it's surfaced, so these only ever get their
//    first character raised, never interior words. Title-casing them would
//    turn "REI down jacket" into "Rei Down Jacket" and "M's Nano Puff" into
//    something its owner didn't write.
//
// Capitalising at display time rather than rewriting the strings in
// recommend.ts keeps the engine's output stable for tests and notifications,
// and handles the labels that are assembled at runtime from a noun plus a
// reason clause.

// Lowercase in the middle of a title: articles, coordinating conjunctions and
// short prepositions. "Gloves and a Hat", not "Gloves And A Hat".
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "nor",
  "of", "on", "or", "per", "the", "to", "v", "via", "vs", "with",
]);

/** The explanation after an em dash stays as written — it's a sentence, not a
 *  name. "Waterproof shoes — mind the puddles" must not become "Mind The
 *  Puddles". */
const CLAUSE_SEPARATOR = " — ";

function titleCaseWord(word: string, isFirst: boolean): string {
  if (word.length === 0) return word;
  const lower = word.toLowerCase();
  // Anything with an interior capital or a digit is already deliberate
  // (a brand, a model, "3-in-1") — leave it exactly as it came in.
  if (/[A-Z0-9]/.test(word.slice(1))) return word;
  if (!isFirst && MINOR_WORDS.has(lower)) return lower;
  return word[0].toUpperCase() + word.slice(1);
}

/** Title-case a phrase the app itself authored. */
export function titleCaseGearPhrase(phrase: string): string {
  return phrase
    .split(" ")
    .map((word, i) => titleCaseWord(word, i === 0))
    .join(" ");
}

/**
 * Display form of an app-authored gear label. Only the leading noun phrase is
 * title-cased; any " — explanation" clause is left alone.
 */
export function displayGearLabel(label: string): string {
  const [head, ...rest] = label.split(CLAUSE_SEPARATOR);
  const titled = titleCaseGearPhrase(head);
  return rest.length === 0 ? titled : [titled, ...rest].join(CLAUSE_SEPARATOR);
}

/**
 * Display form of a name the *user* typed. Raises the first character if it
 * is lowercase and leaves everything else untouched.
 */
export function displayItemName(name: string): string {
  if (name.length === 0) return name;
  return name[0].toUpperCase() + name.slice(1);
}

/**
 * A recommendation pick as it should appear on screen, routed to the right
 * rule by whether it's a real owned item or one of the engine's fallbacks.
 *
 * `GearRecommendationCard` and `RightNowCard` each had their own identical
 * copy of this; History and Today's journey card inlined the same ternary.
 * One place, so the capitalisation rule can't drift between the four screens
 * that show the same pick.
 */
export function gearPickLabel(
  pick: { name: string } | { fallbackText: string }
): { text: string; isFallback: boolean } {
  return "name" in pick
    ? { text: displayItemName(pick.name), isFallback: false }
    : { text: displayGearLabel(pick.fallbackText), isFallback: true };
}

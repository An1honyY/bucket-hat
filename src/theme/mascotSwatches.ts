import type { MascotSwatch } from "../types";

// docs/09-design-system.md §9.7 — each `MascotSwatch` maps to one fixed hex,
// kept beside the design tokens rather than in the component, so every tint is
// pre-verified against the mascot's own outline and shading.
//
// These are garment colours, not palette colours: they name what a real jacket
// looks like, so they deliberately don't come from `tokens.ts`. Pulling
// `accentWalk` in for "pink" would make the wardrobe change hue with the
// weather mood, which is the opposite of the point — your red coat is red on a
// cold day too.
//
// All twelve are muted a little from their pure form. A saturated primary next
// to the mascot's slate body reads as a UI element that has landed on the
// character rather than as clothing on it, and at 64pt the small slots need to
// hold their shape against the outline rather than glow.
export const MASCOT_SWATCH_HEX: Record<MascotSwatch, string> = {
  black: "#2B2E3A",
  white: "#F2F0F5",
  grey: "#9A9AA8",
  navy: "#2E3A6B",
  blue: "#3D7CC9",
  red: "#C4433F",
  orange: "#DE7B3A",
  yellow: "#E8B93C",
  green: "#4E9463",
  purple: "#7E57C2",
  pink: "#D96A96",
  brown: "#8A6244",
};

/** §13.9 — an item with no `color` set renders a neutral placeholder rather
 *  than guessing or omitting the overlay. `color` is a Phase 21 field, so most
 *  existing wardrobes have none of it and the mascot must not look broken for
 *  someone who never goes back to tag anything. */
export const MASCOT_NEUTRAL = "#8E8EA0";

/** The stroke drawn around every garment slot, so a light swatch (white, or
 *  the neutral) still reads as a distinct piece of clothing against the
 *  mascot's pale belly instead of dissolving into it. */
export const MASCOT_GARMENT_OUTLINE = "#1E2033";

/**
 * Resolve a slot's fill. Anything unrecognised — a swatch value from a future
 * version, or a corrupt row — falls back to neutral rather than throwing:
 * §9.7 requires this to fail silently to the placeholder, since it's a pure
 * delight feature and a broken mascot must never become an error the user has
 * to deal with.
 */
export function mascotSwatchHex(swatch: MascotSwatch | undefined): string {
  if (!swatch) return MASCOT_NEUTRAL;
  return MASCOT_SWATCH_HEX[swatch] ?? MASCOT_NEUTRAL;
}

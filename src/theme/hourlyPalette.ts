import type { WeatherIconKind } from "../components/WeatherIcon";
import { conditionColorForIcon } from "./conditionColor";
import { darkTheme, lightTheme, type ThemeTokens } from "./tokens";

// docs/09-design-system.md §9.5 — the two palettes an hourly strip's cells
// take, one for the hours either side of sunrise and sunset.
//
// The first attempt tinted the day block a mid navy (a step lighter than the
// card) and left the contents coloured from the active theme. That put the
// blue half of the condition palette — drizzle, rain, heavy rain — on a blue
// background at barely 1.4:1, so the icons this strip exists to show
// disappeared exactly when it was raining. Nudging the tint doesn't fix it:
// `sun` is a gold that needs a dark backdrop and `rain` is a blue that needs
// a light one, so no single mid-tone serves both.
//
// So a cell commits: a day cell *is* a light surface and takes the light
// token set; a night cell *is* a dark surface and takes the dark one —
// whichever theme the app itself is in. That's why each palette carries its
// whole `tokens` object rather than a handful of colours: the icon, the rain
// fill and the text all resolve from the same set, so every one of them is
// read against the surface it was designed for.
//
// Living in the theme layer rather than in the component is deliberate:
// §9.1 forbids a *component* from importing darkTheme/lightTheme directly,
// and this is the one legitimate need for both at once.
export interface HourlyCellPalette {
  bg: string;
  text: string;
  muted: string;
  /** The unfilled part of the droplet — a hollow, visible against `bg`. */
  dropletEmpty: string;
  tokens: ThemeTokens;
  /**
   * Per-glyph colours for this surface, where the token's own value doesn't
   * carry on it. Every entry below was measured against `bg`, not guessed,
   * and each keeps its token's hue — this is a legibility adjustment, never
   * a change of meaning (§9.6 still pairs every glyph with a label).
   */
  iconOverrides?: Partial<Record<WeatherIconKind, string>>;
}

// Not the light theme's own `surface`: a daylight hour should read as sky,
// and pure white next to the night block looks like a hole rather than a
// time of day.
export const DAY_CELL: HourlyCellPalette = {
  bg: "#E8EDFA",
  text: lightTheme.textPrimary,
  muted: lightTheme.textSecondary,
  dropletEmpty: "#95A7C9",
  tokens: lightTheme,
  // Measured against #E8EDFA: gold 2.3, teal 3.0, drizzle-blue 3.7, snow-cyan
  // 3.7 — all of them thin 1.8px strokes at 16px, which is where a "passes
  // 3:1" number stops meaning "you can see it". Deepened to ~5:1 each.
  // Heavy rain (6.2), cloud (4.7) and storm (4.7) already carried.
  iconOverrides: { sun: "#8F6205", wind: "#0A7264", drizzle: "#1A5F9C", snow: "#0E657E" },
};

// Night, not midnight: the first version was #121734, near enough to black
// that the strip read as a hole punched in the card. This is a step *down*
// from the dark theme's own surface rather than a plunge away from it, and
// still reads as after-dark against the light theme's white card.
export const NIGHT_CELL: HourlyCellPalette = {
  bg: "#1E2549",
  text: darkTheme.textPrimary,
  muted: darkTheme.textSecondary,
  dropletEmpty: "#4A5494",
  tokens: darkTheme,
  // Lightening the background costs the darkest glyphs their contrast:
  // measured against #1E2549, heavy rain fell to 3.1 and cloud to 3.1.
  // Lifted to ~5:1, same hues.
  iconOverrides: { rain: "#7BA5F0", cloud: "#9299BD", moon: "#A47DFF" },
};

export function hourlyCellPalette(isNight: boolean): HourlyCellPalette {
  return isNight ? NIGHT_CELL : DAY_CELL;
}

/** The condition colour for one glyph, read against the cell it sits on. */
export function hourlyIconColor(cell: HourlyCellPalette, kind: WeatherIconKind): string {
  return cell.iconOverrides?.[kind] ?? conditionColorForIcon(cell.tokens, kind);
}

// docs/09-design-system.md §9.2 — the type scale/spacing-unit/radius the
// doc describes but that never became real code tokens (every screen was
// hardcoding its own raw numbers, which had already drifted — see
// DECISIONS.md, UI/UX polish pass 2). Theme-independent (unlike
// src/theme/tokens.ts's colors), so kept as a separate flat file rather
// than folded into ThemeTokens.
//
// 2026-08-09 refresh: the scale gained a `display` step, explicit
// lineHeight/letterSpacing on every role, and an `eyebrow`. The reason is
// specific to this app rather than general polish — its content is almost
// entirely *numbers* (departure times, durations, degrees, wind speeds),
// and numbers were being set in the same proportional face at the same
// tracking as prose. See NUMERIC below.
import type { TextStyle } from "react-native";

/** Numbers that sit in a column, tick upward, or get compared against each
 *  other — clock times, temperatures, durations, wind speeds. Proportional
 *  digits make a time change width as it ticks (1 is narrower than 8), so a
 *  row of times reads as ragged and a live-updating one visibly jitters.
 *  Spread this *after* a TYPE role, never instead of one. */
// Typed as TextStyle rather than `as const`: an `as const` here makes
// `fontVariant` a readonly tuple, which RN's own TextStyle (a mutable
// FontVariant[]) then rejects at every spread site.
export const NUMERIC: TextStyle = {
  fontVariant: ["tabular-nums"],
};

export const TYPE = {
  /** One number per screen, at most — the fact you came to read. Negative
   *  tracking because system faces set large sizes too loosely by default. */
  display: { fontSize: 34, fontWeight: "700", lineHeight: 38, letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: "700", lineHeight: 27, letterSpacing: -0.3 },
  subtitle: { fontSize: 17, fontWeight: "600", lineHeight: 22, letterSpacing: -0.1 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: "500", lineHeight: 14, letterSpacing: 0.2 },
  /** Small label *above* a block, naming what follows. Uppercase and widely
   *  tracked so it reads as a signpost at a glance and never competes with
   *  the content underneath it. Pair with `textSecondary`. */
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Between one section of a screen and the next — the scale stopped at 24,
   *  so screens separated whole sections by the same gap a card used
   *  internally and everything read as one undifferentiated column. */
  xxxl: 32,
} as const;

export const RADIUS = {
  pill: 10,
  card: 16,
  circle: 999,
} as const;

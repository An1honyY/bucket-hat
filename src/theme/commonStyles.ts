import { useMemo } from "react";
import { StyleSheet } from "react-native";
import useTheme from "./useTheme";
import { cardElevationStyle, onTonal, tonalFillAlpha, withAlpha, type ThemeTokens } from "./tokens";
import { NUMERIC, RADIUS, SPACING, TYPE } from "./typography";

// docs/09-design-system.md §9.2 — the layout half of the design tokens.
// typography.ts already gave the app one type scale/spacing unit/radius set;
// this gives it one set of *shapes* built from them, so a card, a screen's
// scroll body, a section heading and an action button look the same wherever
// they appear instead of every screen re-deriving them from raw numbers.
//
// The width caps are the reason this file exists at all: React Native lays a
// screen out at whatever width it's given, so on a tablet or the web build a
// "full width" button became a 1200px-wide slab and a form's label/control
// row stretched to opposite edges. Content gets a readable measure, actions
// get a thumb-sized one, and both centre in whatever space is left.

/** Readable measure for a screen's scrolling content (§9.2). */
export const CONTENT_MAX_WIDTH = 600;

/** Width cap for a "full width" action. Wider than this and a button stops
 *  reading as a button — and on a large screen it's a long way for a cursor
 *  or thumb to travel to hit something whose text sits in the middle. */
export const ACTION_MAX_WIDTH = 420;

// §9.1 (2026-08-09) — the selected state for a chip or segment, in one place.
//
// Nine files had declared `{ backgroundColor: accentWalk, borderColor:
// accentWalk }` with a white bold label, independently and identically. The
// duplication was the smaller problem: a screen like Plan shows three of
// these rows at once (mode, dress code, spare layer), so a full-strength
// accent fill on each meant five or six "primary" elements competing on one
// screen — and then the actual primary action, "Plan journey," had no way to
// outrank them.
//
// Tonal instead: the accent as a wash, an accent border, and an accent label.
// Selection is still carried by three things at once (fill, border, weight),
// so §9.6's "never by colour alone" holds exactly as it did before.
export function selectedChipStyle(theme: ThemeTokens) {
  return {
    backgroundColor: withAlpha(theme.accentWalk, tonalFillAlpha(theme.isLight)),
    borderColor: theme.accentWalk,
  } as const;
}

export function selectedChipLabelStyle(theme: ThemeTokens) {
  return { color: onTonal(theme.accentWalk, theme.isLight), fontWeight: "600" } as const;
}

export function getCommonStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    // ---- screen scaffolding ----
    screen: { flex: 1, backgroundColor: theme.bg },
    /** contentContainerStyle for a screen-level ScrollView/FlatList. */
    scrollContent: {
      padding: SPACING.xl,
      paddingBottom: SPACING.xxl * 2,
      width: "100%",
      maxWidth: CONTENT_MAX_WIDTH,
      alignSelf: "center",
    },
    /** Same measure, for content that isn't itself the scroll container. */
    measure: { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },

    // ---- content boxes (§9.0's shadow-based elevation) ----
    card: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      borderWidth: theme.surfaceRaisedBorder === "transparent" ? 0 : 1,
      borderColor: theme.surfaceRaisedBorder,
      ...cardElevationStyle(theme),
    },
    cardRaised: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      borderWidth: theme.surfaceRaisedBorder === "transparent" ? 0 : 1,
      borderColor: theme.surfaceRaisedBorder,
      ...cardElevationStyle(theme),
    },

    // ---- text roles ----
    /** The small label above a card, not inside it. Now a true eyebrow
     *  (§9.2, 2026-08-09): uppercase and tracked, so it signposts the block
     *  below without competing with it. It previously used `caption` at
     *  weight 600, which sat close enough to real body copy to read as
     *  content rather than as a label. */
    sectionLabel: {
      ...TYPE.eyebrow,
      color: theme.textSecondary,
      marginBottom: SPACING.sm,
    },
    cardTitle: { ...TYPE.subtitle, color: theme.textPrimary },
    title: { ...TYPE.title, color: theme.textPrimary },
    body: { ...TYPE.body, color: theme.textPrimary },
    caption: { ...TYPE.caption, color: theme.textSecondary },

    // ---- numbers ----
    // The app's actual content: clock times, degrees, durations, wind
    // speeds. These carry tabular figures so a column of them aligns and a
    // ticking one doesn't jitter (NUMERIC, typography.ts).
    /** The one number a screen exists to show — a departure time, the
     *  current temperature. At most one per screen. */
    displayNumber: { ...TYPE.display, ...NUMERIC, color: theme.textPrimary },
    /** Any other figure sitting inline with text. */
    numeric: { ...NUMERIC },
    emptyText: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },

    // ---- form fields ----
    // Every add/edit form had its own copy of these two, identical apart
    // from drift in the padding and the font size.
    fieldLabel: { ...TYPE.caption, color: theme.textSecondary, marginBottom: SPACING.xs },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      minHeight: 44,
      ...TYPE.body,
      color: theme.textPrimary,
      backgroundColor: theme.bg,
    },

    // ---- small recurring pieces ----
    hairline: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
    /** Two actions side by side (Cancel / Save). Pair with AppButton's
     *  `layout="inline"` so neither one gets the block width cap. */
    actionRow: { flexDirection: "row", gap: SPACING.md, alignItems: "center" },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.pill,
      backgroundColor: theme.surface,
    },
  });
}

export default function useCommonStyles() {
  const theme = useTheme();
  return useMemo(() => getCommonStyles(theme), [theme]);
}

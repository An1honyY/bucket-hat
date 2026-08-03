import { useMemo } from "react";
import { StyleSheet } from "react-native";
import useTheme from "./useTheme";
import { cardElevationStyle, type ThemeTokens } from "./tokens";
import { RADIUS, SPACING, TYPE } from "./typography";

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
    /** The small all-caps-weight label above a card, not inside it. */
    sectionLabel: {
      ...TYPE.caption,
      fontWeight: "600",
      color: theme.textSecondary,
      marginBottom: SPACING.sm,
    },
    cardTitle: { ...TYPE.subtitle, color: theme.textPrimary },
    title: { ...TYPE.title, color: theme.textPrimary },
    body: { ...TYPE.body, color: theme.textPrimary },
    caption: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 18 },
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

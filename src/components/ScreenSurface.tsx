import { useContext, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { HeaderShownContext } from "@react-navigation/elements";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import useTheme from "../theme/useTheme";
import ScreenPattern from "./ScreenPattern";

// Every screen's root: the themed background colour, the sky pattern behind
// the content, and the safe-area inset, in one place.
//
// ScreenPattern's own header comment always claimed it was "the wash behind
// every screen", but only Today, onboarding and the auth screens actually
// rendered it — so most of the app was a flat slab while a handful of screens
// had a sky. Every screen was also re-declaring the same
// `{ flex: 1, backgroundColor: theme.bg }` container style, which is exactly
// the kind of duplication §9.2's shared-styles pass exists to remove.
//
// No `tint` prop: useTheme() already carries the ambient weather mood
// (§9.1.3), so `theme.bg` and ScreenPattern's default `theme.patternTint`
// move together on their own. A screen that wanted to pass its own tint here
// would be the one screen out of step with the rest of the app.

// Which edges this screen still has to inset for, given what React Navigation
// has already drawn around it. See DECISIONS.md 2026-08-05.
//
// The 2026-07-30 entry assumed React Navigation hands each screen a
// safe-area context already reduced by the header and tab bar. It doesn't —
// nothing in these packages overrides `SafeAreaInsetsContext`, so
// `useSafeAreaInsets()` reports the full device inset no matter how much
// chrome sits between the screen and the physical edge. Applying all four
// edges unconditionally therefore double-counted the top under every header.
//
// That entry's *instinct* was right, though: hand-picking `edges` per screen
// duplicates the arithmetic and goes stale the moment a screen's header
// option changes. So this derives it instead, from the two contexts that
// state what's actually on screen:
//
//   - HeaderShownContext — true when a header (this navigator's or a
//     parent's) is drawn above. The header sets its own
//     `headerStatusBarHeight` from insets.top, so it already owns that space.
//   - BottomTabBarHeightContext — a number inside a tab navigator, undefined
//     outside one. The tab bar pads itself by insets.bottom and sits below
//     the scene, so the scene never reaches the home indicator.
//
// Left/right stay on always: they're 0 in portrait (which this app is locked
// to) and correct if that ever changes.
//
// Note this governs *chrome* spacing only. The breathing room at the end of a
// scroll is `scrollContent`'s paddingBottom in commonStyles.ts — that lives
// inside the ScrollView, scrolls with the content, and is deliberate: it's
// what makes "you've reached the end" legible. Don't reach for an inset to
// get that effect, and don't read this change as removing it.
// Exported as a pure function purely so it can be tested: on the web build
// every inset is 0, so a rendered check can never tell a correct edge set
// from a wrong one. See ScreenSurface.test.ts.
export function chromeAwareEdges(headerShown: boolean, tabBarHeight: number | undefined): Edge[] {
  const edges: Edge[] = ["left", "right"];
  if (!headerShown) edges.push("top");
  if (tabBarHeight === undefined) edges.push("bottom");
  return edges;
}

function useChromeAwareEdges(): Edge[] {
  return chromeAwareEdges(useContext(HeaderShownContext), useContext(BottomTabBarHeightContext));
}

interface Props {
  children: ReactNode;
  /** Escape hatch. Leave unset — the edges are derived from the surrounding
   *  header/tab-bar context, which is right for every screen in the app
   *  today. Only pass this for a screen that deliberately draws under chrome
   *  the contexts can't see. */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export default function ScreenSurface({ children, edges, style }: Props) {
  const theme = useTheme();
  const derivedEdges = useChromeAwareEdges();
  return (
    <SafeAreaView style={[styles.surface, { backgroundColor: theme.bg }, style]} edges={edges ?? derivedEdges}>
      <ScreenPattern />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1 },
});

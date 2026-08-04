import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
interface Props {
  children: ReactNode;
  /** Passed through to SafeAreaView; screens under a navigation header pass
   *  `["bottom"]` so the inset isn't applied twice. */
  edges?: React.ComponentProps<typeof SafeAreaView>["edges"];
  style?: StyleProp<ViewStyle>;
}

export default function ScreenSurface({ children, edges, style }: Props) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.surface, { backgroundColor: theme.bg }, style]} edges={edges}>
      <ScreenPattern />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1 },
});

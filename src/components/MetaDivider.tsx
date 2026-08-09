import { StyleSheet, View } from "react-native";
import useTheme from "../theme/useTheme";

// docs/09-design-system.md §9.2 — the divider between peer facts in a summary
// row: duration | modes | temperature | AC.
//
// These were middots, which were removed on request. Replacing them with bare
// whitespace didn't hold up: a gap has to be large enough to read as a
// boundary, and at that size the row stopped looking like one line of related
// facts and started looking like items that had drifted apart — while *still*
// being ambiguous about where one fact ended, because the groups have their
// own internal gaps too.
//
// A hairline rule is a divider rather than punctuation. It gives the row a
// crisp rhythm at any gap size, so the spacing can come back down to
// something that reads as one line, and unlike a dot it doesn't sit on the
// text baseline pretending to be a character.
//
// Deliberately short and dim: it's structure, not content, and it must never
// compete with the figures either side of it.
const HEIGHT = 12;

export default function MetaDivider() {
  const theme = useTheme();
  return <View style={[styles.rule, { backgroundColor: theme.border }]} accessibilityElementsHidden importantForAccessibility="no" />;
}

const styles = StyleSheet.create({
  rule: {
    width: StyleSheet.hairlineWidth < 1 ? 1 : StyleSheet.hairlineWidth,
    height: HEIGHT,
    borderRadius: 1,
  },
});

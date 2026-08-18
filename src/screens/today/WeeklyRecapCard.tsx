import { Pressable, StyleSheet, Text, View } from "react-native";
import ActionIcon from "../../components/ActionIcon";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

// Phase 13's weekly recap — docs/13-extended-features.md §13.1. One line, at
// the top of Today, once a week.
//
// Deliberately the quietest card on the screen: it is the only thing here
// that is about the past, and it sits above the "Right now" card someone
// opened the app to read. Hence a caption-weight line on the flat `surface`
// rather than the raised, padded treatment the two forecast cards use — it
// reads as a note pinned above them, not as a third thing competing with
// them.

interface Props {
  line: string;
  onDismiss: () => void;
}

export default function WeeklyRecapCard({ line, onDismiss }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.card}>
      <Text style={styles.line}>{line}</Text>
      <Pressable
        onPress={onDismiss}
        style={styles.dismiss}
        // §9.6's 44pt target, with the icon itself kept small — the tap area
        // is padding, not a bigger glyph.
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss this week's recap"
      >
        <ActionIcon kind="close" size={16} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      // No vertical padding of its own: the dismiss button's own 44pt target
      // sets the height, and adding padding on top of it made a one-line note
      // as tall as a card with something in it.
      paddingVertical: SPACING.xs,
      paddingLeft: SPACING.lg,
      paddingRight: SPACING.sm,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      marginBottom: SPACING.lg,
      ...cardElevationStyle(theme),
    },
    line: { ...TYPE.caption, color: theme.textSecondary, flex: 1, lineHeight: 20 },
    dismiss: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  });
}

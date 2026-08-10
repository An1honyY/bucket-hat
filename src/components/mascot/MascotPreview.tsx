import { ScrollView, StyleSheet, Text, View } from "react-native";
import MascotArt from "./MascotArt";
import useTheme from "../../theme/useTheme";
import { TYPE, SPACING } from "../../theme/typography";

// TEMPORARY — a bench for looking at the mascot's poses and outfit slots side
// by side while the art is being drawn. Not wired into any route; deleted once
// the character is settled. Kept as a file rather than a scratch edit to
// TodayScreen so nothing user-facing has to be reverted afterwards.
const CASES: { label: string; props: React.ComponentProps<typeof MascotArt> }[] = [
  { label: "bare", props: { size: 120 } },
  { label: "jacket", props: { size: 120, outfit: { jacket: { swatch: "red" } } } },
  { label: "untagged", props: { size: 120, outfit: { jacket: {} } } },
  {
    label: "full",
    props: {
      size: 120,
      outfit: { jacket: { swatch: "green" }, bottoms: { swatch: "navy" }, umbrella: { swatch: "yellow" } },
    },
  },
  { label: "wave", props: { size: 120, pose: { leftArmDeg: -70 } } },
  { label: "shiver", props: { size: 120, pose: { breath: true, eyes: "narrow" } } },
  { label: "squint", props: { size: 120, pose: { eyes: "narrow", rightArmDeg: -95 } } },
  { label: "blink", props: { size: 120, pose: { eyes: "closed" } } },
  {
    label: "huddle",
    props: { size: 120, outfit: { umbrella: { swatch: "blue" } }, pose: { leanDeg: -8 } },
  },
  {
    label: "windy",
    props: { size: 120, outfit: { scarf: { swatch: "pink" } }, pose: { scarfDeg: -35 } },
  },
  { label: "warm", props: { size: 120, pose: { sweat: true, rightArmDeg: 40 } } },
  { label: "at 64", props: { size: 64, outfit: { jacket: { swatch: "purple" } } } },
  {
    label: "BIG full",
    props: {
      size: 260,
      outfit: { jacket: { swatch: "green" }, bottoms: { swatch: "navy" }, umbrella: { swatch: "yellow" } },
    },
  },
  {
    label: "BIG huddle",
    props: {
      size: 260,
      outfit: { umbrella: { swatch: "blue" }, jacket: { swatch: "navy" } },
      pose: { leanDeg: -8, rightArmDeg: -28 },
    },
  },
  {
    label: "BIG grip test",
    props: { size: 260, outfit: { umbrella: { swatch: "red" } }, pose: { rightArmDeg: -40 } },
  },
];

export default function MascotPreview() {
  const theme = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {CASES.map(({ label, props }) => (
        <View key={label} style={[styles.cell, { borderColor: theme.border }]}>
          <MascotArt {...props} />
          <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, padding: SPACING.sm },
  cell: { alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 4 },
  label: { ...TYPE.micro },
});

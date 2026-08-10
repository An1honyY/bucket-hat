import { StyleSheet, Text, View } from "react-native";
import MascotBase, { type MascotPose } from "./MascotBase";
import useTheme from "../../theme/useTheme";
import { TYPE, SPACING } from "../../theme/typography";

// TEMPORARY — the bench for the ported QuiverAI mascot. Shows the base
// character plus the expressions built on top of it, each at hero size and at
// the 64pt size the Journey Detail instance uses, since a face that only works
// big isn't usable. Deleted once the character is settled.
const VARIANTS: { label: string; pose: MascotPose }[] = [
  { label: "1 · Base — as supplied", pose: {} },
  { label: "2 · Happy — closed upturned eyes, beak open", pose: { eyes: "happy", mouth: "open" } },
  { label: "3 · Curious — tilt, looking up and over", pose: { tiltDeg: -7, gazeX: -2, gazeY: -2 } },
  { label: "4 · Content — half-lidded, gaze down", pose: { eyes: "half", gazeY: 1.5 } },
  { label: "5 · Surprised — wide, small pupils, beak open", pose: { eyes: "wide", mouth: "open", gazeY: -1 } },
];

export default function MascotPreview() {
  const theme = useTheme();
  return (
    // A plain View, not a ScrollView: this renders inside Today's own
    // ScrollView, and a nested one collapses to zero height on web.
    <View style={styles.wrap}>
      {VARIANTS.map(({ label, pose }) => (
        <View key={label} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
          <View style={styles.specimens}>
            <MascotBase size={170} pose={pose} />
            <MascotBase size={96} pose={pose} />
            <MascotBase size={64} pose={pose} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md, padding: SPACING.sm },
  row: { borderWidth: 1, borderRadius: 14, padding: SPACING.sm, gap: 2 },
  specimens: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.md },
  label: { ...TYPE.eyebrow },
});

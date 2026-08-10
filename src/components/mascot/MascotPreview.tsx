import { StyleSheet, Text, View } from "react-native";
import MascotBase, { type MascotPose } from "./MascotBase";
import { REFERENCE_POSES } from "./poses";
import useTheme from "../../theme/useTheme";
import { TYPE, SPACING } from "../../theme/typography";

// TEMPORARY — bench for the mascot. Deleted once the character is settled.

const FLIPPERS: { label: string; pose: MascotPose }[] = [
  { label: "rest", pose: {} },
  { label: "right +45", pose: { rightFlipperDeg: 45 } },
  { label: "left +45", pose: { leftFlipperDeg: 45 } },
  { label: "both +70", pose: { leftFlipperDeg: 70, rightFlipperDeg: 70 } },
  { label: "right −25", pose: { rightFlipperDeg: -25 } },
];

export default function MascotPreview() {
  const theme = useTheme();
  const label = { ...TYPE.eyebrow, color: theme.textPrimary };
  const note = { ...TYPE.micro, color: theme.textSecondary };

  return (
    // A plain View, not a ScrollView: this renders inside Today's own
    // ScrollView, and a nested one collapses to zero height on web.
    <View style={styles.wrap}>
      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>Character — rebuilt body, redrawn hat</Text>
        <View style={styles.specimens}>
          <MascotBase size={190} />
          <MascotBase size={96} />
          <MascotBase size={64} />
        </View>
      </View>

      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>Flippers — actually separate limbs now</Text>
        <View style={styles.specimens}>
          {FLIPPERS.map(({ label: l, pose }) => (
            <View key={l} style={styles.cell}>
              <MascotBase size={130} pose={pose} />
              <Text style={note}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {REFERENCE_POSES.map(({ key, label: poseLabel, pose }) => (
        <View key={key} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={label}>{poseLabel}</Text>
          <View style={styles.specimens}>
            <MascotBase size={130} pose={pose} />
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
  specimens: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: SPACING.md },
  cell: { alignItems: "center" },
});

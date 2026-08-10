import { StyleSheet, Text, View } from "react-native";
import MascotBase, { type HatStyle, type MascotPose } from "./MascotBase";
import { REFERENCE_POSES } from "./poses";
import useTheme from "../../theme/useTheme";
import { TYPE, SPACING } from "../../theme/typography";

// TEMPORARY — bench for the ported mascot. Three sections: the hat comparison,
// the flipper range, and the stored reference expressions. Deleted once the
// character is settled.

const HATS: { style: HatStyle; label: string }[] = [
  { style: "original", label: "Original — brim overlaps the eyes" },
  { style: "thin", label: "A · Thin — brim clears the eyes, still pulled down" },
  { style: "perched", label: "B · Perched — higher and tipped back" },
];

const FLIPPERS: { label: string; pose: MascotPose }[] = [
  { label: "rest", pose: {} },
  { label: "right +55", pose: { rightFlipperDeg: 55 } },
  { label: "left +55", pose: { leftFlipperDeg: 55 } },
  { label: "both +35", pose: { leftFlipperDeg: 35, rightFlipperDeg: 35 } },
  { label: "right −40 (inward)", pose: { rightFlipperDeg: -40 } },
];

export default function MascotPreview() {
  const theme = useTheme();
  const label = { ...TYPE.eyebrow, color: theme.textPrimary };
  const note = { ...TYPE.micro, color: theme.textSecondary };

  return (
    // A plain View, not a ScrollView: this renders inside Today's own
    // ScrollView, and a nested one collapses to zero height on web.
    <View style={styles.wrap}>
      {HATS.map(({ style, label: hatLabel }) => (
        <View key={style} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={label}>{hatLabel}</Text>
          <View style={styles.specimens}>
            <MascotBase size={170} hat={style} />
            <MascotBase size={96} hat={style} />
            <MascotBase size={64} hat={style} />
          </View>
        </View>
      ))}

      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>Flippers — now independent</Text>
        <View style={styles.specimens}>
          {FLIPPERS.map(({ label: l, pose }) => (
            <View key={l} style={styles.cell}>
              <MascotBase size={120} pose={pose} hat="thin" />
              <Text style={note}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {REFERENCE_POSES.map(({ key, label: poseLabel, pose }) => (
        <View key={key} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={label}>{poseLabel}</Text>
          <View style={styles.specimens}>
            <MascotBase size={130} pose={pose} hat="thin" />
            <MascotBase size={64} pose={pose} hat="thin" />
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

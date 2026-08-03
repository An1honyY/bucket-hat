import { StyleSheet, View } from "react-native";
import AppButton from "./AppButton";
import { ACTION_MAX_WIDTH } from "../theme/commonStyles";
import { SPACING } from "../theme/typography";

// The footer every add/edit form ends with: Cancel and Save side by side,
// then whatever optional secondary and destructive actions that form has.
// Six forms each had their own copy of this, with the same three bugs in
// varying combinations — buttons stretching the full width of a tablet, the
// destructive action styled identically to the neutral one, and text-only
// "buttons" below the 44pt minimum (§9.6).
//
// The order is deliberate: the two actions you came here to take, then the
// ones that change the item's availability, then the one that destroys it,
// separated by enough space that the last one can't be hit by momentum.
interface Props {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  canSubmit?: boolean;
  secondary?: { label: string; onPress: () => void };
  destructive?: { label: string; onPress: () => void };
}

export default function FormActions({
  onCancel,
  onSubmit,
  submitLabel = "Save",
  canSubmit = true,
  secondary,
  destructive,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <AppButton label="Cancel" variant="secondary" layout="inline" onPress={onCancel} />
        <AppButton label={submitLabel} layout="inline" disabled={!canSubmit} onPress={onSubmit} />
      </View>
      {secondary && <AppButton label={secondary.label} variant="secondary" size="sm" onPress={secondary.onPress} />}
      {destructive && (
        <View style={styles.destructive}>
          <AppButton label={destructive.label} variant="danger" size="sm" onPress={destructive.onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", maxWidth: ACTION_MAX_WIDTH, alignSelf: "center", marginTop: SPACING.xxl, gap: SPACING.md },
  row: { flexDirection: "row", gap: SPACING.md },
  destructive: { marginTop: SPACING.sm },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import useTheme from "../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../theme/typography";
import ClothingTypeIcon from "./ClothingTypeIcon";
import GearThumbnail from "./GearThumbnail";
import type { GearGroup, GearOption } from "../lib/useGearOptions";
import { selectedChipStyle, selectedChipLabelStyle } from "../theme/commonStyles";

// Multi-select over the user's own gear — TagChips/SingleSelect's chip
// language, but each chip names a real owned item and carries its photo where
// it has one (§3.3's "thumbnail next to the item name wherever gear is
// listed"), because a wardrobe of "Blue jacket"/"Black jacket" is not
// distinguishable by name alone.
//
// Grouped by inventory rather than shown as one long run of chips: with a
// full wardrobe the ungrouped version is a wall of similar pills, and the
// group heading is the only thing that makes "did I pick shoes?" answerable
// at a glance.
const GROUP_ORDER: GearGroup[] = ["Clothing", "Shoes", "Umbrellas"];

interface Props {
  options: GearOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function GearMultiSelect({ options, selectedIds, onChange }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  function toggle(id: string) {
    // Appends rather than re-sorting, so the saved order is the order the
    // user picked things in — that's the order they're rendered back in.
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  return (
    <View style={styles.groups}>
      {GROUP_ORDER.map((group) => {
        const inGroup = options.filter((o) => o.group === group);
        if (inGroup.length === 0) return null;
        return (
          <View key={group} style={styles.group}>
            <Text style={styles.groupLabel}>{group}</Text>
            <View style={styles.row}>
              {inGroup.map((option) => {
                const active = selectedIds.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggle(option.id)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option.name}
                  >
                    {option.photoUri ? (
                      <GearThumbnail itemId={option.id} photoUri={option.photoUri} kind={option.icon} size={20} />
                    ) : (
                      <ClothingTypeIcon
                        kind={option.icon}
                        size={15}
                        color={active ? "#FFFFFF" : theme.textSecondary}
                      />
                    )}
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{option.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    groups: { gap: SPACING.md },
    group: { gap: SPACING.sm },
    groupLabel: { ...TYPE.eyebrow, color: theme.textSecondary },
    row: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 44,
    },
    chipActive: selectedChipStyle(theme),
    chipLabel: { ...TYPE.caption, color: theme.textPrimary },
    chipLabelActive: selectedChipLabelStyle(theme),
  });
}

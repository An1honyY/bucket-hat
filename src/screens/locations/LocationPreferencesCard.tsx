import { StyleSheet, Text, View } from "react-native";
import type { SavedLocation } from "../../types";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import ClothingTypeIcon from "../../components/ClothingTypeIcon";
import GearThumbnail from "../../components/GearThumbnail";
import { resolveGearOptions, useGearOptions } from "../../lib/useGearOptions";

// What the user has decided about this place, read back: the gear they always
// want here and whatever they wrote down. Sits below the forecast because the
// forecast is the changing answer and this is the fixed one.
//
// Renders nothing at all when neither is set — §9.3's omit-rather-than-
// placeholder rule. A location with no preferences shows no empty card
// telling you it has none; the disclosure below is where you'd add them.
interface Props {
  location: SavedLocation;
}

export default function LocationPreferencesCard({ location }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { options } = useGearOptions();
  const gear = resolveGearOptions(location.preferredGearIds, options);
  const notes = location.notes?.trim();

  // Resolved items, not saved ids: gear picked here and later deleted from
  // the wardrobe leaves ids that name nothing, and a card whose only content
  // is a stale id should not appear at all.
  if (!notes && gear.length === 0) return null;

  return (
    <View style={styles.card}>
      {gear.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Usual gear here</Text>
          <View style={styles.chipRow}>
            {gear.map((item) => (
              <View key={item.id} style={styles.chip}>
                {item.photoUri ? (
                  <GearThumbnail itemId={item.id} photoUri={item.photoUri} kind={item.icon} size={20} />
                ) : (
                  <ClothingTypeIcon kind={item.icon} size={15} color={theme.accentWalk} />
                )}
                <Text style={styles.chipLabel}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {notes && (
        <View style={styles.section}>
          <Text style={styles.heading}>Notes</Text>
          <Text style={styles.notes}>{notes}</Text>
        </View>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      gap: SPACING.md,
      marginBottom: SPACING.lg,
      ...cardElevationStyle(theme),
    },
    section: { gap: SPACING.sm },
    heading: { ...TYPE.micro, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
    // Matches RightNowCard's resolved-pick chip: accent-outlined, because
    // every one of these names something the user actually owns.
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.circle,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.accentWalk,
    },
    chipLabel: { ...TYPE.caption, fontWeight: "700", color: theme.accentWalk },
    notes: { ...TYPE.body, color: theme.textPrimary, lineHeight: 20 },
  });
}

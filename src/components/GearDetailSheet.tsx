import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ActionIcon from "./ActionIcon";
import ClothingTypeIcon, { type ClothingIconKind } from "./ClothingTypeIcon";
import { useGearPhoto } from "./useGearPhoto";
import useTheme from "../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../theme/typography";
import { cardElevationStyle } from "../theme/tokens";
import type { ClothingItem, ShoeItem, UmbrellaItem } from "../types";

// Tap a recommended pick to see the item itself — the photo at a size you can
// actually recognise something by, plus every property that went into it being
// chosen.
//
// A centred dialog rather than a SidePanel or a bottom sheet: this is a detail
// *about* the thing you tapped, opened from a chip in the middle of a card, so
// it should appear over that chip rather than fly in from an edge. The side
// panels are for reference material you read alongside the screen; this is a
// closer look at one item.
//
// Read-only by design. Editing lives in the Gear tab's forms, which own
// validation, photo replacement and the unavailability sheet; duplicating any
// of that here would mean two places to keep correct.

export type GearItem = ClothingItem | ShoeItem | UmbrellaItem;

interface Props {
  item: GearItem;
  kind: ClothingIconKind;
  onClose: () => void;
}

/** Enum values ("jacket", "high") are stored lowercase and read as words, so
 *  they only need their first letter lifted. Done here rather than with a
 *  `textTransform: capitalize` on the row, which is per-*word* and turned the
 *  composed values into Title Case — "8 Of 10", "Due For A Wash". */
function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Rows are built from whichever fields the item actually has, so the three
 *  gear shapes share one dialog without a union-narrowing cascade at the call
 *  site. A missing field is simply a row that isn't there. */
function detailRows(item: GearItem): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [{ label: "Type", value: sentenceCase(item.type) }];

  if ("warmth" in item) rows.push({ label: "Warmth", value: `${item.warmth} of 10` });
  if ("grip" in item) rows.push({ label: "Grip", value: sentenceCase(item.grip) });
  if ("windRating" in item) rows.push({ label: "Wind rating", value: sentenceCase(item.windRating) });

  // Booleans read as a list of what the item *is*, not three "No" rows —
  // "Waterproof: No, Windproof: No, Packable: No" is three lines saying
  // nothing. Absent means no.
  if ("waterproof" in item) {
    const properties = [
      item.waterproof ? "Waterproof" : null,
      "windproof" in item && item.windproof ? "Windproof" : null,
      "packable" in item && item.packable ? "Packable" : null,
      "substitutesForMidlayer" in item && item.substitutesForMidlayer ? "Warm enough to skip a midlayer" : null,
    ].filter(Boolean);
    if (properties.length > 0) rows.push({ label: "Properties", value: properties.join(", ") });
  }

  if ("tags" in item && item.tags && item.tags.length > 0) {
    rows.push({ label: "Tags", value: item.tags.join(", ") });
  }
  if ("needsCleaning" in item && item.needsCleaning) {
    rows.push({ label: "Cleaning", value: "Due for a wash" });
  }
  if ("wearsSinceClean" in item && item.wearsSinceClean) {
    rows.push({ label: "Worn since clean", value: `${item.wearsSinceClean}` });
  }
  if (item.unavailableUntil) {
    const until = new Date(item.unavailableUntil).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const reason = "unavailableReason" in item && item.unavailableReason ? item.unavailableReason : "unavailable";
    rows.push({ label: "Unavailable", value: `${sentenceCase(reason)}, until ${until}` });
  }

  return rows;
}

export default function GearDetailSheet({ item, kind, onClose }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const uri = useGearPhoto(item.id, item.photoUri);
  const rows = detailRows(item);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* A sibling of the dialog rather than its parent, so a tap inside the
            dialog needs no stopPropagation — same arrangement as SidePanel. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${item.name}`}
        />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={`Close ${item.name}`}
            >
              <ActionIcon kind="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.photo}>
              {uri ? (
                // §3.3 — never a broken-image placeholder; the type glyph
                // stands in both for "no photo" and for "still loading" on
                // web, where the image is fetched by item id.
                <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <ClothingTypeIcon kind={kind} size={72} color={theme.textSecondary} />
              )}
            </View>

            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: SPACING.xl,
    },
    dialog: {
      width: "100%",
      // Wide enough for the photo to be worth showing, capped so the dialog
      // stays a dialog on a desktop browser rather than becoming a page.
      maxWidth: 420,
      maxHeight: "85%",
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      paddingTop: SPACING.lg,
      ...cardElevationStyle(theme),
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingLeft: SPACING.lg,
      paddingRight: SPACING.sm,
      gap: SPACING.sm,
    },
    name: { ...TYPE.subtitle, color: theme.textPrimary, flexShrink: 1 },
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    body: { padding: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm },
    photo: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: RADIUS.card,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: SPACING.sm,
    },
    photoImage: { width: "100%", height: "100%" },
    row: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md, minHeight: 24 },
    rowLabel: { ...TYPE.caption, color: theme.textSecondary, width: 120 },
    rowValue: { ...TYPE.caption, color: theme.textPrimary, flex: 1 },
  });
}

import { Image, StyleSheet, View } from "react-native";
import useTheme from "../theme/useTheme";
import ClothingTypeIcon, { type ClothingIconKind } from "./ClothingTypeIcon";
import { useGearPhoto } from "./useGearPhoto";

// Small list-row thumbnail — docs/03-data-models.md §3.3: "~40px thumbnail
// next to the item name wherever gear is listed... missing photo falls back
// to a simple type-based icon, never a broken-image placeholder." Reuses
// ClothingTypeIcon (UI/UX polish pass 2) instead of a separate emoji map —
// every ClothingIconKind (including shoe/umbrella/vehicle) already has a
// real glyph there.
interface Props {
  /**
   * Needed on web, where there is no local photo file and the image is
   * fetched from the account's object store by item id instead. Optional
   * so a caller with no id (or on native, where `photoUri` is always
   * enough) still renders correctly.
   */
  itemId?: string;
  photoUri: string | undefined;
  kind: ClothingIconKind;
  dimmed?: boolean; // §9.4.3 — unavailable items dim to 60% opacity
}

export default function GearThumbnail({ itemId, photoUri, kind, dimmed }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const uri = useGearPhoto(itemId, photoUri);
  return (
    <View style={[styles.container, dimmed && styles.dimmed]}>
      {uri ? (
        // §3.3 — a missing photo falls back to the type glyph, never a
        // broken-image placeholder. That holds while a web fetch is in
        // flight too: `uri` is undefined until it resolves, so the icon
        // shows rather than an empty box.
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <ClothingTypeIcon kind={kind} size={20} color={theme.textSecondary} />
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    dimmed: { opacity: 0.6 },
    image: { width: "100%", height: "100%" },
  });
}

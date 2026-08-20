import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listLocations, updateLocation } from "../../db/repositories/locations";
import type { SavedLocation } from "../../types";
import ScreenSurface from "../../components/ScreenSurface";
import ActionIcon from "../../components/ActionIcon";
import AppButton from "../../components/AppButton";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";
import type { LocationsStackParamList } from "../../navigation/types";

// The saved-locations list. Opening one, or adding one, pushes a route on the
// Locations tab's own stack (LocationsStack.tsx) rather than swapping this
// screen out for a different mode — so the system back gesture closes it, the
// header carries the back control, and leaving actually unmounts.
type Props = NativeStackScreenProps<LocationsStackParamList, "LocationsList">;

export default function LocationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    listLocations().then((rows) => {
      setLocations(rows);
      setLoaded(true);
    });
  }, []);

  // Also what refreshes the list after a push returns — a location edited or
  // added on the pushed screen is written there, and this reloads on focus.
  useFocusEffect(reload);

  async function toggleFavorite(location: SavedLocation) {
    await updateLocation({ ...location, isFavorite: !location.isFavorite });
    reload();
  }

  const firstNonFavoriteIndex = locations.findIndex((l) => !l.isFavorite);

  return (
    <ScreenSurface>
      {/* The empty state carries no "Locations" heading — the tab header
          directly above it already says exactly that, and an empty screen
          repeating its own title spends the one moment it has to tell you
          what to do. Its action is `primary`: it is the only thing on the
          screen, so there's nothing for it to compete with. */}
      {loaded && locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>Nothing saved yet — start with Home and Work.</Text>
          <AppButton label="Add a location" layout="hug" onPress={() => navigation.navigate("LocationForm")} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add a location" variant="secondary" layout="hug" onPress={() => navigation.navigate("LocationForm")} style={styles.listAddButton} />
          }
          renderItem={({ item, index }) => (
            <>
              {index === firstNonFavoriteIndex && index > 0 && <View style={styles.divider} />}
              {/* Plain View, so the star is a *sibling* of the row's tap
                  target rather than nested in it: react-native-web renders
                  both Pressables as <button>, and a button inside a button
                  is invalid HTML React warns about on every render. */}
              <View style={styles.row}>
                <Pressable
                  onPress={() => navigation.navigate("LocationDetail", { location: item })}
                  style={styles.rowBody}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${item.address}. Double tap to open`}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowAddress}>{item.address}</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => toggleFavorite(item)}
                  hitSlop={8}
                  style={styles.starButton}
                  accessibilityRole="button"
                  accessibilityLabel={item.isFavorite ? `Remove ${item.label} from favorites` : `Add ${item.label} to favorites`}
                >
                  <ActionIcon
                    kind="star"
                    size={20}
                    color={item.isFavorite ? theme.favoriteStar : theme.textSecondary}
                    filled={item.isFavorite}
                  />
                </Pressable>
              </View>
            </>
          )}
        />
      )}
    </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // The horizontal padding is the point, not decoration: without it a
    // full-width "block" button in here rendered edge-to-edge on a phone,
    // with no margin at all. The button hugs its label now, but a padded
    // container is what keeps the sentence above it off the screen edges too.
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: SPACING.xl },
    title: { ...TYPE.title, fontWeight: "600", color: theme.textPrimary },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
    listContent: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, gap: SPACING.sm, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    addButton: { marginBottom: SPACING.sm },
    // Above a populated list it reads as one more row, so it lines up with
    // the rows rather than floating centred over them.
    listAddButton: { alignSelf: "flex-start", marginBottom: SPACING.sm },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.surface,
      marginBottom: 8,
    },
    rowBody: { flex: 1 },
    rowText: { flex: 1 },
    rowLabel: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    rowAddress: { ...TYPE.caption, color: theme.textSecondary, marginTop: 2 },
    starButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  });
}

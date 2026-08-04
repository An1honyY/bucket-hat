import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { createLocation, deleteLocation, listLocations, updateLocation } from "../../db/repositories/locations";
import type { SavedLocation } from "../../types";
import LocationForm, { type LocationFormValues } from "./LocationForm";
import LocationDetail from "./LocationDetail";
import ScreenSurface from "../../components/ScreenSurface";
import ActionIcon from "../../components/ActionIcon";
import AppButton from "../../components/AppButton";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";

type Mode = { kind: "list" } | { kind: "add" } | { kind: "edit"; location: SavedLocation };

export default function LocationsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  const reload = useCallback(() => {
    listLocations().then((rows) => {
      setLocations(rows);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(reload);

  async function handleSubmit(values: LocationFormValues) {
    if (mode.kind === "edit") {
      // Stay on the detail screen with the saved values applied, rather than
      // bouncing back to the list. Saving a note or a gear pick and being
      // returned to a row that shows neither gave no confirmation it landed;
      // the back chip is still there for leaving.
      const updated = { ...mode.location, ...values };
      await updateLocation(updated);
      setMode({ kind: "edit", location: updated });
      reload();
      return;
    }
    await createLocation(values);
    setMode({ kind: "list" });
    reload();
  }

  async function handleDelete() {
    if (mode.kind !== "edit") return;
    await deleteLocation(mode.location.id);
    setMode({ kind: "list" });
    reload();
  }

  async function toggleFavorite(location: SavedLocation) {
    await updateLocation({ ...location, isFavorite: !location.isFavorite });
    reload();
  }

  if (mode.kind === "add") {
    return (
      <ScreenSurface>
        <LocationForm onSubmit={handleSubmit} onCancel={() => setMode({ kind: "list" })} />
      </ScreenSurface>
    );
  }

  if (mode.kind === "edit") {
    return (
      <ScreenSurface>
        {/* Keyed by id so switching locations remounts rather than reusing
            one screen's forecast state for another suburb. */}
        <LocationDetail
          key={mode.location.id}
          location={mode.location}
          onSubmit={handleSubmit}
          onCancel={() => setMode({ kind: "list" })}
          onDelete={handleDelete}
        />
      </ScreenSurface>
    );
  }

  const firstNonFavoriteIndex = locations.findIndex((l) => !l.isFavorite);

  return (
    <ScreenSurface>
      {loaded && locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>Locations</Text>
          <Text style={styles.empty}>No locations yet — add Home and Work first</Text>
          <AppButton label="Add a location" variant="secondary" onPress={() => setMode({ kind: "add" })} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add a location" variant="secondary" onPress={() => setMode({ kind: "add" })} style={styles.addButton} />
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
                  onPress={() => setMode({ kind: "edit", location: item })}
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
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    title: { ...TYPE.title, fontWeight: "600", color: theme.textPrimary },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
    listContent: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, gap: SPACING.sm, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    addButton: { marginBottom: SPACING.sm },
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

import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listVehicles } from "../../db/repositories/vehicles";
import type { VehicleItem } from "../../types";
import type { GearStackParamList } from "../../navigation/types";
import GearThumbnail from "../../components/GearThumbnail";
import AppButton from "../../components/AppButton";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

// The list only. Adding and editing are the `GearItem` route on the Gear
// tab's stack (GearStack.tsx) — see GearItemScreen for why they moved out.
export default function VehicleList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<GearStackParamList>>();
  const [items, setItems] = useState<VehicleItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    listVehicles().then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, []);

  // Also what refreshes the list when the add/edit route pops back to it.
  useFocusEffect(reload);

  // Each sub-tab's list mounts fresh when the tab changes, so its first
  // render lands before listVehicles() resolves. Rendering the populated
  // branch in that gap put the "Add ..." button at the top of an empty
  // FlatList, from where it visibly jumped down to the centred empty state
  // a frame later.
  if (!loaded) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No vehicles yet — add your first one</Text>
          <AppButton label="Add vehicle" layout="hug" onPress={() => navigation.navigate("GearItem", { kind: "vehicle" })} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add vehicle" variant="secondary" layout="hug" onPress={() => navigation.navigate("GearItem", { kind: "vehicle" })} style={styles.listAddButton} />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate("GearItem", { kind: "vehicle", item })} style={styles.row}>
              <GearThumbnail itemId={item.id} photoUri={item.photoUri} kind="vehicle" />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.type}, {item.weatherProtection} weather protection
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // Transparent, rather than the theme background: this list renders
    // inside GearScreen's ScreenSurface, and an opaque fill here would
    // paint over the shared background pattern behind it.
    container: { flex: 1 },
    // The horizontal padding is the point, not decoration: without it a
    // full-width "block" button in here rendered edge-to-edge on a phone,
    // with no margin at all. The button hugs its label now, but a padded
    // container is what keeps the sentence above it off the screen edges too.
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: SPACING.xl },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
    listContent: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, gap: SPACING.sm, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    addButton: { marginBottom: SPACING.sm },
    // Above a populated list it reads as one more row, so it lines up with
    // the rows rather than floating centred over them.
    listAddButton: { alignSelf: "flex-start", marginBottom: SPACING.sm },
    row: { flexDirection: "row", gap: 12, padding: 12, borderRadius: RADIUS.card, backgroundColor: theme.surface, marginBottom: 8 },
    rowText: { flex: 1 },
    rowLabel: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    rowMeta: { ...TYPE.caption, color: theme.textSecondary, marginTop: 2 },
  });
}

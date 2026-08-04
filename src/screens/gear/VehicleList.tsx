import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from "../../db/repositories/vehicles";
import type { VehicleItem } from "../../types";
import VehicleForm from "./VehicleForm";
import GearThumbnail from "../../components/GearThumbnail";
import AppButton from "../../components/AppButton";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

type Mode = { kind: "list" } | { kind: "add" } | { kind: "edit"; item: VehicleItem };

export default function VehicleList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [items, setItems] = useState<VehicleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  const reload = useCallback(() => {
    listVehicles().then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(reload);

  async function handleSubmit(item: VehicleItem) {
    if (mode.kind === "edit") {
      await updateVehicle(item);
    } else {
      await createVehicle(item);
    }
    setMode({ kind: "list" });
    reload();
  }

  async function handleDelete() {
    if (mode.kind !== "edit") return;
    await deleteVehicle(mode.item.id);
    setMode({ kind: "list" });
    reload();
  }

  if (mode.kind === "add") {
    return <VehicleForm onSubmit={handleSubmit} onCancel={() => setMode({ kind: "list" })} />;
  }

  if (mode.kind === "edit") {
    return (
      <VehicleForm
        initial={mode.item}
        onSubmit={handleSubmit}
        onCancel={() => setMode({ kind: "list" })}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <View style={styles.container}>
      {loaded && items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No vehicles yet — add your first one</Text>
          <AppButton label="Add vehicle" variant="secondary" onPress={() => setMode({ kind: "add" })} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add vehicle" variant="secondary" onPress={() => setMode({ kind: "add" })} style={styles.addButton} />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setMode({ kind: "edit", item })} style={styles.row}>
              <GearThumbnail itemId={item.id} photoUri={item.photoUri} kind="vehicle" />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.type} · {item.weatherProtection} weather protection
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
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
    listContent: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, gap: SPACING.sm, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    addButton: { marginBottom: SPACING.sm },
    row: { flexDirection: "row", gap: 12, padding: 12, borderRadius: RADIUS.card, backgroundColor: theme.surface, marginBottom: 8 },
    rowText: { flex: 1 },
    rowLabel: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    rowMeta: { ...TYPE.caption, color: theme.textSecondary, marginTop: 2 },
  });
}

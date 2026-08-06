import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { showAlert } from "../../lib/crossPlatformAlert";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listShoes, updateShoe } from "../../db/repositories/shoes";
import type { ShoeItem } from "../../types";
import type { GearStackParamList } from "../../navigation/types";
import GearThumbnail from "../../components/GearThumbnail";
import GearRowBadges from "../../components/GearRowBadges";
import UnavailabilitySheet from "../../components/UnavailabilitySheet";
import AppButton from "../../components/AppButton";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

// The list only. Adding and editing are the `GearItem` route on the Gear
// tab's stack (GearStack.tsx) — see GearItemScreen for why they moved out.
export default function ShoeList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<GearStackParamList>>();
  const [items, setItems] = useState<ShoeItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailabilityTarget, setUnavailabilityTarget] = useState<ShoeItem | null>(null);
  const [nowMs] = useState(() => Date.now());

  const reload = useCallback(() => {
    listShoes().then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, []);

  // Also what refreshes the list when the add/edit route pops back to it.
  useFocusEffect(reload);

  async function markAsWashing(item: ShoeItem) {
    const until = new Date();
    until.setDate(until.getDate() + 2);
    await updateShoe({
      ...item,
      unavailableUntil: until.toISOString(),
      unavailableReason: "laundry",
      wearsSinceClean: 0,
      needsCleaning: false,
    });
    reload();
  }

  function confirmMarkAsWashing(item: ShoeItem) {
    showAlert(`Mark ${item.name} as in the laundry?`, "This'll mark it unavailable for about 2 days and reset its wear count.", [
      { text: "Not yet", style: "cancel" },
      { text: "Mark as washing", onPress: () => markAsWashing(item) },
    ]);
  }

  return (
    <View style={styles.container}>
      {loaded && items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No shoes yet — add your first pair</Text>
          <AppButton label="Add shoes" variant="secondary" onPress={() => navigation.navigate("GearItem", { kind: "shoe" })} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add shoes" variant="secondary" onPress={() => navigation.navigate("GearItem", { kind: "shoe" })} style={styles.addButton} />
          }
          renderItem={({ item }) => {
            const isUnavailable = !!item.unavailableUntil && new Date(item.unavailableUntil).getTime() > nowMs;
            return (
              <Pressable onPress={() => navigation.navigate("GearItem", { kind: "shoe", item })} style={styles.row}>
                <GearThumbnail itemId={item.id} photoUri={item.photoUri} kind="shoe" dimmed={isUnavailable} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, isUnavailable && styles.dimmedText]}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.type} · {item.grip} grip
                  </Text>
                  <GearRowBadges
                    item={item}
                    onTapUnavailable={() => setUnavailabilityTarget(item)}
                    onTapWashReminder={() => confirmMarkAsWashing(item)}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {unavailabilityTarget && (
        <UnavailabilitySheet
          key={unavailabilityTarget.id}
          initialReason={unavailabilityTarget.unavailableReason}
          onClose={() => setUnavailabilityTarget(null)}
          onConfirm={({ unavailableUntil, unavailableReason }) => {
            const laundryReset = unavailableReason === "laundry" ? { wearsSinceClean: 0, needsCleaning: false } : {};
            updateShoe({ ...unavailabilityTarget, unavailableUntil, unavailableReason, ...laundryReset }).then(reload);
          }}
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
    dimmedText: { opacity: 0.6 },
    rowMeta: { ...TYPE.caption, color: theme.textSecondary, marginTop: 2 },
  });
}

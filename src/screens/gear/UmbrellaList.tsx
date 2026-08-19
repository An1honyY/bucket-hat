import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listUmbrellas, updateUmbrella } from "../../db/repositories/umbrellas";
import type { UmbrellaItem } from "../../types";
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
export default function UmbrellaList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<GearStackParamList>>();
  const [items, setItems] = useState<UmbrellaItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailabilityTarget, setUnavailabilityTarget] = useState<UmbrellaItem | null>(null);
  const [nowMs] = useState(() => Date.now());

  const reload = useCallback(() => {
    listUmbrellas().then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, []);

  // Also what refreshes the list when the add/edit route pops back to it.
  useFocusEffect(reload);

  // UmbrellaItem has no unavailableReason field (Section 3) — only the
  // return date is persisted here, unlike clothing/shoes.
  function applyUnavailability(target: UmbrellaItem, unavailableUntil: string | undefined) {
    return updateUmbrella({ ...target, unavailableUntil });
  }

  // Each sub-tab's list mounts fresh when the tab changes, so its first
  // render lands before listUmbrellas() resolves. Rendering the populated
  // branch in that gap put the "Add ..." button at the top of an empty
  // FlatList, from where it visibly jumped down to the centred empty state
  // a frame later.
  if (!loaded) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No umbrellas yet — add your first one</Text>
          <AppButton label="Add umbrella" onPress={() => navigation.navigate("GearItem", { kind: "umbrella" })} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add umbrella" variant="secondary" onPress={() => navigation.navigate("GearItem", { kind: "umbrella" })} style={styles.addButton} />
          }
          renderItem={({ item }) => {
            const isUnavailable = !!item.unavailableUntil && new Date(item.unavailableUntil).getTime() > nowMs;
            return (
              <Pressable onPress={() => navigation.navigate("GearItem", { kind: "umbrella", item })} style={styles.row}>
                <GearThumbnail itemId={item.id} photoUri={item.photoUri} kind="umbrella" dimmed={isUnavailable} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, isUnavailable && styles.dimmedText]}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.type}, {item.windRating} wind rating
                  </Text>
                  <GearRowBadges
                    item={item}
                    onTapUnavailable={() => setUnavailabilityTarget(item)}
                    onTapWashReminder={() => {}}
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
          onClose={() => setUnavailabilityTarget(null)}
          onConfirm={({ unavailableUntil }) => applyUnavailability(unavailabilityTarget, unavailableUntil).then(reload)}
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

import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { createUmbrella, deleteUmbrella, listUmbrellas, updateUmbrella } from "../../db/repositories/umbrellas";
import type { UmbrellaItem } from "../../types";
import UmbrellaForm from "./UmbrellaForm";
import GearThumbnail from "../../components/GearThumbnail";
import GearRowBadges from "../../components/GearRowBadges";
import UnavailabilitySheet from "../../components/UnavailabilitySheet";
import AppButton from "../../components/AppButton";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

type Mode = { kind: "list" } | { kind: "add" } | { kind: "edit"; item: UmbrellaItem };

interface Props {
  // §9.6 — set when GearRecommendationCard's fallback text sent the user
  // here to add an umbrella; opens straight into the add form.
  autoOpenAdd?: boolean;
}

export default function UmbrellaList({ autoOpenAdd }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [items, setItems] = useState<UmbrellaItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>(autoOpenAdd ? { kind: "add" } : { kind: "list" });
  const [unavailabilityTarget, setUnavailabilityTarget] = useState<UmbrellaItem | null>(null);
  const [nowMs] = useState(() => Date.now());

  // "Adjusting state when a prop changes" (render-time, not an effect) —
  // see ClothingList.tsx for why autoOpenAdd only ever holds true briefly.
  const [consumedAutoOpenAdd, setConsumedAutoOpenAdd] = useState(autoOpenAdd);
  if (autoOpenAdd !== consumedAutoOpenAdd) {
    setConsumedAutoOpenAdd(autoOpenAdd);
    if (autoOpenAdd) setMode({ kind: "add" });
  }

  const reload = useCallback(() => {
    listUmbrellas().then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(reload);

  async function handleSubmit(item: UmbrellaItem) {
    if (mode.kind === "edit") {
      await updateUmbrella(item);
    } else {
      await createUmbrella(item);
    }
    setMode({ kind: "list" });
    reload();
  }

  async function handleDelete() {
    if (mode.kind !== "edit") return;
    await deleteUmbrella(mode.item.id);
    setMode({ kind: "list" });
    reload();
  }

  // UmbrellaItem has no unavailableReason field (Section 3) — only the
  // return date is persisted here, unlike clothing/shoes.
  function applyUnavailability(target: UmbrellaItem, unavailableUntil: string | undefined) {
    return updateUmbrella({ ...target, unavailableUntil });
  }

  if (mode.kind === "add") {
    return <UmbrellaForm onSubmit={handleSubmit} onCancel={() => setMode({ kind: "list" })} />;
  }

  if (mode.kind === "edit") {
    return (
      <>
        <UmbrellaForm
          initial={mode.item}
          onSubmit={handleSubmit}
          onCancel={() => setMode({ kind: "list" })}
          onDelete={handleDelete}
          onMarkUnavailable={() => setUnavailabilityTarget(mode.item)}
        />
        {unavailabilityTarget && (
          <UnavailabilitySheet
            key={unavailabilityTarget.id}
            onClose={() => setUnavailabilityTarget(null)}
            onConfirm={({ unavailableUntil }) => {
              applyUnavailability(unavailabilityTarget, unavailableUntil).then(() => {
                setMode({ kind: "edit", item: { ...unavailabilityTarget, unavailableUntil } });
                reload();
              });
            }}
          />
        )}
      </>
    );
  }

  return (
    <View style={styles.container}>
      {loaded && items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No umbrellas yet — add your first one</Text>
          <AppButton label="Add umbrella" variant="secondary" onPress={() => setMode({ kind: "add" })} style={styles.addButton} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AppButton label="Add umbrella" variant="secondary" onPress={() => setMode({ kind: "add" })} style={styles.addButton} />
          }
          renderItem={({ item }) => {
            const isUnavailable = !!item.unavailableUntil && new Date(item.unavailableUntil).getTime() > nowMs;
            return (
              <Pressable onPress={() => setMode({ kind: "edit", item })} style={styles.row}>
                <GearThumbnail itemId={item.id} photoUri={item.photoUri} kind="umbrella" dimmed={isUnavailable} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, isUnavailable && styles.dimmedText]}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.type} · {item.windRating} wind rating
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

import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listLocations } from "../db/repositories/locations";
import { newId } from "../db/rowMapping";
import AddressAutocomplete from "./AddressAutocomplete";
import ActionIcon from "./ActionIcon";
import useTheme from "../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../theme/typography";
import type { SavedLocation } from "../types";

// Origin/destination/waypoint picker for the Plan screen —
// docs/04-screens-navigation.md §4.3/§4.3.1: "autocomplete against saved
// locations first — favorites surfaced above the rest — then free text via
// Google Places." The query box filters the saved-location list client-side
// (favorites-first ordering preserved from listLocations()) and doubles as
// a real Google Places search (AddressAutocomplete) for anywhere not
// already saved — closes the gap logged in DECISIONS.md's 2026-07-21
// onboarding-rework entry ("Left open: Plan screen's pickers still only
// search saved locations"). A selected Places result becomes an ephemeral,
// non-persisted SavedLocation-shaped object (id: newId()) rather than a
// real saved-location row — same pattern useRightNow.ts's synthetic
// "Current location" journey already uses — so planJourney's existing
// SavedLocation-typed pipeline needs no changes to accept it. One real
// consequence worth knowing: §5.1's offline cached-structure fallback keys
// off origin.id/destination.id, so a never-saved place never benefits from
// that 30-day route-reuse cache (a fresh id every time can't match a prior
// plan) — an honest limitation of not having a stable saved identity, not
// a bug.
function shortLabel(address: string): string {
  const first = address.split(",")[0]?.trim();
  return first && first.length > 0 ? first : address;
}

interface Props {
  label: string;
  value: SavedLocation | undefined;
  onChange: (location: SavedLocation) => void;
  placeholder: string;
}

export default function SavedLocationPicker({ label, value, onChange, placeholder }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      listLocations().then(setLocations);
    }, [])
  );

  function closeAndReset() {
    setOpen(false);
    setQuery("");
  }

  function selectSaved(location: SavedLocation) {
    onChange(location);
    closeAndReset();
  }

  function selectPlace(result: { address: string; lat: number; lng: number }) {
    onChange({ id: newId(), label: shortLabel(result.address), address: result.address, lat: result.lat, lng: result.lng });
    closeAndReset();
  }

  const trimmedQuery = query.trim().toLowerCase();
  const filteredLocations = trimmedQuery
    ? locations.filter((l) => l.label.toLowerCase().includes(trimmedQuery) || l.address.toLowerCase().includes(trimmedQuery))
    : locations;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {/* §9.6 — this is the primary control on the Plan screen and it had
          no role and no label: a screen reader announced it as a plain
          container with the placeholder text inside. */}
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${value.label}. Change it` : `${label}. ${placeholder}`}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>{value?.label ?? placeholder}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeAndReset}>
        <Pressable style={styles.backdrop} onPress={closeAndReset}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <AddressAutocomplete
              value={query}
              onChangeText={setQuery}
              onSelectPlace={selectPlace}
              placeholder="Search saved places or type an address"
            />
            {filteredLocations.length === 0 ? (
              <Text style={styles.empty}>
                {locations.length === 0
                  ? "No saved places yet — search for an address above, or add some in the Locations tab"
                  : "No saved places match — search for an address above"}
              </Text>
            ) : (
              <FlatList
                data={filteredLocations}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectSaved(item)}
                    style={styles.option}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}, ${item.address}${item.isFavorite ? ", favorite" : ""}`}
                  >
                    {item.isFavorite && <ActionIcon kind="star" size={14} color={theme.favoriteStar} filled />}
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    <Text style={styles.optionAddress}>{item.address}</Text>
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    label: { ...TYPE.caption, color: theme.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
    field: { borderWidth: 1, borderColor: theme.border, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, minHeight: 44, justifyContent: "center" },
    valueText: { ...TYPE.body, color: theme.textPrimary },
    placeholderText: { ...TYPE.body, color: theme.textSecondary },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", alignItems: "center" },
    // Centred and capped, so on a wide viewport the sheet stays a sheet
    // rather than a full-bleed strip across the bottom of the window.
    sheet: {
      width: "100%",
      maxWidth: CONTENT_MAX_WIDTH,
      backgroundColor: theme.surfaceRaised,
      borderTopLeftRadius: RADIUS.card,
      borderTopRightRadius: RADIUS.card,
      padding: SPACING.xl,
      maxHeight: "70%",
    },
    sheetTitle: { ...TYPE.subtitle, marginBottom: SPACING.md, color: theme.textPrimary },
    empty: { ...TYPE.body, color: theme.textSecondary, paddingVertical: SPACING.xl, textAlign: "center", lineHeight: 21 },
    option: { minHeight: 48, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
    optionLabel: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    optionAddress: { ...TYPE.caption, color: theme.textSecondary },
  });
}

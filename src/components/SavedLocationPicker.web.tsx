import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listLocations } from "../db/repositories/locations";
import { newId } from "../db/rowMapping";
import { shortAddressLabel } from "../lib/placeLabel";
import AddressAutocomplete from "./AddressAutocomplete";
import ActionIcon from "./ActionIcon";
import useTheme from "../theme/useTheme";
import { SPACING, TYPE } from "../theme/typography";
import type { SavedLocation } from "../types";

// Web build of the Plan screen's origin/destination/waypoint picker.
//
// Native opens a bottom sheet: a tap target that raises a panel you then type
// into. That's the right shape on a phone, where a full-width sheet above the
// keyboard beats a dropdown squeezed under a field — but on the web it meant
// *two* clicks to do one thing (open the sheet, then click its input), and a
// modal thrown over the whole window to pick a place from a list.
//
// So on the web there is no modal. The field is the input: one click puts the
// caret in it and drops the list open underneath, saved places first, Places
// results as you type. That's the combobox pattern the web already has, and
// it's keyboard-reachable in a way a Pressable-that-opens-a-Modal never was.
//
// Everything else matches SavedLocationPicker.tsx exactly — same
// favourites-first ordering from listLocations(), same ephemeral non-persisted
// SavedLocation for a Places result (see that file's header for the id
// consequence), same props. Keep the two in step.

// Closing the list is driven off blur, which on react-native-web is both
// late (it lands after a click on the dropdown, so closing immediately would
// eat every selection) and, in a tree that re-renders underneath it, not
// entirely reliable. Hence the delay — and hence the rule that *nothing the
// user can lose* is allowed to depend on blur firing: an unfired blur leaves
// the list open a moment too long, never a field that looks empty. See
// `displayValue` below.
const BLUR_CLOSE_MS = 180;

interface Props {
  label: string;
  value: SavedLocation | undefined;
  onChange: (location: SavedLocation) => void;
  placeholder: string;
}

export default function SavedLocationPicker({ label, value, onChange, placeholder }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [open, setOpen] = useState(false);
  // null means "not being edited" — the field shows the chosen place's label.
  // A string means the user is typing, and that string is the query.
  const [query, setQuery] = useState<string | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      listLocations().then(setLocations);
    }, [])
  );

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  function commit(location: SavedLocation) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange(location);
    setQuery(null);
    setOpen(false);
  }

  function selectPlace(result: { address: string; lat: number; lng: number }) {
    commit({
      id: newId(),
      label: shortAddressLabel(result.address),
      address: result.address,
      lat: result.lat,
      lng: result.lng,
    });
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    // Deliberately *not* cleared. Blanking on focus and restoring on blur was
    // the first cut, and it left the field looking empty whenever RNW didn't
    // fire the blur — the chosen place still set, but invisible. The text
    // stays put and `selectTextOnFocus` highlights it instead, so the first
    // keystroke still replaces it: one click, then type, with nothing to lose
    // if the blur never arrives.
    setOpen(true);
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      // Drops a half-typed query that was never turned into a selection, so
      // reopening starts from the chosen place rather than the abandoned
      // search. Purely cosmetic — `displayValue` already falls back.
      setQuery(null);
    }, BLUR_CLOSE_MS);
  }

  // What the field shows: the live query while editing, the chosen place
  // otherwise. Never depends on a blur having fired.
  const displayValue = query ?? value?.label ?? "";
  // Filtering ignores the query while it's still just the chosen place's own
  // label echoed back — otherwise focusing a filled field shows a list
  // filtered down to the one thing already selected.
  const effectiveQuery = query === null || query === value?.label ? "" : query;
  const trimmedQuery = effectiveQuery.trim().toLowerCase();
  const filteredLocations = trimmedQuery
    ? locations.filter((l) => l.label.toLowerCase().includes(trimmedQuery) || l.address.toLowerCase().includes(trimmedQuery))
    : locations;

  const savedRows =
    open && filteredLocations.length > 0 ? (
      <View>
        <Text style={styles.groupHeading}>Saved places</Text>
        {filteredLocations.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => commit(item)}
            style={styles.option}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${item.address}${item.isFavorite ? ", favorite" : ""}`}
          >
            {item.isFavorite && <ActionIcon kind="star" size={14} color={theme.favoriteStar} filled />}
            <Text style={styles.optionLabel}>{item.label}</Text>
            <Text style={styles.optionAddress}>{item.address}</Text>
          </Pressable>
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <AddressAutocomplete
        value={displayValue}
        onChangeText={setQuery}
        onSelectPlace={selectPlace}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        selectTextOnFocus
        extraRows={savedRows}
      />
      {open && locations.length === 0 && trimmedQuery.length === 0 && (
        <Text style={styles.hint}>No saved places yet — type an address, or add some in the Locations tab.</Text>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // The dropdown is a sibling in normal flow rather than an absolute
    // overlay: the Plan screen's route rail measures the gap between these
    // fields (PICKER_FIELD_CENTER_Y), and an absolutely-positioned list would
    // also be clipped by the scroll container it sits in. Pushing the form
    // down while the list is open is the honest trade.
    field: { marginTop: SPACING.md },
    label: { ...TYPE.caption, color: theme.textSecondary, marginBottom: SPACING.xs },
    groupHeading: {
      ...TYPE.micro,
      fontWeight: "700",
      color: theme.textSecondary,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xs,
    },
    option: {
      minHeight: 48,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      flexWrap: "wrap",
    },
    optionLabel: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    optionAddress: { ...TYPE.caption, color: theme.textSecondary },
    hint: { ...TYPE.caption, color: theme.textSecondary, marginTop: SPACING.xs, lineHeight: 18 },
  });
}

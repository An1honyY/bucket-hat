import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { SavedLocation } from "../../types";
import useTheme from "../../theme/useTheme";
import useCommonStyles, { selectedChipStyle, selectedChipLabelStyle } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import LocationPickerMap from "../../components/LocationPickerMap";
import ActionIcon from "../../components/ActionIcon";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import GearMultiSelect from "../../components/GearMultiSelect";
import { useGearOptions } from "../../lib/useGearOptions";
import { resolveLocationLabel, shortAddressLabel } from "../../lib/placeLabel";
import { reverseGeocode } from "../../services/placesService";

// Add/edit form for a SavedLocation — docs/04-screens-navigation.md item 3.
// Address search uses real Google Places autocomplete (AddressAutocomplete,
// docs/02-external-apis.md §2) and map pin-drop (LocationPickerMap); between
// them, coordinates always resolve automatically.
//
// There is no manual lat/lng field. One existed behind an "Advanced"
// disclosure until 2026-08-07 and was removed as visual noise — see
// DECISIONS.md. Note this also removed the only way to save a location
// outside New Zealand by typing, since address search is region-restricted
// (placesService.ts); the map picker is now the only route to one.
type ClimateOverride = "yes" | "no" | "default";

function toClimateOverride(value: boolean | undefined): ClimateOverride {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "default";
}

function fromClimateOverride(value: ClimateOverride): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

export interface LocationFormValues {
  label: string;
  address: string;
  lat: number;
  lng: number;
  isFavorite: boolean;
  hasReliableClimateControl: boolean | undefined;
  preferredGearIds: string[];
  notes: string;
}

interface Props {
  initial?: SavedLocation;
  onSubmit: (values: LocationFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** Render without the screen-level ScrollView, for callers that already
   *  scroll (LocationDetail nests this inside its disclosure section, and a
   *  ScrollView inside a ScrollView neither scrolls nor sizes correctly). */
  embedded?: boolean;
}

export default function LocationForm({ initial, onSubmit, onCancel, onDelete, embedded = false }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const common = useCommonStyles();
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  // Internal state, not a field: coordinates are set by the address search or
  // a dropped map pin and never typed. The manual lat/lng inputs were removed
  // on 2026-08-07 — see DECISIONS.md.
  const [lat, setLat] = useState(initial ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : "");
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false);
  const [climate, setClimate] = useState<ClimateOverride>(toClimateOverride(initial?.hasReliableClimateControl));
  const [preferredGearIds, setPreferredGearIds] = useState<string[]>(initial?.preferredGearIds ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const { options: gearOptions, loaded: gearLoaded } = useGearOptions();
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  // Number("") is 0, not NaN — an empty field must be checked for
  // separately, or a brand-new location (lat/lng still blank) reads as a
  // valid (0,0) coordinate instead of "not set yet."
  const hasValidCoords = lat.trim() !== "" && lng.trim() !== "" && !Number.isNaN(latNum) && !Number.isNaN(lngNum);
  // The label is no longer part of this: an address already names the place,
  // and making the user invent a second name for it before they can save was
  // a gate with nothing behind it. resolveLocationLabel() fills it in on
  // submit, so the stored label is still always a real string.
  const canSubmit = address.trim().length > 0 && hasValidCoords;
  // Shown under the empty field so the default isn't a surprise after saving.
  const labelPlaceholder = shortAddressLabel(address) || "Home";

  async function handleMapConfirm(coords: { lat: number; lng: number }, resolvedLabel?: string) {
    setMapPickerOpen(false);
    setLat(String(coords.lat));
    setLng(String(coords.lng));
    // The picker already reverse-geocoded this pin live while it was being
    // dragged — reuse that instead of paying for the same Google Geocoding
    // call twice. Only falls back to a fresh call if the live resolution
    // never completed (e.g. a very fast confirm tap).
    if (resolvedLabel) {
      setAddress(resolvedLabel);
      return;
    }
    setResolvingPin(true);
    const result = await reverseGeocode(coords.lat, coords.lng);
    setResolvingPin(false);
    // A failed reverse-geocode leaves the address field as-is — the pin's
    // coordinates are still set and usable, the user just needs to type a
    // label/address themselves rather than getting one for free.
    if ("data" in result) setAddress(result.data.formattedAddress);
  }

  const Container = embedded ? View : ScrollView;
  const containerProps = embedded ? {} : { contentContainerStyle: common.scrollContent };

  return (
    <Container {...containerProps}>
      <FormSection title="Location">
        <View>
          <Text style={common.fieldLabel}>Label (optional)</Text>
          <TextInput
            style={common.input}
            placeholderTextColor={theme.textSecondary}
            value={label}
            onChangeText={setLabel}
            placeholder={labelPlaceholder}
            accessibilityLabel={`Label, optional. Defaults to ${labelPlaceholder}`}
          />
        </View>

        <View>
          <Text style={common.fieldLabel}>Address</Text>
          <AddressAutocomplete
            value={address}
            onChangeText={setAddress}
            onSelectPlace={(result) => {
              setAddress(result.address);
              setLat(String(result.lat));
              setLng(String(result.lng));
            }}
            placeholder="123 Queen St, Auckland"
          />
        </View>

        {/* Was a bare text link sitting between two full-width fields, which
            read as a caption rather than the equal alternative to address
            search that it is. Same bordered-button weight as the form's own
            Cancel, and it says which of the two states it's in. */}
        <Pressable
          onPress={() => setMapPickerOpen(true)}
          style={styles.mapPickerButton}
          disabled={resolvingPin}
          accessibilityRole="button"
          accessibilityLabel={hasValidCoords ? "Adjust the pin on the map" : "Pick this location on a map"}
        >
          {resolvingPin ? (
            <ActivityIndicator size="small" color={theme.accentWalk} />
          ) : (
            <View style={styles.mapPickerContent}>
              <ActionIcon kind="pin" size={15} color={theme.accentWalk} />
              <Text style={styles.mapPickerLabel}>{hasValidCoords ? "Adjust pin on map" : "Pick on map"}</Text>
            </View>
          )}
        </Pressable>

        <LocationPickerMap
          visible={mapPickerOpen}
          initialCoords={hasValidCoords ? { lat: latNum, lng: lngNum } : undefined}
          onConfirm={handleMapConfirm}
          onClose={() => setMapPickerOpen(false)}
        />

      </FormSection>

      <FormSection title="Preferences">
        <Pressable onPress={() => setIsFavorite((v) => !v)} style={styles.favoriteRow}>
          <ActionIcon kind="star" size={20} color={theme.favoriteStar} filled={isFavorite} />
          <Text style={common.fieldLabel}>Favorite</Text>
        </Pressable>

        <View>
          <Text style={common.fieldLabel}>Reliable AC/heating here?</Text>
          <View style={styles.segmentRow}>
            {(["yes", "no", "default"] as ClimateOverride[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setClimate(option)}
                style={[styles.segment, climate === option && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, climate === option && styles.segmentLabelActive]}>
                  {option === "yes" ? "Yes" : option === "no" ? "No" : "Don't override"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Standing choices about this place, alongside the AC/heating
            override above — that field says what the place is like, these two
            say what the user wants there. Both live under Preferences rather
            than getting a section of their own, so the form stays two cards. */}
        <View>
          <Text style={common.fieldLabel}>Usual gear here</Text>
          {!gearLoaded ? null : gearOptions.length === 0 ? (
            <Text style={styles.hint}>Nothing in your wardrobe yet — add gear and it&apos;ll show up here to choose from.</Text>
          ) : (
            <>
              <Text style={styles.hint}>
                Shown with the forecast whenever you open this place. It doesn&apos;t change what the app recommends for
                a journey.
              </Text>
              <GearMultiSelect options={gearOptions} selectedIds={preferredGearIds} onChange={setPreferredGearIds} />
            </>
          )}
        </View>

        <View>
          <Text style={common.fieldLabel}>Notes</Text>
          <TextInput
            style={[common.input, styles.notesInput]}
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything worth remembering about this place"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        canSubmit={canSubmit}
        onSubmit={() =>
          onSubmit({
            label: resolveLocationLabel(label, address),
            address: address.trim(),
            lat: latNum,
            lng: lngNum,
            isFavorite,
            hasReliableClimateControl: fromClimateOverride(climate),
            preferredGearIds,
            notes: notes.trim(),
          })
        }
        destructive={onDelete ? { label: "Delete location", onPress: onDelete } : undefined}
      />
    </Container>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    mapPickerButton: {
      alignSelf: "flex-start",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
    },
    mapPickerContent: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    mapPickerLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    hint: { ...TYPE.caption, color: theme.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xs, lineHeight: 18 },
    // A pill-shaped single-line input is the wrong shape for a few sentences,
    // so the notes field squares off and grows.
    notesInput: { minHeight: 88, borderRadius: RADIUS.card, paddingTop: SPACING.md },
    favoriteRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 44 },
    segmentRow: { flexDirection: "row", gap: SPACING.sm },
    segment: { flex: 1, minHeight: 44, justifyContent: "center", borderRadius: RADIUS.pill, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
    segmentActive: selectedChipStyle(theme),
    segmentLabel: { ...TYPE.caption, color: theme.textPrimary },
    // Matches SettingsScreen.tsx's equivalent segmented control — both used
    // to disagree (theme.bg vs white for the active label); white reads
    // correctly against accentWalk in both themes, so unified on that.
    segmentLabelActive: selectedChipLabelStyle(theme),
  });
}

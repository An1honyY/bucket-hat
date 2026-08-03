import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { SavedLocation } from "../../types";
import useTheme from "../../theme/useTheme";
import useCommonStyles from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import LocationPickerMap from "../../components/LocationPickerMap";
import ActionIcon from "../../components/ActionIcon";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import { reverseGeocode } from "../../services/placesService";

// Add/edit form for a SavedLocation — docs/04-screens-navigation.md item 3.
// Address search uses real Google Places autocomplete (AddressAutocomplete,
// docs/02-external-apis.md §2) and map pin-drop (LocationPickerMap) — both
// lat/lng and address can resolve automatically now, so raw coordinates are
// no longer a primary-UX field; a collapsed "Advanced" section still
// exposes them as manual overrides for power users or when Places is
// unconfigured/offline (2026-07-21 onboarding rework; map picker closes
// the "map pin-drop deferred" half of that decision — see DECISIONS.md).
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
}

interface Props {
  initial?: SavedLocation;
  onSubmit: (values: LocationFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function LocationForm({ initial, onSubmit, onCancel, onDelete }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const common = useCommonStyles();
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState(initial ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : "");
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false);
  const [climate, setClimate] = useState<ClimateOverride>(toClimateOverride(initial?.hasReliableClimateControl));
  // Collapsed by default, same pattern as Settings' "Advanced" threshold
  // override — auto-expanded when editing an existing location, since its
  // lat/lng are already meaningful values rather than blank fields waiting
  // on a Places selection.
  const [advancedExpanded, setAdvancedExpanded] = useState(!!initial);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  // Number("") is 0, not NaN — an empty field must be checked for
  // separately, or a brand-new location (lat/lng still blank) reads as a
  // valid (0,0) coordinate instead of "not set yet."
  const hasValidCoords = lat.trim() !== "" && lng.trim() !== "" && !Number.isNaN(latNum) && !Number.isNaN(lngNum);
  const canSubmit = label.trim().length > 0 && address.trim().length > 0 && hasValidCoords;

  async function handleMapConfirm(coords: { lat: number; lng: number }, resolvedLabel?: string) {
    setMapPickerOpen(false);
    setLat(String(coords.lat));
    setLng(String(coords.lng));
    // Surface the coordinates a dropped pin just set, same as the
    // edit-an-existing-location case above — they're meaningful now, not
    // blank fields waiting on a selection.
    setAdvancedExpanded(true);
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

  return (
    <ScrollView contentContainerStyle={common.scrollContent}>
      <FormSection title="Location">
        <View>
          <Text style={common.fieldLabel}>Label</Text>
          <TextInput style={common.input} placeholderTextColor={theme.textSecondary} value={label} onChangeText={setLabel} placeholder="Home" />
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

        <View>
          <Pressable onPress={() => setAdvancedExpanded((v) => !v)}>
            <Text style={styles.disclosure}>{advancedExpanded ? "▾" : "▸"} Advanced — set exact coordinates</Text>
          </Pressable>
          {advancedExpanded && (
            <>
              <Text style={styles.hint}>
                Filled in automatically when you pick an address above — only change these if the search didn&apos;t
                find the right spot.
              </Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={common.fieldLabel}>Latitude</Text>
                  <TextInput style={common.input} placeholderTextColor={theme.textSecondary} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" placeholder="-36.8485" />
                </View>
                <View style={styles.half}>
                  <Text style={common.fieldLabel}>Longitude</Text>
                  <TextInput style={common.input} placeholderTextColor={theme.textSecondary} value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" placeholder="174.7633" />
                </View>
              </View>
            </>
          )}
        </View>
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
      </FormSection>

      <FormActions
        onCancel={onCancel}
        canSubmit={canSubmit}
        onSubmit={() =>
          onSubmit({
            label: label.trim(),
            address: address.trim(),
            lat: latNum,
            lng: lngNum,
            isFavorite,
            hasReliableClimateControl: fromClimateOverride(climate),
          })
        }
        destructive={onDelete ? { label: "Delete location", onPress: onDelete } : undefined}
      />
    </ScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: SPACING.md },
    half: { flex: 1 },
    disclosure: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary, minHeight: 44, textAlignVertical: "center" },
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
    favoriteRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 44 },
    segmentRow: { flexDirection: "row", gap: SPACING.sm },
    segment: { flex: 1, minHeight: 44, justifyContent: "center", borderRadius: RADIUS.pill, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
    segmentActive: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk },
    segmentLabel: { ...TYPE.caption, color: theme.textPrimary },
    // Matches SettingsScreen.tsx's equivalent segmented control — both used
    // to disagree (theme.bg vs white for the active label); white reads
    // correctly against accentWalk in both themes, so unified on that.
    segmentLabelActive: { color: "#FFFFFF", fontWeight: "600" },
  });
}

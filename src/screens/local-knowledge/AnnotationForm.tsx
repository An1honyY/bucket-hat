import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { EnvironmentAnnotation, EnvironmentEffectType } from "../../types";
import { EFFECT_META, EFFECT_OPTIONS } from "./effectMeta";
import RadiusSlider from "../../components/RadiusSlider";
import EffectIcon from "../../components/EffectIcon";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

// Shared add/edit form for an EnvironmentAnnotation — docs/04-screens-
// navigation.md §4.5. Used both as the Journey Detail map long-press sheet
// (coordinates pre-filled from the tap, coordinate fields hidden) and the
// Local knowledge list's edit view (coordinates shown as editable lat/lng
// number fields — the same no-map-dependency precedent as Locations CRUD,
// see DECISIONS.md). Radius is a continuous 10–300m drag slider (default
// 60m) — real spots (a doorway awning, a bus shelter, a windy corner) are
// often far smaller than the old stepped row's 50m floor allowed.
const RADIUS_MIN = 10;
const RADIUS_MAX = 300;
const RADIUS_STEP = 5;
const RADIUS_DEFAULT = 60;

export interface AnnotationFormValues {
  label: string;
  effect: EnvironmentEffectType;
  lat: number;
  lng: number;
  radiusM: number;
  notes?: string;
}

interface Props {
  // Add-from-map: pass the tapped coordinates and leave `initial` unset.
  // Edit: pass the full existing annotation.
  initial?: EnvironmentAnnotation;
  initialCoordinate?: { lat: number; lng: number };
  showCoordinateFields?: boolean;
  onSave: (values: AnnotationFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
  // Live radius-circle preview on the map underneath the sheet (§4.5).
  onPreviewChange?: (preview: { lat: number; lng: number; radiusM: number }) => void;
}

export default function AnnotationForm({
  initial,
  initialCoordinate,
  showCoordinateFields = false,
  onSave,
  onCancel,
  onDelete,
  onPreviewChange,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [effect, setEffect] = useState<EnvironmentEffectType>(initial?.effect ?? "wind-tunnel");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [radiusM, setRadiusM] = useState(initial?.radiusM ?? RADIUS_DEFAULT);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lat, setLat] = useState(String(initial?.lat ?? initialCoordinate?.lat ?? ""));
  const [lng, setLng] = useState(String(initial?.lng ?? initialCoordinate?.lng ?? ""));

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const canSave = label.trim().length > 0 && lat !== "" && lng !== "" && !Number.isNaN(latNum) && !Number.isNaN(lngNum);

  function pickRadius(value: number) {
    setRadiusM(value);
    if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
      onPreviewChange?.({ lat: latNum, lng: lngNum, radiusM: value });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <FormSection title="What's special about this spot?">
        <View style={styles.effectGrid}>
          {EFFECT_OPTIONS.map((option) => {
            const active = option === effect;
            return (
              <Pressable
                key={option}
                onPress={() => setEffect(option)}
                style={[styles.effectButton, active && styles.effectButtonActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <EffectIcon kind={option} size={20} color={active ? theme.bg : theme.textPrimary} />
                <Text style={[styles.effectLabel, active && styles.effectLabelActive]}>{EFFECT_META[option].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={theme.textSecondary}
            value={label}
            onChangeText={setLabel}
            placeholder={EFFECT_META[effect].placeholder}
          />
        </View>
      </FormSection>

      <FormSection title="Range">
        <View>
          <Text style={styles.fieldLabel}>Applies within {radiusM}m</Text>
          <RadiusSlider value={radiusM} onChange={pickRadius} min={RADIUS_MIN} max={RADIUS_MAX} step={RADIUS_STEP} />
          <View style={styles.radiusScale}>
            <Text style={styles.radiusScaleLabel}>{RADIUS_MIN}m</Text>
            <Text style={styles.radiusScaleLabel}>{RADIUS_MAX}m</Text>
          </View>
        </View>
      </FormSection>

      <FormSection title="Details">
        {showCoordinateFields && (
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Latitude</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor={theme.textSecondary}
                value={lat}
                onChangeText={setLat}
                keyboardType="numbers-and-punctuation"
                placeholder="-36.8485"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Longitude</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor={theme.textSecondary}
                value={lng}
                onChangeText={setLng}
                keyboardType="numbers-and-punctuation"
                placeholder="174.7633"
              />
            </View>
          </View>
        )}

        <View>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            placeholder="Shown when this spot affects a journey"
            multiline
          />
        </View>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        canSubmit={canSave}
        onSubmit={() =>
          onSave({
            label: label.trim(),
            effect,
            lat: latNum,
            lng: lngNum,
            radiusM,
            notes: notes.trim() || undefined,
          })
        }
        destructive={onDelete ? { label: "Delete annotation", onPress: onDelete } : undefined}
      />
    </ScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { padding: 16 },
    fieldLabel: { ...TYPE.caption, color: theme.textSecondary, marginBottom: SPACING.xs },
    effectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    effectButton: {
      width: "31%",
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      gap: 4,
    },
    effectButtonActive: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk },
    effectLabel: { ...TYPE.micro, textAlign: "center", color: theme.textPrimary },
    effectLabelActive: { color: "#FFFFFF", fontWeight: "600" },
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, minHeight: 44, ...TYPE.body, color: theme.textPrimary },
    notesInput: { minHeight: 64, textAlignVertical: "top" },
    radiusScale: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
    radiusScaleLabel: { ...TYPE.micro, color: theme.textSecondary },
    row: { flexDirection: "row", gap: 12 },
    half: { flex: 1 },
  });
}

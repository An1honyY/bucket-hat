import { StyleSheet, Text, View } from "react-native";
import useTheme from "../../theme/useTheme";
import { conditionColorForSeverity } from "../../theme/tokens";
import { classifyWeather } from "../../lib/weather";
import { HIGH_WIND_KPH } from "../../lib/recommend";
import type { EnvironmentEffectType, JourneyLeg } from "../../types";
import ModeIcon from "../../components/ModeIcon";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import EffectIcon from "../../components/EffectIcon";
import { EFFECT_META } from "../local-knowledge/effectMeta";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";

function formatTimeRange(startTime: string, durationMin: number, hour12: boolean): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${formatTime(start.toISOString(), hour12)} – ${formatTime(end.toISOString(), hour12)}`;
}

// §3.4/§9.3 — the leg-level "why" line when saved EnvironmentAnnotations
// (Phase 6) apply to this stretch. Labels mirror effectMeta.ts's picker
// copy so the leg note and the Local knowledge screen speak the same
// language. Returns structured entries (not a pre-joined string) so the
// row can render a real EffectIcon per entry instead of an emoji glyph.
function annotationEffects(leg: JourneyLeg): EnvironmentEffectType[] {
  const effects: EnvironmentEffectType[] = [];
  if (leg.windEffect === "amplified") effects.push("wind-tunnel");
  if (leg.windEffect === "sheltered") effects.push("wind-sheltered");
  if (leg.sunEffect === "exposed") effects.push("sun-exposed");
  if (leg.sunEffect === "shaded") effects.push("shaded");
  if (leg.highReflection) effects.push("high-reflection");
  if (leg.rainCovered) effects.push("rain-cover");
  return effects;
}

// Phase 22 — where this leg sits relative to the user's actual progress.
// "upcoming" is the only state a journey that isn't being followed ever has,
// so the planning view renders exactly as it did before.
export type LegState = "completed" | "current" | "upcoming";

interface Props {
  leg: JourneyLeg;
  state?: LegState;
  /** 0-1 through the current leg; only read when state === "current". */
  progressFraction?: number;
  /** Pace-adjusted minutes left on this leg, for the current leg's meta line. */
  remainingMin?: number;
}

export default function LegRow({ leg, state = "upcoming", progressFraction = 0, remainingMin }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const isCurrent = state === "current";
  const isCompleted = state === "completed";
  const pillLabel = !leg.outdoor && !leg.isStationary ? (leg.climate === "ac" ? "AC" : leg.climate === "heated" ? "Heated" : undefined) : undefined;
  const isPill = pillLabel !== undefined;
  const modeIconKind = leg.isStationary ? "stationary" : !leg.outdoor ? "indoor" : leg.mode;
  const condition = leg.outdoor && leg.weather ? classifyWeather(leg.weather.weatherCode, leg.weather.precipMm, leg.weather.windKph) : undefined;
  const effects = annotationEffects(leg);
  // §9.6 — one coherent screen-reader label per row (icon + text + badge
  // read as a single stop) rather than three separate ones.
  const accessibilityLabel = [
    isCompleted ? "Completed" : isCurrent ? "Currently on" : undefined,
    leg.label,
    isCurrent && remainingMin !== undefined ? `${Math.max(1, Math.round(remainingMin))} minutes left` : `${leg.durationMin} minutes`,
    leg.weather ? `${Math.round(leg.weather.apparentTempC)} degrees` : undefined,
    condition?.label,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View
      style={[styles.row, isCurrent && styles.rowCurrent, isCompleted && styles.rowCompleted]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconCircle, isPill && styles.pillCircle, isCurrent && { backgroundColor: theme.accentWalk }]}>
        {isPill ? (
          <Text style={styles.pillLabel}>{pillLabel}</Text>
        ) : (
          <ModeIcon kind={modeIconKind} size={16} color={isCurrent ? "#FFFFFF" : isCompleted ? theme.textSecondary : theme.textPrimary} />
        )}
      </View>
      <View style={styles.center}>
        <Text style={[styles.label, isCompleted && styles.labelCompleted]}>{leg.label}</Text>
        {/* The remaining-time text is the point, not the bar underneath it:
            §9.6 requires the leg list to be a complete summary on its own,
            so progress can never be conveyed by a graphic alone. */}
        <Text style={styles.meta}>
          {isCurrent && remainingMin !== undefined
            ? `${Math.max(1, Math.round(remainingMin))} min left · ${formatTimeRange(leg.startTime, leg.durationMin, hour12)}`
            : `${leg.durationMin} min · ${formatTimeRange(leg.startTime, leg.durationMin, hour12)}`}
        </Text>
        {isCurrent && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(Math.min(1, Math.max(0, progressFraction)) * 100)}%` }]} />
          </View>
        )}
        {effects.length > 0 && (
          <View style={styles.annotationRow}>
            {effects.map((effect) => (
              <View key={effect} style={styles.annotationChip}>
                <EffectIcon kind={effect} size={12} color={theme.accentWalk} />
                <Text style={styles.annotationChipText}>{EFFECT_META[effect].label}</Text>
              </View>
            ))}
            <Text style={styles.annotationLine}>— a spot you&apos;ve marked</Text>
          </View>
        )}
      </View>
      <View style={styles.badgeColumn}>
        {leg.outdoor && leg.weather && condition && (
          <View style={[styles.badge, { backgroundColor: conditionColorForSeverity(theme, condition.severity) }]}>
            <WeatherIcon kind={weatherIconKindFor(condition)} size={12} color="#FFFFFF" />
            <Text style={styles.badgeText}>
              {Math.round(leg.weather.apparentTempC)}°C
              {leg.weather.windKph > HIGH_WIND_KPH ? ` · ${Math.round(leg.weather.windKph)} km/h` : ""}
            </Text>
          </View>
        )}
        {(leg.mode === "bus" || leg.mode === "train") && leg.delayMinutes !== undefined && (
          <View style={[styles.delayPill, leg.delayMinutes > 0 ? styles.delayPillLate : styles.delayPillOnTime]}>
            <Text style={styles.delayPillText}>{leg.delayMinutes > 0 ? `+${leg.delayMinutes} min` : "On time"}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: theme.surface, marginBottom: 12 },
    // Phase 22 — the leg you're on gets an accent edge and a raised surface;
    // a finished one recedes without disappearing.
    rowCurrent: { backgroundColor: theme.surfaceRaised, borderLeftWidth: 3, borderLeftColor: theme.accentWalk, paddingLeft: 9 },
    // Dimmed via tokens rather than the `opacity` prop, so contrast against
    // the background stays predictable instead of compounding.
    rowCompleted: { paddingVertical: 8, marginBottom: 8 },
    labelCompleted: { color: theme.textSecondary, fontWeight: "500" },
    progressTrack: { height: 3, borderRadius: 2, backgroundColor: theme.border, marginTop: 6, overflow: "hidden" },
    progressFill: { height: 3, borderRadius: 2, backgroundColor: theme.accentWalk },
    iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.border },
    pillCircle: { width: "auto", paddingHorizontal: 8, borderRadius: 8, backgroundColor: theme.acBadge },
    pillLabel: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
    center: { flex: 1 },
    label: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    meta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    annotationRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 2 },
    annotationChip: { flexDirection: "row", alignItems: "center", gap: 3 },
    annotationChipText: { fontSize: 12, fontWeight: "600", color: theme.accentWalk },
    annotationLine: { fontSize: 12, color: theme.textSecondary },
    badgeColumn: { alignItems: "flex-end", gap: 4 },
    badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.border },
    // White text on top of a condition* fill (§9.1) for contrast, matching
    // the severe-weather banner's same badge-on-condition-color pattern.
    badgeText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
    delayPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    delayPillOnTime: { backgroundColor: theme.border },
    delayPillLate: { backgroundColor: theme.uvBadge },
    delayPillText: { fontSize: 11, fontWeight: "600", color: theme.textPrimary },
  });
}

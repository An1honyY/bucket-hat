import { StyleSheet, Text, View } from "react-native";
import useTheme from "../../theme/useTheme";
import { conditionColorForSeverity } from "../../theme/tokens";

import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import { classifyWeather, feelsLikeDiverges, formatWindKph } from "../../lib/weather";
import { HIGH_WIND_KPH } from "../../lib/recommend";
import type { EnvironmentEffectType, JourneyLeg } from "../../types";
import ModeIcon from "../../components/ModeIcon";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import EffectIcon from "../../components/EffectIcon";
import { EFFECT_META } from "../local-knowledge/effectMeta";
import { formatTime } from "../../lib/formatTime";
import { formatDuration, spokenDuration } from "../../lib/formatDuration";
import { formatDistance, totalStepDistanceM } from "../../lib/navigationSteps";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";

// One leg of the journey, as a row on a connected timeline — §9.3.
//
// This used to be a free-standing card per leg: six identical rounded boxes
// down the screen with no thread between them, no clock times, and nothing to
// say which came first beyond their order. Every transit app worth using —
// Google Maps, Citymapper, Transit — draws the itinerary as a rail: departure
// time in a column on the left, a node per leg joined by a line, the detail to
// the right of it. That's the convention people already know, and it's what
// makes a journey read as a sequence rather than a list.
//
// So: a fixed time column, a rail with a node, and the leg's own detail
// beside it. The rail's continuity is why the rows have no card of their own —
// the containing section is the surface, and boxing each row again would cut
// the thread this exists to draw.

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
  /** Suppresses the rail above the node — this leg starts the journey. */
  isFirst?: boolean;
  /** Suppresses the rail below the node — nothing follows this leg. */
  isLast?: boolean;
}

export default function LegRow({
  leg,
  state = "upcoming",
  progressFraction = 0,
  remainingMin,
  isFirst = false,
  isLast = false,
}: Props) {
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
  // Distance is what a directions app leads with alongside duration, and we
  // already have it per leg from the turn list.
  const distance = formatDistance(totalStepDistanceM(leg.steps ?? []));
  const departure = formatTime(leg.startTime, hour12);

  // §9.6 — one coherent screen-reader label per row (time + icon + text +
  // badge read as a single stop) rather than several separate ones.
  const accessibilityLabel = [
    isCompleted ? "Completed" : isCurrent ? "Currently on" : undefined,
    `Departs ${departure}`,
    leg.label,
    isCurrent && remainingMin !== undefined ? `${spokenDuration(remainingMin)} left` : spokenDuration(leg.durationMin),
    distance || undefined,
    // Both figures when they diverge: the badge can lean on the note below
    // for the gap, but a row read aloud is self-contained by §9.6 and has no
    // "below" to lean on.
    leg.weather
      ? feelsLikeDiverges(leg.weather.tempC, leg.weather.apparentTempC)
        ? `${Math.round(leg.weather.tempC)} degrees, feels like ${Math.round(leg.weather.apparentTempC)}`
        : `${Math.round(leg.weather.tempC)} degrees`
      : undefined,
    leg.weather && leg.weather.windKph > HIGH_WIND_KPH ? `wind ${formatWindKph(leg.weather.windKph)}` : undefined,
    condition?.label,
  ]
    .filter(Boolean)
    .join(", ");

  const nodeColor = isCurrent ? theme.accentWalk : isCompleted ? theme.border : theme.surfaceRaised;

  return (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.timeColumn}>
        <Text style={[styles.time, isCurrent && styles.timeCurrent, isCompleted && styles.timeCompleted]}>{departure}</Text>
      </View>

      <View style={styles.railColumn}>
        {/* Drawn behind the node, not between rows, so the thread is
            continuous even where a row's height changes. */}
        <View style={[styles.rail, styles.railTop, isFirst && styles.railHidden, isCompleted && styles.railDone]} />
        <View style={[styles.rail, styles.railBottom, isLast && styles.railHidden, isCompleted && styles.railDone]} />
        <View style={[styles.node, isPill && styles.nodePill, { backgroundColor: nodeColor }]}>
          {isPill ? (
            <Text style={styles.pillLabel}>{pillLabel}</Text>
          ) : (
            <ModeIcon kind={modeIconKind} size={15} color={isCurrent ? "#FFFFFF" : isCompleted ? theme.textSecondary : theme.textPrimary} />
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headline}>
          <Text style={[styles.label, isCompleted && styles.labelCompleted]} numberOfLines={2}>
            {leg.label}
          </Text>
          {leg.outdoor && leg.weather && condition && (
            <View style={[styles.badge, { backgroundColor: conditionColorForSeverity(theme, condition.severity) }]}>
              <WeatherIcon kind={weatherIconKindFor(condition)} size={11} color="#FFFFFF" />
              {/* The air temperature — see the note in JourneyDirections:
                  the badge is the figure the recommendation note contrasts
                  against, so the two must not disagree. */}
              <Text style={styles.badgeText}>{Math.round(leg.weather.tempC)}°</Text>
            </View>
          )}
        </View>

        {/* The remaining-time text is the point, not the bar underneath it:
            §9.6 requires the leg list to be a complete summary on its own,
            so progress can never be conveyed by a graphic alone. */}
        <Text style={styles.meta}>
          {[
            isCurrent && remainingMin !== undefined ? `${formatDuration(remainingMin)} left` : formatDuration(leg.durationMin),
            distance || undefined,
            leg.weather && leg.weather.windKph > HIGH_WIND_KPH ? formatWindKph(leg.weather.windKph) : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>

        {isCurrent && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(Math.min(1, Math.max(0, progressFraction)) * 100)}%` }]} />
          </View>
        )}

        {(leg.mode === "bus" || leg.mode === "train") && leg.delayMinutes !== undefined && (
          <View style={styles.pillRow}>
            <View style={[styles.delayPill, leg.delayMinutes > 0 ? styles.delayPillLate : styles.delayPillOnTime]}>
              <Text style={styles.delayPillText}>
                {leg.delayMinutes > 0 ? `${formatDuration(leg.delayMinutes)} late` : "On time"}
              </Text>
            </View>
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
    </View>
  );
}

// Rail geometry. The node is centred in its column and the two rail segments
// run from the row's edges to it, so consecutive rows join seamlessly however
// tall each one is.
const NODE = 30;
const RAIL_COLUMN = 34;
const RAIL_WIDTH = 2;
const NODE_CENTER_Y = 15;

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "flex-start", paddingBottom: SPACING.lg },
    timeColumn: { width: 62, paddingTop: 1, alignItems: "flex-end", paddingRight: SPACING.sm },
    time: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary, fontVariant: ["tabular-nums"] },
    timeCurrent: { color: theme.accentWalk, fontWeight: "700" },
    timeCompleted: { opacity: 0.55 },

    // `alignSelf: stretch` is what makes the rail reach the next row: the
    // parent row is `alignItems: flex-start`, so without it this column
    // shrinks to the node's own 30px and `railBottom`'s `bottom` resolves
    // against that instead of the row's real height — the thread stopped just
    // below each node and never joined up.
    railColumn: { width: RAIL_COLUMN, alignItems: "center", alignSelf: "stretch" },
    rail: { position: "absolute", width: RAIL_WIDTH, backgroundColor: theme.border, left: RAIL_COLUMN / 2 - RAIL_WIDTH / 2 },
    railTop: { top: -SPACING.lg, height: NODE_CENTER_Y + SPACING.lg },
    railBottom: { top: NODE_CENTER_Y, bottom: -SPACING.lg },
    railHidden: { backgroundColor: "transparent" },
    // A finished stretch keeps the thread but stops competing with the one
    // ahead — same reasoning as the traveled polyline on the map.
    railDone: { opacity: 0.4 },
    node: {
      width: NODE,
      height: NODE,
      borderRadius: NODE / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.bg,
    },
    nodePill: { width: "auto", minWidth: NODE, paddingHorizontal: 7, borderRadius: 9 },
    pillLabel: { ...TYPE.micro, fontWeight: "700", color: theme.textPrimary },

    content: { flex: 1, paddingLeft: SPACING.sm, gap: 2 },
    headline: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    label: { flex: 1, ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    labelCompleted: { color: theme.textSecondary, fontWeight: "500" },
    meta: { ...TYPE.caption, color: theme.textSecondary },
    progressTrack: { height: 3, borderRadius: 2, backgroundColor: theme.border, marginTop: 4, overflow: "hidden" },
    progressFill: { height: 3, borderRadius: 2, backgroundColor: theme.accentWalk },

    badge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.pill },
    // White text on a condition* fill (§9.1) for contrast, matching the
    // severe-weather banner's same badge-on-condition-color pattern.
    badgeText: { ...TYPE.micro, fontWeight: "700", color: "#FFFFFF" },

    pillRow: { flexDirection: "row", marginTop: 2 },
    delayPill: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.pill },
    delayPillOnTime: { backgroundColor: theme.border },
    delayPillLate: { backgroundColor: theme.uvBadge },
    delayPillText: { ...TYPE.micro, fontWeight: "600", color: theme.textPrimary },

    annotationRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 2 },
    annotationChip: { flexDirection: "row", alignItems: "center", gap: 3 },
    annotationChipText: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    annotationLine: { ...TYPE.caption, color: theme.textSecondary },
  });
}

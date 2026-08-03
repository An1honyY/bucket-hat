import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRecommendation } from "../../lib/useRecommendation";
import { classifyWeather } from "../../lib/weather";
import WeatherIcon, { weatherIconKindFor, type WeatherIconKind } from "../../components/WeatherIcon";
import ActionIcon from "../../components/ActionIcon";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle, type ThemeTokens } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { Journey } from "../../types";

// Today-tab compact journey card — docs/09-design-system.md §9.4.

interface Props {
  journey: Journey;
  isNextUp: boolean;
  onPress: () => void;
  onLeavingNow: () => void;
  // §9.1 (2026-07-21) — TodayScreen passes down the same weather-reactive
  // tokens RightNowCard is using, so the whole screen shares one mood
  // rather than each card resolving its own; falls back to the plain base
  // theme for any other caller that renders this card standalone.
  theme?: ThemeTokens;
}

export default function JourneyCard({ journey, isNextUp, onPress, onLeavingNow, theme: themeProp }: Props) {
  const baseTheme = useTheme();
  const theme = themeProp ?? baseTheme;
  const styles = getStyles(theme);
  const recommendation = useRecommendation(journey);
  const topLayer = recommendation?.layers[recommendation.layers.length - 1];
  const topLabel = topLayer ? ("id" in topLayer ? topLayer.name : topLayer.fallbackText) : "Nothing extra needed — you're set";

  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const departTime = formatTime(journey.departTime, hour12);

  // §9.1 (2026-07-21) — per-leg chips (icon + temperature, or an "AC" pill
  // for indoor legs) replace the old color-only dot strip, in the leg
  // order they actually occur so the sequence reads as a mini timeline of
  // the trip, not just an unordered condition summary.
  const stages: ({ key: string; indoor: false; iconKind: WeatherIconKind; tempC: number } | { key: string; indoor: true })[] = journey.legs
    .filter((l) => (l.outdoor && l.weather) || (!l.outdoor && l.climate))
    .map((leg) =>
      leg.outdoor && leg.weather
        ? {
            key: leg.id,
            indoor: false,
            iconKind: weatherIconKindFor(classifyWeather(leg.weather.weatherCode, leg.weather.precipMm, leg.weather.windKph)),
            tempC: Math.round(leg.weather.apparentTempC),
          }
        : { key: leg.id, indoor: true }
    );

  // §9.6 — the per-leg chips below are still color-plus-icon-plus-number,
  // not color alone, but the full detail is also carried in words here so
  // a screen-reader user gets the same "what changes leg to leg" summary a
  // sighted user gets by scanning the chip row, without needing to open
  // Journey Detail first.
  const accessibilityLabel = [
    `${journey.origin.label} to ${journey.destination.label}`,
    `departs ${departTime}`,
    journey.recurrence ? "repeats" : undefined,
    journey.linkedReturnJourneyId ? "has a return trip" : undefined,
    topLabel,
  ]
    .filter(Boolean)
    .join(", ");

  // The card is a plain View, not a Pressable, so the "Leaving now" button
  // below can be a *sibling* of the card-body tap target rather than a child
  // of it. Nesting the two Pressables made react-native-web emit a <button>
  // inside a <button>, which is invalid HTML and made React complain on every
  // Today render; on native it also meant the inner tap was fighting the
  // outer card's press for the same gesture.
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        style={styles.body}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.headerRow}>
          <View style={styles.routeRow}>
            <Text style={styles.route}>
              {journey.origin.label} → {journey.destination.label}
            </Text>
            {journey.recurrence && <ActionIcon kind="repeat" size={13} color={theme.textSecondary} />}
            {journey.linkedReturnJourneyId && <ActionIcon kind="swap" size={13} color={theme.textSecondary} />}
          </View>
          <Text style={styles.time}>{departTime}</Text>
        </View>

        {stages.length > 0 && (
          <View style={styles.stagesRow}>
            {stages.map((stage, i) => (
              <View key={stage.key} style={styles.stageWrap}>
                {i > 0 && <Text style={styles.stageSep}>→</Text>}
                <View style={styles.stage}>
                  {stage.indoor ? (
                    <Text style={styles.stageText}>AC</Text>
                  ) : (
                    <>
                      <WeatherIcon kind={stage.iconKind} size={11} color={theme.textSecondary} />
                      <Text style={styles.stageText}>{stage.tempC}°</Text>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.topRecommendation}>{topLabel}</Text>
      </Pressable>

      {isNextUp && (
        <Pressable
          onPress={onLeavingNow}
          style={styles.leavingNowButton}
          accessibilityRole="button"
          accessibilityLabel="Leaving now — show the reduced gear check"
        >
          <Text style={styles.leavingNowLabel}>Leaving now</Text>
        </Pressable>
      )}
    </View>
  );
}

function getStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    // The card-body tap target. Carries the row spacing the card itself used
    // to own, so splitting the Pressable out of the card wrapper is visually
    // a no-op.
    body: { gap: SPACING.sm },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    routeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
    route: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 },
    time: { ...TYPE.caption, fontWeight: "700", color: theme.accentWalk },
    stagesRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
    stageWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
    stageSep: { ...TYPE.micro, color: theme.textSecondary, opacity: 0.5 },
    stage: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: theme.bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
    stageText: { ...TYPE.micro, fontWeight: "700", color: theme.textSecondary },
    topRecommendation: { ...TYPE.caption, color: theme.textPrimary },
    leavingNowButton: { marginTop: SPACING.xs, alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: SPACING.lg, borderRadius: RADIUS.pill, backgroundColor: theme.accentWalk },
    leavingNowLabel: { ...TYPE.caption, color: "#FFFFFF", fontWeight: "700" },
  });
}

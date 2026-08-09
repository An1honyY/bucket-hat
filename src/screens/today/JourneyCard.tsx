import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRecommendation } from "../../lib/useRecommendation";
import { classifyWeather } from "../../lib/weather";
import WeatherIcon, { weatherIconKindFor, type WeatherIconKind } from "../../components/WeatherIcon";
import ActionIcon from "../../components/ActionIcon";
import ModeIcon from "../../components/ModeIcon";
import MetaDivider from "../../components/MetaDivider";
import { formatTime } from "../../lib/formatTime";
import { formatDuration, spokenDuration } from "../../lib/formatDuration";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle, onTonal, withAlpha, type ThemeTokens } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { Journey } from "../../types";
import { gearPickLabel } from "../../lib/gearLabel";

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
  const topLabel = topLayer ? gearPickLabel(topLayer).text : "Nothing extra needed — you're set";

  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const departTime = formatTime(journey.departTime, hour12);

  // A summary of the trip, not a transcript of it.
  //
  // This was one chip per leg, in order, as a mini timeline. That reads
  // nicely for a three-leg commute and falls apart completely past about
  // six: a real transit journey came back with fifteen legs, which wrapped
  // to four rows of "12° → 12° → 12° → …" and pushed everything else off the
  // card, all to say that it is twelve degrees the whole way.
  //
  // What a summary card owes the reader is the shape of the trip and
  // anything that varies: how long it takes, which modes are involved, the
  // temperature range, and the worst weather on the way. The per-leg detail
  // is one tap away on Journey Detail, which is the screen built for it.
  const outdoorLegs = journey.legs.filter((l) => l.outdoor && l.weather);
  const temps = outdoorLegs.map((l) => Math.round(l.weather!.tempC));
  const minTemp = temps.length > 0 ? Math.min(...temps) : undefined;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : undefined;
  // The worst thing the weather does on this trip is the part worth a glance
  // — a dry commute with one rainy leg is a rainy commute.
  const worstCondition = outdoorLegs
    .map((l) => classifyWeather(l.weather!.weatherCode, l.weather!.precipMm, l.weather!.windKph))
    .reduce<ReturnType<typeof classifyWeather> | undefined>(
      (worst, c) => (worst === undefined || c.severity > worst.severity ? c : worst),
      undefined
    );
  const worstIconKind: WeatherIconKind | undefined = worstCondition ? weatherIconKindFor(worstCondition) : undefined;
  const tempRange =
    minTemp === undefined ? undefined : minTemp === maxTemp ? `${minTemp}°` : `${minTemp}–${maxTemp}°`;
  // Modes in the order they happen, de-duplicated — a bus trip that starts
  // and ends on foot is "walk, bus", not "walk, bus, walk". Same rule the
  // journey summary card on Journey Detail uses.
  const modes = journey.legs
    .filter((leg) => leg.outdoor && !leg.isStationary)
    .map((leg) => leg.mode)
    .filter((mode, i, all) => all.indexOf(mode) === i);
  const totalMin = journey.legs.reduce((sum, leg) => sum + leg.durationMin, 0);
  // Indoor stretches with real climate control, the same test LegRow uses for
  // its per-leg pill. "unconditioned" doesn't count — it's the absence of the
  // thing. Heated stretches are badged too, and the badge names which.
  const climateLegs = journey.legs.filter(
    (leg) => !leg.outdoor && !leg.isStationary && (leg.climate === "ac" || leg.climate === "heated")
  );
  const climateLegCount = climateLegs.length;
  // If a trip has both, AC is the one that changes what you'd wear outdoors.
  const climateLabel = climateLegs.some((leg) => leg.climate === "ac") ? "AC" : "Heated";

  // §9.6 — the per-leg chips below are still color-plus-icon-plus-number,
  // not color alone, but the full detail is also carried in words here so
  // a screen-reader user gets the same "what changes leg to leg" summary a
  // sighted user gets by scanning the chip row, without needing to open
  // Journey Detail first.
  const accessibilityLabel = [
    `${journey.origin.label} to ${journey.destination.label}`,
    `departs ${departTime}`,
    spokenDuration(totalMin),
    tempRange ? `${tempRange.replace("–", " to ")}, ${worstCondition?.label ?? ""}`.trim() : undefined,
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

        {/* Peer facts, separated by a hairline rule rather than a middot —
            see MetaDivider for why neither a dot nor bare spacing works here. */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{formatDuration(totalMin)}</Text>
          {modes.length > 0 && <MetaDivider />}
          <View style={styles.modeRow}>
            {modes.map((mode) => (
              <ModeIcon key={mode} kind={mode} size={13} color={theme.textSecondary} />
            ))}
          </View>
          {tempRange && worstIconKind && <MetaDivider />}
          {tempRange && worstIconKind && (
            <View style={styles.weatherChip}>
              <WeatherIcon kind={worstIconKind} size={12} color={theme.textSecondary} />
              <Text style={styles.summaryText}>{tempRange}</Text>
            </View>
          )}
          {/* A trip with a heated/air-conditioned stretch is worth seeing from
              Today: it's the difference between dressing for 13° and dressing
              for 13° plus twenty minutes of aggressive bus AC, and it's the
              one thing on this card you can't infer from the weather. */}
          {climateLegCount > 0 && <MetaDivider />}
          {climateLegCount > 0 && (
            <View style={styles.acBadge}>
              <Text style={styles.acBadgeLabel}>{climateLabel}</Text>
            </View>
          )}
        </View>

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
    // One line, fixed length whatever the leg count — see the note above the
    // summary in the component.
    // Back down to `sm` now the rule carries the separation: `lg` was needed
    // only while whitespace alone had to do it, and at that width the row
    // stopped reading as one line.
    summaryRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACING.sm },
    summaryText: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary },
    modeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    weatherChip: { flexDirection: "row", alignItems: "center", gap: 4 },
    // §9.3's indoor-leg pill, borrowed at summary scale for the whole trip.
    acBadge: {
      paddingHorizontal: SPACING.xs,
      paddingVertical: 1,
      borderRadius: RADIUS.pill,
      backgroundColor: withAlpha(theme.acBadge, theme.isLight ? 0.18 : 0.26),
    },
    acBadgeLabel: { ...TYPE.micro, fontWeight: "700", color: onTonal(theme.acBadge, theme.isLight) },
    topRecommendation: { ...TYPE.caption, color: theme.textPrimary },
    leavingNowButton: { marginTop: SPACING.xs, alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: SPACING.lg, borderRadius: RADIUS.pill, backgroundColor: theme.accentWalk },
    leavingNowLabel: { ...TYPE.caption, color: "#FFFFFF", fontWeight: "700" },
  });
}

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ActionIcon from "../../components/ActionIcon";
import ManeuverIcon, { maneuverKindFor } from "../../components/ManeuverIcon";
import ModeIcon from "../../components/ModeIcon";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import { condenseSteps, formatDistance, stepRepeatsLabel, totalStepDistanceM } from "../../lib/navigationSteps";
import { formatDuration, spokenDuration } from "../../lib/formatDuration";
import { classifyWeather } from "../../lib/weather";
import useTheme from "../../theme/useTheme";
import { conditionColorForSeverity } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { JourneyLeg, NavigationStep } from "../../types";

// The whole journey's directions, as one list — §9.3.
//
// Directions used to hang off each leg individually: a "Directions"
// disclosure under the walk to the stop, another under the walk from it, with
// the bus ride between them offering nothing. Four separate lists for one
// journey, each headed by the leg label rather than by what you actually do,
// and none of them readable as a route.
//
// One list, two levels:
//
//   • the **leg** — how long it takes and what the weather is doing on it.
//     These are the facts you plan around, so they're the ones that get the
//     duration and the temperature.
//   • the **turns** underneath it — the instruction and how far, and nothing
//     else. A street name is what you need at a junction; a timestamp and a
//     temperature on the same row are what you have to read past to find it.
//
// Legs with no turns (a bus ride, a wait at a stop) still appear as a leg
// row: they're part of getting there, and a directions list that skips the
// bus is a directions list with a hole in it.

interface Props {
  legs: JourneyLeg[];
  /** Open on first render — the full-screen map's overlay wants this. */
  initiallyOpen?: boolean;
  /** Render inline without the outer card, for callers that own the surface. */
  bare?: boolean;
}

/** The turns worth printing under a leg: condensed, minus any that only
 *  repeats the leg's own label. */
export function displayStepsFor(leg: JourneyLeg): NavigationStep[] {
  const condensed = condenseSteps(leg.steps ?? []);
  const meaningful = condensed.filter((step) => !stepRepeatsLabel(step.instruction, leg.label));
  // If filtering left nothing but there *were* steps, the leg label already
  // said it all — that's the transit-walk case, and the leg row alone is the
  // right amount of detail.
  return meaningful;
}

export default function JourneyDirections({ legs, initiallyOpen = false, bare = false }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [open, setOpen] = useState(initiallyOpen);

  // Waits are omitted: "waiting at Britomart for 6 minutes" is a leg-list
  // fact, not an instruction, and it breaks the rhythm of a list you read to
  // find out where to walk next.
  const shown = legs.filter((leg) => !leg.isStationary);
  if (shown.length === 0) return null;

  const totalMin = shown.reduce((sum, leg) => sum + leg.durationMin, 0);
  const totalM = shown.reduce((sum, leg) => sum + totalStepDistanceM(displayStepsFor(leg)), 0);
  const distance = formatDistance(totalM);
  const summary = distance ? `${distance}, ${formatDuration(totalMin)}` : formatDuration(totalMin);

  return (
    <View style={[styles.container, !bare && styles.card]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.disclosureRow}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? "Hide" : "Show"} directions, ${distance ? `${distance}, ` : ""}${spokenDuration(totalMin)}`}
      >
        {/* Grouped, so the row's space-between still has two children and the
            chevron stays beside its label instead of being pushed to the
            opposite edge from the summary. */}
        <View style={styles.disclosureLabel}>
          <ActionIcon kind={open ? "chevronDown" : "chevronRight"} size={14} color={theme.textPrimary} />
          <Text style={styles.disclosure}>Directions</Text>
        </View>
        <Text style={styles.disclosureMeta}>{summary}</Text>
      </Pressable>

      {open &&
        shown.map((leg, i) => (
          <LegDirections key={leg.id} leg={leg} first={i === 0} styles={styles} theme={theme} />
        ))}
    </View>
  );
}

function LegDirections({
  leg,
  first,
  styles,
  theme,
}: {
  leg: JourneyLeg;
  first: boolean;
  styles: ReturnType<typeof getStyles>;
  theme: ReturnType<typeof useTheme>;
}) {
  const steps = displayStepsFor(leg);
  const condition =
    leg.outdoor && leg.weather
      ? classifyWeather(leg.weather.weatherCode, leg.weather.precipMm, leg.weather.windKph)
      : undefined;
  const modeKind = leg.isStationary ? "stationary" : !leg.outdoor ? "indoor" : leg.mode;

  return (
    <View>
      <View
        style={[styles.legRow, !first && styles.legRowDivided]}
        accessible
        accessibilityLabel={[
          leg.label,
          spokenDuration(leg.durationMin),
          leg.weather ? `${Math.round(leg.weather.tempC)} degrees` : undefined,
          condition?.label,
        ]
          .filter(Boolean)
          .join(", ")}
      >
        <ModeIcon kind={modeKind} size={16} color={theme.textSecondary} />
        <Text style={styles.legLabel} numberOfLines={2}>
          {leg.label}
        </Text>
        <Text style={styles.legDuration}>{formatDuration(leg.durationMin)}</Text>
        {/* The temperature belongs here and only here — one reading per leg,
            not one per turn. */}
        {condition && leg.weather && (
          <View style={[styles.tempBadge, { backgroundColor: conditionColorForSeverity(theme, condition.severity) }]}>
            <WeatherIcon kind={weatherIconKindFor(condition)} size={11} color="#FFFFFF" />
            <Text style={styles.tempBadgeText}>{Math.round(leg.weather.tempC)}°</Text>
          </View>
        )}
      </View>

      {steps.map((step, i) => {
        const stepDistance = formatDistance(step.distanceM);
        return (
          <View
            key={`${i}-${step.instruction}`}
            style={styles.stepRow}
            accessible
            accessibilityLabel={[step.instruction, stepDistance].filter(Boolean).join(", ")}
          >
            <ManeuverIcon kind={maneuverKindFor(step.maneuver)} size={15} color={theme.textSecondary} />
            <Text style={styles.instruction} numberOfLines={2}>
              {step.instruction}
            </Text>
            {stepDistance !== "" && <Text style={styles.stepDistance}>{stepDistance}</Text>}
          </View>
        );
      })}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { overflow: "hidden" },
    card: { borderRadius: RADIUS.card, backgroundColor: theme.surface },
    disclosureRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      minHeight: 44,
    },
    disclosureLabel: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    disclosure: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
    disclosureMeta: { ...TYPE.caption, color: theme.textSecondary },
    legRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      minHeight: 40,
    },
    // A rule between legs rather than around each one: this is one list, and
    // boxing every leg would rebuild the four separate lists it replaced.
    legRowDivided: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: SPACING.xs, paddingTop: SPACING.md },
    legLabel: { flex: 1, ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    legDuration: { ...TYPE.caption, color: theme.textSecondary },
    tempBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    tempBadgeText: { ...TYPE.micro, fontWeight: "700", color: "#FFFFFF" },
    // Indented under the leg they belong to, so the two levels are visible
    // without a second card or a second heading.
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingLeft: SPACING.xxl,
      paddingRight: SPACING.md,
      paddingVertical: SPACING.xs,
      minHeight: 36,
    },
    instruction: { flex: 1, ...TYPE.caption, color: theme.textSecondary, lineHeight: 18 },
    stepDistance: { ...TYPE.micro, color: theme.textSecondary },
  });
}

import { StyleSheet, Text, View } from "react-native";
import ManeuverIcon, { maneuverKindFor } from "../../components/ManeuverIcon";
import { activeStepIndex } from "../../lib/journeyProgress";
import useTheme from "../../theme/useTheme";
import { RADIUS } from "../../theme/typography";
import type { NavigationStep } from "../../types";

// Phase 22 — the turns within the leg you're currently on.
//
// Deliberately scoped to the *current* leg rather than the whole journey:
// the leg list above is already the journey-level summary (§9.3 item 5), and
// repeating every turn of every leg underneath it would bury the one
// instruction that matters right now.
//
// Rendered only while following. A journey with no `steps` (any planned
// before Phase 22, any transit leg, any Routes response that carried no
// instruction text) renders nothing at all rather than an empty frame —
// the same "omit, don't placeholder" pattern used throughout this screen.

function formatDistance(distanceM: number): string {
  if (distanceM <= 0) return "";
  if (distanceM < 1000) return `${Math.round(distanceM / 10) * 10} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

interface Props {
  steps: NavigationStep[];
  /** 0-1 through the leg these steps belong to. */
  legFraction: number;
}

export default function StepList({ steps, legFraction }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  if (steps.length === 0) return null;

  const activeIndex = activeStepIndex(steps, legFraction);
  // Two ahead is enough to plan the next move without turning this into a
  // second copy of the route.
  const visible = steps.slice(activeIndex, activeIndex + 3);

  return (
    <View style={styles.container}>
      {visible.map((step, i) => {
        const isActive = i === 0;
        const distance = formatDistance(step.distanceM);
        return (
          <View
            key={`${activeIndex + i}-${step.instruction}`}
            style={[styles.row, isActive && styles.rowActive]}
            accessible
            // §9.6 — one coherent label per row rather than icon and text
            // read as separate stops.
            accessibilityLabel={[isActive ? "Next" : undefined, step.instruction, distance]
              .filter(Boolean)
              .join(", ")}
          >
            <ManeuverIcon
              kind={maneuverKindFor(step.maneuver)}
              size={isActive ? 20 : 16}
              color={isActive ? theme.accentWalk : theme.textSecondary}
            />
            <Text style={[styles.instruction, isActive && styles.instructionActive]} numberOfLines={2}>
              {step.instruction}
            </Text>
            {distance !== "" && <Text style={styles.distance}>{distance}</Text>}
          </View>
        );
      })}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 20,
      marginTop: 12,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
    rowActive: { backgroundColor: theme.surfaceRaised },
    instruction: { flex: 1, fontSize: 14, color: theme.textSecondary },
    instructionActive: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    distance: { fontSize: 12, color: theme.textSecondary },
  });
}

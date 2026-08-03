import { StyleSheet, Text, View } from "react-native";
import ManeuverIcon, { maneuverKindFor } from "../../components/ManeuverIcon";
import { activeStepIndex } from "../../lib/journeyProgress";
import useTheme from "../../theme/useTheme";
import { RADIUS , SPACING, TYPE } from "../../theme/typography";

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
  /**
   * 0-1 through the leg these steps belong to — live mode, which highlights
   * the step you're on and shows only the next few. Omit for the planned
   * view (below), where there is no "now" to be at.
   */
  legFraction?: number;
  /** Nested under a leg row rather than floating at screen level. */
  nested?: boolean;
}

export default function StepList({ steps, legFraction, nested = false }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  if (steps.length === 0) return null;

  // Planned: the whole leg, in order, nothing highlighted — you're reading
  // the route before you set off, so "which one is next" isn't a question
  // yet and truncating to three would hide most of the drive.
  const live = legFraction !== undefined;
  const activeIndex = live ? activeStepIndex(steps, legFraction) : 0;
  // Live: two ahead is enough to plan the next move without turning this
  // into a second copy of the route.
  const visible = live ? steps.slice(activeIndex, activeIndex + 3) : steps;

  return (
    <View style={[styles.container, nested && styles.containerNested]}>
      {visible.map((step, i) => {
        const isActive = live && i === 0;
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
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      overflow: "hidden",
    },
    // Under a leg row inside the leg list, which already owns the screen
    // margin. Indented and pulled up under the row it belongs to so it
    // reads as that leg's detail rather than a list of its own.
    containerNested: {
      marginHorizontal: 0,
      marginLeft: SPACING.xxl,
      marginTop: -SPACING.sm,
      marginBottom: SPACING.md,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, minHeight: 44 },
    rowActive: { backgroundColor: theme.surfaceRaised },
    instruction: { flex: 1, ...TYPE.body, color: theme.textSecondary },
    instructionActive: { ...TYPE.body, fontWeight: "700", color: theme.textPrimary },
    distance: { ...TYPE.caption, color: theme.textSecondary },
  });
}

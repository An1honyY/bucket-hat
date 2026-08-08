import { StyleSheet, Text, View } from "react-native";
import ManeuverIcon, { maneuverKindFor } from "../../components/ManeuverIcon";
import { activeStepIndex } from "../../lib/journeyProgress";
import { formatDistance } from "../../lib/navigationSteps";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

import type { NavigationStep } from "../../types";

// Phase 22 — the turns within the leg you're currently on, pinned under the
// map while following.
//
// Live only. The planned view's directions moved to JourneyDirections, which
// is one list for the whole journey rather than a disclosure per leg — see
// that file. What's left here is the mid-journey case, and it answers exactly
// one question: what do I do next.
//
// Deliberately scoped to the current leg, and to three turns of it: the leg
// list further down is already the journey-level summary (§9.3 item 5), and
// this sits on a screen someone is glancing at mid-stride.
//
// Distance per row, and nothing else. No clock time, no temperature — the leg
// row above already carries both, once, which is the right number of times.
// A journey with no `steps` (any planned before Phase 22, any transit leg,
// any Routes response that carried no instruction text) renders nothing at
// all rather than an empty frame.

/** How many turns ahead are worth showing: enough to plan the next move,
 *  not so many that this becomes a second copy of the route. */
const VISIBLE_STEPS = 3;

interface Props {
  steps: NavigationStep[];
  /** 0-1 through the leg these steps belong to. */
  legFraction: number;
  /** Nested under a leg row rather than floating at screen level. */
  nested?: boolean;
}

export default function StepList({ steps, legFraction, nested = false }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  if (steps.length === 0) return null;

  const activeIndex = activeStepIndex(steps, legFraction);
  const visible = steps.slice(activeIndex, activeIndex + VISIBLE_STEPS);

  return (
    <View style={[styles.container, nested && styles.containerNested]}>
      {visible.map((step, i) => {
        const isActive = i === 0;
        const distance = formatDistance(step.distanceM);
        return (
          <View
            key={`${activeIndex + i}-${step.instruction}`}
            style={[styles.row, isActive && styles.rowActive]}
            accessible
            // §9.6 — one coherent label per row rather than icon and text read
            // as separate stops.
            accessibilityLabel={[isActive ? "Next" : undefined, step.instruction, distance].filter(Boolean).join(", ")}
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

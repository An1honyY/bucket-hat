import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ManeuverIcon, { maneuverKindFor } from "../../components/ManeuverIcon";
import ActionIcon from "../../components/ActionIcon";
import JourneyDirections from "./JourneyDirections";
import { formatDistance } from "../../lib/navigationSteps";
import { activeStepIndex } from "../../lib/journeyProgress";
import { formatDuration } from "../../lib/formatDuration";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import { hexToRgba } from "../../lib/mapGeometry";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { Journey, NavigationStep } from "../../types";

// The map, given the whole screen, with the journey floating over it.
//
// The embedded map on Journey Detail is 280pt above a column of cards — fine
// for "where does this route go", useless mid-journey when the question is
// "which way now". Full screen it is, with the overlay carrying whichever of
// those two questions applies:
//
//   • **Planned** — you haven't set off. The overlay is the plan: where to
//     where, when, how long, and the full directions list (the same
//     JourneyDirections the screen below uses, so there is one directions
//     component in the app rather than a full-screen copy that drifts).
//   • **Following** — you're moving. The overlay is the next few turns, with
//     the one you're on highlighted, under a live arrival line.
//
// The modal renders its own copy of the same JourneyMap (passed in as
// `children` by the caller, with identical props) rather than reparenting the
// embedded one. Both map implementations key their camera off their own
// mount, and moving a live native MapView between parents remounts it anyway
// — so two instances, one set of props, no shared mutable state.

// The overlay never takes more than this much of the screen: past it, the
// thing you opened full screen for is behind the directions covering it. The
// planned overlay gets more room than the live one, because reading a route
// is a sit-down activity and glancing at the next turn is not.
const PLANNED_OVERLAY_MAX_RATIO = 0.55;
const LIVE_OVERLAY_MAX_RATIO = 0.4;

/** How many turns ahead the live overlay shows — one more than the pinned
 *  StepList under the embedded map, since there's room for it here. */
const LIVE_VISIBLE_STEPS = 4;

interface Props {
  visible: boolean;
  onClose: () => void;
  journey: Journey;
  /** Total journey duration in minutes, as the screen below computes it. */
  totalDurationMin: number;
  /** True once the user is actually being tracked along the route. */
  following: boolean;
  /** Index of the leg being travelled, when following. */
  currentLegIndex?: number;
  /** 0-1 through the current leg; highlights the step you're on. */
  currentLegFraction?: number;
  /** Live arrival clock time and minutes left, when following. */
  etaMs?: number;
  remainingMin?: number;
  /**
   * Zoom to the user and follow them from here on. Absent when there's
   * nothing to centre on — no location permission, or a journey with no
   * mapped route to follow.
   */
  onRecentre?: () => void;
  /** True when the camera is already locked to the user, so the control has
   *  nothing left to do and shouldn't be offered. */
  cameraLocked?: boolean;
  /** The JourneyMap, with the same props as the embedded one. */
  children: ReactNode;
}

export default function FullScreenMapModal({
  visible,
  onClose,
  journey,
  totalDurationMin,
  following,
  currentLegIndex,
  currentLegFraction,
  etaMs,
  remainingMin,
  onRecentre,
  cameraLocked = false,
  children,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  // The planned overlay is a lot of screen to hand over uninvited, so it can
  // be folded down to its header — the map is what you came for.
  const [collapsed, setCollapsed] = useState(false);

  const liveLeg = following && currentLegIndex !== undefined ? journey.legs[currentLegIndex] : undefined;
  const liveSteps = liveLeg?.steps ?? [];
  const liveVisible =
    liveLeg && currentLegFraction !== undefined
      ? liveSteps.slice(activeStepIndex(liveSteps, currentLegFraction), activeStepIndex(liveSteps, currentLegFraction) + LIVE_VISIBLE_STEPS)
      : [];

  const departIso = journey.departTime;
  const arriveIso = new Date(new Date(departIso).getTime() + totalDurationMin * 60_000).toISOString();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <View style={styles.root}>
        {children}

        {/* Close sits top-left, where a back control lives everywhere else in
            this app, and clear of both maps' own zoom controls on the right. */}
        <Pressable
          onPress={onClose}
          style={[styles.chip, styles.closeChip, { top: insets.top + SPACING.md }]}
          accessibilityRole="button"
          accessibilityLabel="Close the full screen map"
        >
          <ActionIcon kind="close" size={16} color={theme.textPrimary} />
          <Text style={styles.chipLabel}>Close</Text>
        </Pressable>

        {/* "Put me back in the middle and keep me there." Offered whenever
            the camera isn't already locked to the user — including before
            departure, where tapping it starts the following that makes the
            camera worth locking in the first place. */}
        {onRecentre && !cameraLocked && (
          <Pressable
            onPress={onRecentre}
            style={[styles.chip, styles.recentreChip, { top: insets.top + SPACING.md }]}
            accessibilityRole="button"
            accessibilityLabel={
              following ? "Re-centre the map on your location" : "Follow your location on the map"
            }
          >
            <ActionIcon kind="crosshair" size={15} color={theme.textPrimary} />
            <Text style={styles.chipLabel}>{following ? "Re-centre" : "Follow me"}</Text>
          </Pressable>
        )}

        <View
          style={[
            styles.overlay,
            {
              bottom: insets.bottom + SPACING.md,
              maxHeight: `${Math.round((following ? LIVE_OVERLAY_MAX_RATIO : PLANNED_OVERLAY_MAX_RATIO) * 100)}%`,
            },
          ]}
        >
          {following ? (
            <>
              {etaMs !== undefined && remainingMin !== undefined && (
                <Text style={styles.status}>
                  Arrive {formatTime(new Date(etaMs).toISOString(), hour12)} · {formatDuration(remainingMin)} left
                </Text>
              )}
              {liveLeg && (
                <Text style={styles.legLabel} numberOfLines={1}>
                  {liveLeg.label}
                </Text>
              )}
              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {liveVisible.map((step, i) => (
                  <LiveStepRow key={`${i}-${step.instruction}`} step={step} isNext={i === 0} styles={styles} theme={theme} />
                ))}
                {liveVisible.length === 0 && (
                  <Text style={styles.instruction}>No turn-by-turn directions for this leg.</Text>
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => setCollapsed((v) => !v)}
                style={styles.plannedHeader}
                accessibilityRole="button"
                accessibilityState={{ expanded: !collapsed }}
                accessibilityLabel={`${collapsed ? "Show" : "Hide"} the journey plan`}
              >
                <View style={styles.plannedHeaderText}>
                  <Text style={styles.status} numberOfLines={1}>
                    {journey.origin.label} → {journey.destination.label}
                  </Text>
                  <Text style={styles.plannedMeta}>
                    {formatTime(departIso, hour12)} – {formatTime(arriveIso, hour12)} · {formatDuration(totalDurationMin)}
                  </Text>
                </View>
                <Text style={styles.plannedChevron}>{collapsed ? "▴" : "▾"}</Text>
              </Pressable>
              {!collapsed && (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                  <JourneyDirections legs={journey.legs} initiallyOpen bare />
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function LiveStepRow({
  step,
  isNext,
  styles,
  theme,
}: {
  step: NavigationStep;
  isNext: boolean;
  styles: ReturnType<typeof getStyles>;
  theme: ReturnType<typeof useTheme>;
}) {
  const distance = formatDistance(step.distanceM);
  return (
    <View
      style={styles.stepRow}
      accessible
      accessibilityLabel={[isNext ? "Next" : undefined, step.instruction, distance].filter(Boolean).join(", ")}
    >
      <ManeuverIcon
        kind={maneuverKindFor(step.maneuver)}
        size={isNext ? 20 : 16}
        color={isNext ? theme.accentWalk : theme.textSecondary}
      />
      <Text style={[styles.instruction, isNext && styles.instructionNext]} numberOfLines={2}>
        {step.instruction}
      </Text>
      {distance !== "" && <Text style={styles.stepDistance}>{distance}</Text>}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    chip: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      minHeight: 44,
      borderRadius: RADIUS.circle,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      // Above Leaflet's own panes and controls on the web build, which sit
      // between z-index 400 and 1000.
      zIndex: 1200,
      ...cardElevationStyle(theme),
    },
    closeChip: { left: SPACING.md },
    recentreChip: { right: SPACING.md },
    chipLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
    // Translucent rather than opaque: the whole point of full screen is
    // seeing the route, and the stretch under the overlay is the stretch
    // you're on.
    overlay: {
      position: "absolute",
      left: SPACING.md,
      right: SPACING.md,
      borderRadius: RADIUS.card,
      backgroundColor: hexToRgba(theme.surface, 0.94),
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      gap: SPACING.xs,
      zIndex: 1200,
      ...cardElevationStyle(theme),
    },
    status: { ...TYPE.caption, fontWeight: "700", color: theme.textPrimary },
    legLabel: { ...TYPE.caption, color: theme.textSecondary },
    plannedHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SPACING.xs, minHeight: 44 },
    plannedHeaderText: { flex: 1, gap: 2 },
    plannedMeta: { ...TYPE.caption, color: theme.textSecondary },
    plannedChevron: { ...TYPE.subtitle, color: theme.accentWalk },
    scroll: { flexGrow: 0 },
    scrollContent: { gap: 2 },
    stepRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingHorizontal: SPACING.xs, paddingVertical: SPACING.sm, minHeight: 40 },
    instruction: { flex: 1, ...TYPE.body, color: theme.textSecondary },
    instructionNext: { fontWeight: "700", color: theme.textPrimary },
    stepDistance: { ...TYPE.caption, color: theme.textSecondary },
  });
}

import { useCallback, useState } from "react";
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { deleteJourney, getJourney, updateJourney } from "../../db/repositories/journeys";
import { createAnnotation, listAnnotations } from "../../db/repositories/annotations";
import { applyAnnotationsToLegs, decodePolyline } from "../../lib/annotations";
import { useJourneyProgress } from "../../lib/useJourneyProgress";
import { splitPath } from "../../lib/journeyProgress";
import { useRecommendation } from "../../lib/useRecommendation";
import { freezeIfDue } from "../../lib/leaveBy";
import { cancelLeaveByNotification } from "../../lib/notifications";
import { showAlert } from "../../lib/crossPlatformAlert";
import { recordGearFeedback } from "../../lib/calibration";
import { checkForecastDrift } from "../../lib/forecastDrift";
import { dominantMode } from "../../lib/journeyMode";
import { classifyWeather } from "../../lib/weather";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import JourneyMap, {
  type ConditionMarker,
  type MapAnnotation,
  type MapCircle,
  type MapFollowMode,
  type MapUserPuck,
} from "../../components/JourneyMap";
import type { ModeIconKind } from "../../components/modeIconPaths";
import AnnotationForm, { type AnnotationFormValues } from "../local-knowledge/AnnotationForm";
import { EFFECT_META, EFFECT_MARKER_EMOJI } from "../local-knowledge/effectMeta";
import GearRecommendationCard from "./GearRecommendationCard";
import LegRow, { type LegState } from "./LegRow";
import ActionIcon from "../../components/ActionIcon";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle, conditionColorForSeverity } from "../../theme/tokens";
import { RADIUS } from "../../theme/typography";
import type { EnvironmentAnnotation, GearFeedback, Journey, JourneyLeg } from "../../types";

// Core screen — docs/09-design-system.md §9.3, reading a real persisted
// Journey (docs/08-build-phases.md Phase 4, src/db/repositories/journeys.ts)
// built by src/lib/planJourney.ts, with gear recommendations from the real
// engine (Phase 5, src/lib/recommend.ts).
type Props = NativeStackScreenProps<RootStackParamList, "JourneyDetail">;

function modeAccent(mode: string, theme: ReturnType<typeof useTheme>): string {
  if (mode === "drive") return theme.accentDrive;
  if (mode === "bus" || mode === "train") return theme.accentTransit;
  return theme.accentWalk; // walk/cycle/hike (§9.1)
}
const FEEDBACK_OPTIONS: { value: GearFeedback; label: string }[] = [
  { value: "much_too_cold", label: "Much too cold" },
  { value: "too_cold", label: "Too cold" },
  { value: "just_right", label: "Just right" },
  { value: "too_warm", label: "Too warm" },
  { value: "much_too_warm", label: "Much too warm" },
];

// Phase 22 — how far either side of a journey the "Follow this journey"
// control is worth offering.
const START_WINDOW_BEFORE_MS = 30 * 60_000;
const START_WINDOW_AFTER_MS = 60 * 60_000;

// The one line the journey bar shows about tracking itself. Voice guide
// (§9.0.1): plain, short, and it never blames the user for a permission
// they're entitled to withhold.
function journeyStatusLine(tracking: ReturnType<typeof useJourneyProgress>): string {
  if (tracking.status === "denied") return "Location is off — the route below still works";
  if (tracking.untrackable) return "No mapped route to follow for this journey";
  if (tracking.status === "requesting" || !tracking.progress) return "Finding you…";
  if (tracking.progress.isOffRoute) return "Looks like you're off the route";
  return "Following your journey";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// §9.3 item 1 — one marker per outdoor leg with weather, at its polyline's
// midpoint, colored/labeled from classifyWeather() via the active theme's
// condition* tokens (§9.1). Legs without a polyline (or without weather —
// Section 5.1's "conditions unknown" degrade) simply contribute no marker,
// same "omit, don't placeholder" pattern used elsewhere in this screen.
function conditionMarkersFor(legs: JourneyLeg[], theme: ReturnType<typeof useTheme>): ConditionMarker[] {
  return legs.flatMap((leg) => {
    if (!leg.outdoor || !leg.weather || !leg.polyline) return [];
    const points = decodePolyline(leg.polyline);
    if (points.length === 0) return [];
    const mid = points[Math.floor(points.length / 2)];
    const condition = classifyWeather(leg.weather.weatherCode, leg.weather.precipMm, leg.weather.windKph);
    return [
      {
        lat: mid.lat,
        lng: mid.lng,
        color: conditionColorForSeverity(theme, condition.severity),
        emoji: condition.icon,
        label: `${leg.label}, ${condition.label}, ${Math.round(leg.weather.tempC)} degrees`,
      },
    ];
  });
}

export default function JourneyDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [journey, setJourney] = useState<Journey | undefined | null>(undefined); // undefined = loading, null = not found
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  // Date.now() is impure to call during render — a useState lazy
  // initializer (react-hooks/purity) only runs once at mount.
  const [nowMs] = useState(() => Date.now());
  // §4.5 — the in-context annotation add flow: a long-press on the map
  // opens a bottom sheet pre-filled with the tapped coordinates, with the
  // affected radius previewed live on the map underneath.
  const [annotationCoordinate, setAnnotationCoordinate] = useState<{ lat: number; lng: number } | null>(null);
  const [previewCircle, setPreviewCircle] = useState<MapCircle | null>(null);
  // §4.5 — all saved local-knowledge spots, shown on the map as badges so
  // the user can see them alongside the route (not only the one being added).
  const [annotations, setAnnotations] = useState<EnvironmentAnnotation[]>([]);
  const [calibrationToast, setCalibrationToast] = useState<string | null>(null);
  // §7.3 — the pause/resume control (below) always operates on the
  // *template* Journey (the one row with `recurrence` actually set), not
  // whichever occurrence happens to be open — materializeToday.ts never
  // copies `recurrence` onto the daily occurrences it creates, only
  // `templateId` pointing back at the template. undefined = not checked
  // yet, null = this journey isn't part of a recurring series at all.
  const [recurrenceTemplate, setRecurrenceTemplate] = useState<Journey | undefined | null>(undefined);
  const recommendation = useRecommendation(journey);

  // Phase 22 — Journey Mode. Seeded from the nav param (Today's "Leaving
  // now" opens straight into it) but owned here from then on, and never
  // persisted: see navigation/types.ts for why.
  const [journeyMode, setJourneyMode] = useState(() => route.params.journeyMode === true && !route.params.readOnly);
  // Whether the camera is locked to the puck. Panning the map drops to
  // "free" so the user can look ahead without the camera yanking them back;
  // the Re-centre chip re-locks it.
  const [cameraLocked, setCameraLocked] = useState(true);
  const [showCompletedLegs, setShowCompletedLegs] = useState(false);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const tracking = useJourneyProgress(journey, journeyMode);
  const { progress } = tracking;

  // Load saved local-knowledge spots for the map; refreshes when the screen
  // regains focus so a spot added elsewhere shows up here too.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listAnnotations().then((rows) => {
        if (!cancelled) setAnnotations(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // §7.3/§3 — fallback freeze: if the scheduled leave-by notification
      // never actually fired (app killed, permission revoked), viewing a
      // journey whose leave-by time has already passed freezes the
      // RecommendationSnapshot and records wear here instead. Idempotent —
      // freezeIfDue() is a no-op once a snapshot already exists.
      getJourney(route.params.journeyId).then(async (result) => {
        if (!result) {
          if (!cancelled) setJourney(null);
          return;
        }
        const frozen = await freezeIfDue(result);
        if (!cancelled) setJourney(frozen);
        // §5.2 — a foreground re-check of a still-upcoming journey's
        // weather; a no-op for a past journey (freezeIfDue already handled
        // that) or one whose forecast hasn't drifted enough to matter.
        const drift = await checkForecastDrift(frozen);
        const final = drift.changed ? drift.journey : frozen;
        if (!cancelled && drift.changed) setJourney(drift.journey);

        if (final.recurrence) {
          if (!cancelled) setRecurrenceTemplate(final);
        } else if (final.templateId) {
          const template = await getJourney(final.templateId);
          if (!cancelled) setRecurrenceTemplate(template ?? null);
        } else if (!cancelled) {
          setRecurrenceTemplate(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [route.params.journeyId])
  );

  if (journey === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!journey) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.empty}>This journey was deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stops = [
    { lat: journey.origin.lat, lng: journey.origin.lng },
    ...(journey.waypoints?.map((w) => ({ lat: w.lat, lng: w.lng })) ?? []),
    { lat: journey.destination.lat, lng: journey.destination.lng },
  ];
  // Real road/track-following geometry — legs without their own polyline
  // (indoor waypoint dwells, synthesized stationary waits) simply
  // contribute nothing; the points immediately before/after them are
  // already at essentially the same spot (the stop/wait location), so the
  // combined line still reads as continuous rather than broken.
  const routePath = journey.legs.flatMap((leg) => (leg.polyline ? decodePolyline(leg.polyline) : []));
  const accentColor = modeAccent(dominantMode(journey.legs), theme);
  const conditionMarkers = conditionMarkersFor(journey.legs, theme);
  const annotationMarkers: MapAnnotation[] = annotations.map((a) => ({
    lat: a.lat,
    lng: a.lng,
    radiusM: a.radiusM,
    icon: EFFECT_MARKER_EMOJI[a.effect],
    label: `${a.label} — ${EFFECT_META[a.effect].label}`,
    color: theme.annotationPin,
  }));

  // Phase 22 — the live journey overlay. Everything here is null/absent
  // unless journey mode is actually running, so the planning view renders
  // byte-for-byte as it did before.
  const currentLeg = progress ? journey.legs[progress.currentLegIndex] : undefined;
  const puckMode: ModeIconKind = currentLeg
    ? currentLeg.isStationary
      ? "stationary"
      : !currentLeg.outdoor
        ? "indoor"
        : currentLeg.mode
    : "walk";
  const userPuck: MapUserPuck | null =
    journeyMode && tracking.fix
      ? {
          lat: tracking.fix.lat,
          lng: tracking.fix.lng,
          mode: puckMode,
          // The route's own direction beats the device compass: it's stable
          // at walking pace, and it's the direction that actually matters.
          bearingDeg: progress?.bearingDeg ?? tracking.fix.headingDeg,
          accuracyM: tracking.fix.accuracyM,
          color: currentLeg ? modeAccent(currentLeg.mode, theme) : accentColor,
          label: currentLeg ? `You are here — ${currentLeg.label}` : "You are here",
        }
      : null;
  const { traveled, remaining } =
    tracking.route && progress
      ? splitPath(tracking.route, progress.distanceAlongM)
      : { traveled: [], remaining: [] };
  const followMode: MapFollowMode = !journeyMode ? "off" : cameraLocked ? "follow" : "free";

  // Following is offered from half an hour before departure until the
  // journey's planned end, plus slack for running late. Outside that window
  // there's nothing to follow and the control would just be noise.
  const departMs = new Date(journey.departTime).getTime();
  const plannedEndMs = departMs + journey.legs.reduce((sum, leg) => sum + leg.durationMin, 0) * 60_000;
  const canStartJourney = nowMs >= departMs - START_WINDOW_BEFORE_MS && nowMs <= plannedEndMs + START_WINDOW_AFTER_MS;

  // Every leg is "upcoming" unless a journey is actually being followed, so
  // the planning and History views are untouched by any of this.
  const legStateFor = (index: number): LegState => {
    if (!journeyMode || !progress) return "upcoming";
    if (index < progress.currentLegIndex) return "completed";
    return index === progress.currentLegIndex ? "current" : "upcoming";
  };
  const completedCount = journeyMode && progress ? progress.currentLegIndex : 0;

  const totalDurationMin = journey.legs.reduce((sum, leg) => sum + leg.durationMin, 0);
  const journeyEndMs = new Date(journey.departTime).getTime() + totalDurationMin * 60_000;
  const showFeedbackStrip = !feedbackGiven && !journey.feedback && journeyEndMs < nowMs;

  // §5.3 — only medium/low confidence gets a banner; high is the common
  // case and stays silent. Worst (lowest-confidence) outdoor leg wins,
  // same "one summary, not one per leg" pattern as the severe-weather
  // advisory will use once Phase 5 adds it.
  const confidenceRank = { high: 0, medium: 1, low: 2 } as const;
  const worstConfidence = journey.legs
    .filter((l) => l.outdoor && l.weather)
    .reduce<"high" | "medium" | "low">((worst, l) => {
      const legConfidence = l.weather!.forecastConfidence;
      return confidenceRank[legConfidence] > confidenceRank[worst] ? legConfidence : worst;
    }, "high");

  function openAnnotationSheet(coordinate: { lat: number; lng: number }) {
    setAnnotationCoordinate(coordinate);
    setPreviewCircle({ ...coordinate, radiusM: 100 });
  }

  function closeAnnotationSheet() {
    setAnnotationCoordinate(null);
    setPreviewCircle(null);
  }

  // §4.5 — save, then immediately re-run annotation matching for this
  // journey's legs so the effect is visible here without navigating away.
  async function saveAnnotation(values: AnnotationFormValues) {
    await createAnnotation(values);
    const rows = await listAnnotations();
    setAnnotations(rows);
    const updated = { ...journey!, legs: applyAnnotationsToLegs(journey!.legs, rows) };
    await updateJourney(updated);
    setJourney(updated);
    closeAnnotationSheet();
  }

  // §4.2/§7.5 — writes Journey.feedback for History's display, then feeds
  // the calibration loop; the loop's own "we noticed" toast (§9.1.1) is
  // shown here, non-blocking, and auto-dismisses on its own.
  async function giveFeedback(feedback: GearFeedback) {
    const updated = { ...journey!, feedback };
    await updateJourney(updated);
    setJourney(updated);
    setFeedbackGiven(true);
    const { toast } = await recordGearFeedback(feedback, journey!.departTime);
    if (toast) {
      setCalibrationToast(
        toast.direction === "warmer"
          ? "Noticed you run warm — dialing back a layer next time"
          : "Noticed you run cold — bringing an extra layer next time"
      );
      setTimeout(() => setCalibrationToast(null), 4000);
    }
  }

  // §7.3 — "cancel with cancelScheduledNotificationAsync if the user
  // deletes the journey." No delete-journey UI existed anywhere in the app
  // before this phase (see DECISIONS.md) — a single confirm-then-delete
  // action here is the minimal affordance that makes the cancellation path
  // reachable, not a full journey-management screen.
  function confirmDelete() {
    showAlert("Delete this journey?", "This can't be undone — its gear recommendation and history entry go with it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);
  }

  async function doDelete() {
    await cancelLeaveByNotification(journey!.id);
    await deleteJourney(journey!.id);
    navigation.goBack();
  }

  // §7.3 — "cancel [the scheduled notification] if the user... turns off a
  // recurrence's `active` flag." No screen exposed that flag at all before
  // this (see DECISIONS.md, Phase 8 entry: "no UI trigger to attach a
  // cancellation call to") — a pause/resume toggle here, rather than a full
  // recurring-journey editing screen, is the minimal fix that makes the
  // cancellation path reachable. Pausing only cancels *this* instance's own
  // scheduled notification; future occurrences simply never materialize
  // (and so never get one scheduled) while paused, so there's nothing else
  // to cancel.
  async function toggleRecurrenceActive() {
    if (!recurrenceTemplate?.recurrence) return;
    const nextActive = !recurrenceTemplate.recurrence.active;
    const updatedTemplate = { ...recurrenceTemplate, recurrence: { ...recurrenceTemplate.recurrence, active: nextActive } };
    await updateJourney(updatedTemplate);
    setRecurrenceTemplate(updatedTemplate);
    if (!nextActive) {
      await cancelLeaveByNotification(journey!.id);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={[styles.mapContainer, journeyMode && styles.mapContainerJourney]}>
          <JourneyMap
            stops={stops}
            routePath={routePath}
            accentColor={accentColor}
            onLongPress={openAnnotationSheet}
            previewCircle={previewCircle}
            conditionMarkers={conditionMarkers}
            annotations={annotationMarkers}
            previewColor={theme.annotationPin}
            traveledPath={traveled}
            remainingPath={remaining}
            userPuck={userPuck}
            followMode={followMode}
            onUserPan={() => setCameraLocked(false)}
          />
          {/* Re-locking the camera is the one control that has to sit on the
              map itself — it's about the map's own state, and it appears
              exactly when the user has panned away from the puck. */}
          {journeyMode && !cameraLocked && (
            <Pressable
              onPress={() => setCameraLocked(true)}
              style={styles.recenterChip}
              accessibilityRole="button"
              accessibilityLabel="Re-centre the map on your location"
            >
              <ActionIcon kind="crosshair" size={15} color={theme.textPrimary} />
              <Text style={styles.recenterChipLabel}>Re-centre</Text>
            </Pressable>
          )}
        </View>

        {journeyMode && (
          <View style={styles.journeyBar}>
            <View style={styles.journeyBarText}>
              {/* The ETA is the headline once there's a real one; until then
                  the status line carries the whole bar on its own. */}
              {progress && (
                <Text style={styles.journeyBarEta}>
                  Arrive {formatTime(new Date(progress.etaMs).toISOString(), hour12)} ·{" "}
                  {Math.max(1, Math.round(progress.remainingMin))} min left
                </Text>
              )}
              <Text style={styles.journeyBarStatus}>{journeyStatusLine(tracking)}</Text>
            </View>
            <Pressable
              onPress={() => setJourneyMode(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Stop following this journey"
            >
              <Text style={styles.journeyBarAction}>Stop</Text>
            </Pressable>
          </View>
        )}

        {/* Off route is a real state, not a failure — the ETA above keeps
            counting off the route you planned, which stops being true once
            you've left it. Re-planning is the honest fix, so this offers it
            directly rather than leaving the user to work out that the
            numbers above have quietly gone stale. */}
        {journeyMode && progress?.isOffRoute && (
          <View style={styles.offRouteBanner}>
            <Text style={styles.offRouteText}>
              You&apos;ve left the planned route — times below may no longer be right.
            </Text>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "Plan" })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Plan a new route from here"
            >
              <Text style={styles.offRouteAction}>Re-plan</Text>
            </Pressable>
          </View>
        )}

        {/* Journeys reached any other way (History aside) still need a way
            in. Offered near the departure window only — following a journey
            you're not on yet is just a battery drain. */}
        {!route.params.readOnly && !journeyMode && canStartJourney && (
          <Pressable
            onPress={() => {
              setCameraLocked(true);
              setJourneyMode(true);
            }}
            style={styles.startJourneyButton}
            accessibilityRole="button"
            accessibilityLabel="Follow this journey on the map"
          >
            <ActionIcon kind="crosshair" size={16} color="#FFFFFF" />
            <Text style={styles.startJourneyLabel}>Follow this journey</Text>
          </Pressable>
        )}

        {route.params.cachedFromDate && (
          <View style={styles.cachedBanner}>
            <Text style={styles.cachedBannerText}>
              Using a saved route from {formatDate(route.params.cachedFromDate)} — may not reflect current conditions
            </Text>
          </View>
        )}

        {recommendation?.severeWeatherAdvisory && (
          <View style={styles.severeBanner}>
            <ActionIcon kind="warning" size={16} color="#FFFFFF" />
            <Text style={styles.severeBannerText}>{recommendation.severeWeatherAdvisory}</Text>
          </View>
        )}

        {worstConfidence !== "high" && (
          <View style={styles.confidenceBanner}>
            <Text style={styles.confidenceBannerText}>Forecast may still change — we&apos;ll update this closer to departure.</Text>
          </View>
        )}

        {!route.params.readOnly && recurrenceTemplate?.recurrence && (
          <View style={styles.recurrenceRow}>
            <Text style={styles.recurrenceLabel}>
              Repeats {recurrenceTemplate.recurrence.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}
              {!recurrenceTemplate.recurrence.active && " — paused"}
            </Text>
            <Pressable
              onPress={toggleRecurrenceActive}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={recurrenceTemplate.recurrence.active ? "Pause this recurring journey" : "Resume this recurring journey"}
            >
              <Text style={styles.recurrenceToggleLabel}>{recurrenceTemplate.recurrence.active ? "Pause" : "Resume"}</Text>
            </Pressable>
          </View>
        )}

        {journey.recommendationSnapshot ? (
          <GearRecommendationCard snapshot={journey.recommendationSnapshot} />
        ) : (
          recommendation && (
            <GearRecommendationCard
              recommendation={recommendation}
              onAddGear={(target) => navigation.navigate("Main", { screen: "Gear", params: { openAdd: target } })}
            />
          )
        )}

        <View style={styles.legList}>
          {/* Phase 22 — finished legs fold away so the leg you're on is the
              one you see. §9.6 requires the list to stay a complete summary
              of the journey with nothing hidden behind an unlabelled
              gesture, so this is a real focusable button stating exactly
              what it holds, and it's absent entirely outside journey mode. */}
          {completedCount > 0 && (
            <Pressable
              onPress={() => setShowCompletedLegs((shown) => !shown)}
              style={styles.completedToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: showCompletedLegs }}
              accessibilityLabel={
                showCompletedLegs
                  ? `Hide ${completedCount} completed ${completedCount === 1 ? "step" : "steps"}`
                  : `Show ${completedCount} completed ${completedCount === 1 ? "step" : "steps"}`
              }
            >
              <Text style={styles.completedToggleLabel}>
                {showCompletedLegs ? "Hide" : "Show"} {completedCount} completed{" "}
                {completedCount === 1 ? "step" : "steps"}
              </Text>
            </Pressable>
          )}
          {journey.legs.map((leg, i) => {
            const state = legStateFor(i);
            if (state === "completed" && !showCompletedLegs) return null;
            return (
              <LegRow
                key={leg.id}
                leg={leg}
                state={state}
                progressFraction={progress?.currentLegFraction}
                remainingMin={
                  state === "current" && progress ? leg.durationMin * (1 - progress.currentLegFraction) : undefined
                }
              />
            );
          })}
        </View>

        {/* §4.4/§9.4.2 — the return-trip toggle doesn't apply to something
            already past, so History's read-only view hides it. */}
        {!route.params.readOnly && journey.linkedReturnJourneyId && (
          <Pressable
            onPress={() => navigation.push("JourneyDetail", { journeyId: journey.linkedReturnJourneyId! })}
            style={styles.returnLink}
            accessibilityRole="button"
            accessibilityLabel="View return trip"
          >
            <ActionIcon kind="swap" size={15} color={theme.textPrimary} />
            <Text style={styles.returnLinkLabel}>Return trip</Text>
          </Pressable>
        )}

        <Pressable
          onPress={confirmDelete}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel="Delete this journey"
        >
          <Text style={styles.deleteButtonLabel}>Delete journey</Text>
        </Pressable>

        {calibrationToast && (
          <View style={styles.calibrationToast}>
            <Text style={styles.calibrationToastText}>{calibrationToast}</Text>
          </View>
        )}

        {showFeedbackStrip && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackPrompt}>How was the gear call for your commute today?</Text>
            <View style={styles.feedbackRow}>
              {FEEDBACK_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => giveFeedback(option.value)}
                  style={[styles.feedbackButton, option.value === "just_right" && styles.feedbackButtonPositive]}
                  // §9.6 — 44×44pt minimum; invisible hitSlop padding keeps
                  // the visible micro-text row at its speced size (§9.3 item 6).
                  hitSlop={{ top: 10, bottom: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Gear was ${option.label.toLowerCase()}`}
                >
                  <Text style={styles.feedbackLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={annotationCoordinate !== null}
        transparent
        animationType="slide"
        onRequestClose={closeAnnotationSheet}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismissArea} onPress={closeAnnotationSheet} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Mark this spot</Text>
            {annotationCoordinate && (
              <AnnotationForm
                initialCoordinate={annotationCoordinate}
                onSave={saveAnnotation}
                onCancel={closeAnnotationSheet}
                onPreviewChange={setPreviewCircle}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    empty: { color: theme.textSecondary },
    mapContainer: { height: 280, backgroundColor: theme.surface },
    // Phase 22 — the map earns more of the screen while you're actually
    // following it. A fixed proportion of the window rather than a drag
    // handle: a real bottom sheet needs react-native-gesture-handler, which
    // isn't a dependency here and isn't worth adding for one height toggle.
    // The gear card and leg list are still a short scroll away.
    mapContainerJourney: { height: Math.round(Dimensions.get("window").height * 0.55) },
    recenterChip: {
      position: "absolute",
      right: 12,
      bottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: RADIUS.circle,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      ...cardElevationStyle(theme),
    },
    recenterChipLabel: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
    journeyBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.surfaceRaised,
    },
    journeyBarText: { flex: 1, gap: 2 },
    journeyBarEta: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
    journeyBarStatus: { fontSize: 13, color: theme.textSecondary },
    offRouteBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.uvBadge,
    },
    offRouteText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
    offRouteAction: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", textDecorationLine: "underline" },
    journeyBarAction: { fontSize: 13, fontWeight: "600", color: theme.accentWalk },
    startJourneyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: RADIUS.card,
      backgroundColor: theme.accentWalk,
    },
    startJourneyLabel: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
    cachedBanner: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: theme.conditionLight },
    cachedBannerText: { fontSize: 12, color: theme.textPrimary },
    severeBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.conditionStorm },
    severeBannerText: { flex: 1, fontSize: 13, color: "#FFFFFF", fontWeight: "600" },
    confidenceBanner: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: theme.surface },
    confidenceBannerText: { fontSize: 12, color: theme.confidenceLow },
    recurrenceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 8,
      backgroundColor: theme.surface,
    },
    recurrenceLabel: { fontSize: 12, color: theme.textSecondary, flex: 1 },
    recurrenceToggleLabel: { fontSize: 13, fontWeight: "600", color: theme.accentWalk, minHeight: 30, textAlignVertical: "center" },
    completedToggle: { paddingVertical: 10, alignItems: "center" },
    completedToggleLabel: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
    legList: { paddingHorizontal: 20, paddingTop: 12 },
    returnLink: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, margin: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    returnLinkLabel: { fontWeight: "600", color: theme.textPrimary },
    deleteButton: { marginHorizontal: 20, marginTop: 16, alignItems: "center", paddingVertical: 12 },
    deleteButtonLabel: { color: theme.danger, fontWeight: "600", fontSize: 13 },
    feedbackContainer: { margin: 20, gap: 8 },
    feedbackPrompt: { fontSize: 13, color: theme.textSecondary },
    feedbackRow: { flexDirection: "row", gap: 4 },
    feedbackButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, backgroundColor: theme.surface },
    feedbackButtonPositive: { backgroundColor: theme.feedbackPositive },
    feedbackLabel: { fontSize: 10, textAlign: "center", color: theme.textPrimary },
    calibrationToast: { marginHorizontal: 20, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.surfaceRaised },
    calibrationToastText: { color: theme.textPrimary, fontSize: 12 },
    sheetBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.35)" },
    sheetDismissArea: { flex: 1 },
    sheet: {
      maxHeight: "75%",
      backgroundColor: theme.surfaceRaised,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 12,
      borderWidth: theme.surfaceRaisedBorder === "transparent" ? 0 : 1,
      borderColor: theme.surfaceRaisedBorder,
    },
    sheetTitle: { fontSize: 17, fontWeight: "600", textAlign: "center", color: theme.textPrimary },
  });
}

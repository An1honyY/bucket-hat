import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { deleteJourney, getJourney, updateJourney } from "../../db/repositories/journeys";
import { createSavedRoute } from "../../db/repositories/savedRoutes";
import { createAnnotation, listAnnotations } from "../../db/repositories/annotations";
import { getAnnotationAlertMode, type AnnotationAlertMode } from "../../db/repositories/settings";
import { applyAnnotationsToLegs, decodePolyline } from "../../lib/annotations";
import { useJourneyProgress } from "../../lib/useJourneyProgress";
import { splitPath } from "../../lib/journeyProgress";
import {
  annotationAlerts,
  gearTimingAlerts,
  topAlert,
  weatherAheadAlerts,
  type JourneyAlert,
} from "../../lib/journeyAlerts";
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
import JourneySummary from "./JourneySummary";
import LegRow, { type LegState } from "./LegRow";
import StepList from "./StepList";
import ScreenSurface from "../../components/ScreenSurface";
import ActionIcon from "../../components/ActionIcon";
import AppButton from "../../components/AppButton";
import EffectIcon from "../../components/EffectIcon";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle, conditionColorForSeverity } from "../../theme/tokens";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
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
  // §4.3 — set once this journey has been filed away as a reusable saved
  // journey, so the button can say so without needing a re-read of the row.
  const [savedAsJourney, setSavedAsJourney] = useState(false);
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
  // Phase 22 — how the user wants their saved spots surfaced. The Settings
  // value is the persistent one; `alertsMuted` below is a per-trip quiet
  // switch that deliberately does NOT write it back, so one tap while
  // walking can't silently change a global preference.
  const [annotationAlertMode, setAnnotationAlertModeState] = useState<AnnotationAlertMode>("briefing");
  const [alertsMuted, setAlertsMuted] = useState(false);
  // Spots already called out this trip, so GPS jitter in and out of a
  // radius can't re-fire the same one. A ref because it's memory, not
  // display state — it's only ever read and written inside the effect below.
  const firedAnnotationIds = useRef<Set<string>>(new Set());
  const [enteredSpotAlert, setEnteredSpotAlert] = useState<JourneyAlert | null>(null);
  // Phase 22 — arriving ends the follow, derived rather than pushed through
  // state so there's no effect racing the render. The subscription itself is
  // torn down inside useJourneyProgress the moment arrival fires.
  //
  // Deliberately does NOT call recordWear(): that already fires exactly once
  // per journey from freezeIfDue() at leave-by time (src/lib/leaveBy.ts —
  // "recordWear() must only ever fire once per Journey"), so calling it again
  // here would double every wear count for anyone who follows a journey.
  // Arrival retimes the *feedback prompt*, which is the part that was
  // previously guessing from the clock.
  const tracking = useJourneyProgress(journey, journeyMode);
  const { progress } = tracking;
  const following = journeyMode && !tracking.arrived;

  // Load saved local-knowledge spots for the map; refreshes when the screen
  // regains focus so a spot added elsewhere shows up here too.
  // Phase 22 — walking into a saved spot is an event, so it's detected in an
  // effect rather than derived during render: the "already called out" set
  // is memory that has to be written when it happens, and mutating it while
  // rendering would make the alert depend on how many times React chose to
  // re-render.
  const currentFix = tracking.fix;
  useEffect(() => {
    if (!following || annotationAlertMode !== "live" || !currentFix) return;
    const entered = annotationAlerts(
      { lat: currentFix.lat, lng: currentFix.lng },
      annotations,
      firedAnnotationIds.current
    );
    if (entered.length === 0) return;
    for (const alert of entered) firedAnnotationIds.current.add(alert.id.replace(/^annotation-/, ""));
    setEnteredSpotAlert(entered[0]);
  }, [following, annotationAlertMode, currentFix, annotations]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listAnnotations().then((rows) => {
        if (!cancelled) setAnnotations(rows);
      });
      getAnnotationAlertMode().then((mode) => {
        if (!cancelled) setAnnotationAlertModeState(mode);
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
      <ScreenSurface>
        <View style={styles.content}>
          <ActivityIndicator />
        </View>
      </ScreenSurface>
    );
  }

  if (!journey) {
    return (
      <ScreenSurface>
        <View style={styles.content}>
          <Text style={styles.empty}>This journey was deleted.</Text>
        </View>
      </ScreenSurface>
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
    following && tracking.fix
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
  const followMode: MapFollowMode = !following ? "off" : cameraLocked ? "follow" : "free";

  // Following is offered from half an hour before departure until the
  // journey's planned end, plus slack for running late. Outside that window
  // there's nothing to follow and the control would just be noise.
  const departMs = new Date(journey.departTime).getTime();
  const plannedEndMs = departMs + journey.legs.reduce((sum, leg) => sum + leg.durationMin, 0) * 60_000;
  const canStartJourney = nowMs >= departMs - START_WINDOW_BEFORE_MS && nowMs <= plannedEndMs + START_WINDOW_AFTER_MS;

  // Every leg is "upcoming" unless a journey is actually being followed, so
  // the planning and History views are untouched by any of this.
  const legStateFor = (index: number): LegState => {
    if (!following || !progress) return "upcoming";
    if (index < progress.currentLegIndex) return "completed";
    return index === progress.currentLegIndex ? "current" : "upcoming";
  };
  const completedCount = following && progress ? progress.currentLegIndex : 0;

  // Phase 22 — the one live alert worth showing right now. Weather and gear
  // timing always apply while following; the saved-spot alerts are the ones
  // the user gets to opt into, and the per-trip mute silences the lot.
  const liveAlert =
    !following || !progress || alertsMuted
      ? null
      : topAlert([
          ...weatherAheadAlerts(journey.legs, progress),
          ...gearTimingAlerts(journey.legs, progress),
          ...(enteredSpotAlert ? [enteredSpotAlert] : []),
        ]);

  // The pre-departure briefing: the spots this route actually passes,
  // resolved from the ids applyAnnotationsToLegs already stamped on each leg
  // — no new matching logic, and it can't disagree with the leg rows.
  const routeAnnotations =
    annotationAlertMode === "off"
      ? []
      : annotations.filter((a) => journey.legs.some((leg) => leg.matchedAnnotationIds?.includes(a.id)));
  const showBriefing = !following && !route.params.readOnly && routeAnnotations.length > 0;

  // Either it was saved on a previous visit (the Journey carries the id) or
  // it was saved a moment ago in this one.
  const alreadySaved = !!journey.savedRouteId || savedAsJourney;

  const totalDurationMin = journey.legs.reduce((sum, leg) => sum + leg.durationMin, 0);
  const journeyEndMs = new Date(journey.departTime).getTime() + totalDurationMin * 60_000;
  // §4.2 — the prompt appears once the journey is over. "Over" was scheduled
  // departTime + total planned duration, which is wrong in both directions:
  // it prompts while you're still walking when you're running late, and makes
  // you wait when you got in early. A detected arrival is the real signal, so
  // it wins when there is one; the clock stays as the fallback for journeys
  // that were never followed.
  const journeyIsOver = tracking.arrived || journeyEndMs < nowMs;
  const showFeedbackStrip = !feedbackGiven && !journey.feedback && journeyIsOver;

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

  // §4.3 — the shape of the trip, never its date: a saved journey stores
  // origin, stops, destination and mode, and gets pointed at a new time on
  // the Plan screen whenever it's reused.
  async function saveAsJourney() {
    // Claimed before the await, not after: the write is a round-trip to
    // SQLite, and two taps inside that window would otherwise file the same
    // trip away twice.
    if (alreadySaved) return;
    setSavedAsJourney(true);
    const saved = await createSavedRoute({
      label: `${journey!.origin.label} → ${journey!.destination.label}`,
      originId: journey!.origin.id,
      destinationId: journey!.destination.id,
      preferredMode: dominantMode(journey!.legs),
      waypointIds: journey!.waypoints?.map((w) => w.id),
    });
    // Stamped on the Journey too, so re-opening it shows this as already
    // saved rather than offering to save a second copy.
    const updated = { ...journey!, savedRouteId: saved.id };
    await updateJourney(updated);
    setJourney(updated);
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
    <ScreenSurface>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.mapContainer, following && styles.mapContainerJourney]}>
          <JourneyMap
            stops={stops}
            routePath={routePath}
            accentColor={accentColor}
            // The origin marker carries the mode you're travelling by (the
            // same glyph the live puck uses), so "where I set off" and "what
            // I'm on" are one marker rather than a generic place-pin.
            originMode={dominantMode(journey.legs)}
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
          {following && !cameraLocked && (
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

        {following && (
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

        {/* Phase 22 — one alert at a time. This sits on a screen someone is
            glancing at mid-stride; a stack of chips here is a stack nobody
            reads. The mute is per-trip only and never writes the Settings
            preference. */}
        {liveAlert && (
          <View style={styles.alertChip}>
            <Text style={styles.alertChipText}>{liveAlert.message}</Text>
            <Pressable
              onPress={() => setAlertsMuted(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Quiet alerts for this trip"
            >
              <Text style={styles.alertChipAction}>Quiet</Text>
            </Pressable>
          </View>
        )}

        {/* Phase 22 — the turns within the leg you're on, under the alert
            chip so a weather or gear nudge always sits above the navigation
            detail. Absent for transit legs and for anything planned before
            steps were requested. */}
        {following && progress && currentLeg?.steps && currentLeg.steps.length > 0 && (
          <StepList steps={currentLeg.steps} legFraction={progress.currentLegFraction} />
        )}

        {/* Off route is a real state, not a failure — the ETA above keeps
            counting off the route you planned, which stops being true once
            you've left it. Re-planning is the honest fix, so this offers it
            directly rather than leaving the user to work out that the
            numbers above have quietly gone stale. */}
        {following && progress?.isOffRoute && (
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

        {/* Phase 22 — the spots on this route, read before you set off. This
            is the path that works with the phone in a pocket, which is why
            it's the default rather than live alerts. */}
        {showBriefing && (
          <View style={styles.briefingCard}>
            <Text style={styles.briefingTitle}>On this route</Text>
            {routeAnnotations.map((annotation) => (
              <View key={annotation.id} style={styles.briefingRow}>
                <EffectIcon kind={annotation.effect} size={14} color={theme.annotationPin} />
                <Text style={styles.briefingText}>
                  {annotation.label} — {EFFECT_META[annotation.effect].label.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
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

        {/* Everything below the map is one width-capped column with a single
            rhythm, rather than the previous mix of full-bleed strips, cards
            carrying their own margins, and bare rows. The banners above stay
            edge-to-edge on purpose (§9.3 items 2-3 — they're strips attached
            to the map), and the map itself is deliberately outside the cap. */}
        <View style={styles.body}>
          {/* What am I looking at: where, when, how long. Hidden while
              following, where the live journey bar above is already the
              answer and a static planned time would contradict it. */}
          {!following && <JourneySummary journey={journey} totalDurationMin={totalDurationMin} />}

          {/* Journeys reached any way other than Today's "Leaving now" still
              need a way in. Offered near the departure window only —
              following a journey you're not on yet is just a battery drain.
              Now the first action under the summary, where a primary CTA
              belongs, instead of buried between two banners. */}
          {!route.params.readOnly && !following && canStartJourney && (
            <AppButton
              label="Follow this journey"
              accessibilityLabel="Follow this journey on the map"
              onPress={() => {
                setCameraLocked(true);
                setJourneyMode(true);
              }}
              icon={<ActionIcon kind="crosshair" size={16} color="#FFFFFF" />}
            />
          )}

          {!route.params.readOnly && recurrenceTemplate?.recurrence && (
            <View style={styles.recurrenceRow}>
              <ActionIcon kind="repeat" size={14} color={theme.textSecondary} />
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

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What to wear</Text>
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
          </View>

          {calibrationToast && (
            <View style={styles.calibrationToast}>
              <Text style={styles.calibrationToastText}>{calibrationToast}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Step by step</Text>
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
                <View key={leg.id}>
                  <LegRow
                    leg={leg}
                    state={state}
                    progressFraction={progress?.currentLegFraction}
                    remainingMin={
                      state === "current" && progress ? leg.durationMin * (1 - progress.currentLegFraction) : undefined
                    }
                  />
                  {/* The turns within this leg, on a journey you're reading
                      rather than walking. While following, the current leg's
                      steps are already pinned under the map (with the next
                      one highlighted), so repeating every turn here would be
                      a second copy of the same instructions. */}
                  {!following && leg.steps && leg.steps.length > 0 && <StepList steps={leg.steps} nested />}
                </View>
              );
            })}
          </View>

          {/* The prompt now sits above the footer actions rather than below
              "Delete journey," which put the one thing the app is asking the
              user for underneath the one action that throws it away. */}
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

          <View style={styles.footerActions}>
            {/* §4.3 — "or after the fact from a Journey Detail screen's
                overflow menu ('Save as a route')", which never got built
                until now. This is the path for a trip you've already taken
                and want again: it files the route, stops and mode away as a
                reusable saved journey, and deliberately keeps no date. */}
            {/* Stays put once saved, reading "Saved", rather than
                disappearing — a control that vanishes on tap leaves the user
                with no confirmation that anything happened. */}
            <AppButton
              label={alreadySaved ? "Saved to your journeys" : "Save this journey"}
              variant="secondary"
              disabled={alreadySaved}
              accessibilityLabel={
                alreadySaved ? "Already saved to your journeys" : "Save this journey to reuse later"
              }
              onPress={saveAsJourney}
              icon={
                <ActionIcon
                  kind="bookmark"
                  size={15}
                  color={alreadySaved ? theme.accentWalk : theme.textPrimary}
                  filled={alreadySaved}
                />
              }
            />
            {/* §4.4/§9.4.2 — the return-trip link doesn't apply to something
                already past, so History's read-only view hides it. */}
            {!route.params.readOnly && journey.linkedReturnJourneyId && (
              <AppButton
                label="Return trip"
                variant="secondary"
                accessibilityLabel="View return trip"
                onPress={() => navigation.push("JourneyDetail", { journeyId: journey.linkedReturnJourneyId! })}
                icon={<ActionIcon kind="swap" size={15} color={theme.textPrimary} />}
              />
            )}
            <AppButton
              label="Delete journey"
              variant="danger"
              size="sm"
              accessibilityLabel="Delete this journey"
              onPress={confirmDelete}
            />
          </View>
        </View>
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
    </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // §9.2 — one readable column, centred, rather than a screen that keeps
    // stretching: at web/tablet widths the map became a letterbox strip and
    // every banner a full-width rule. Capping the scroll content (map
    // included) keeps the whole screen one object.
    scrollContent: { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    // The single column everything below the map lives in — one horizontal
    // margin and one vertical rhythm for the lot.
    body: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl * 2, gap: SPACING.lg },
    section: { gap: SPACING.sm },
    sectionLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary },
    footerActions: { gap: SPACING.sm, marginTop: SPACING.sm },
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
    recenterChipLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
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
    journeyBarEta: { ...TYPE.body, fontWeight: "700", color: theme.textPrimary },
    journeyBarStatus: { ...TYPE.caption, color: theme.textSecondary },
    offRouteBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.uvBadge,
    },
    offRouteText: { flex: 1, ...TYPE.caption, fontWeight: "600", color: "#FFFFFF" },
    offRouteAction: { ...TYPE.caption, fontWeight: "700", color: "#FFFFFF", textDecorationLine: "underline" },
    journeyBarAction: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    alertChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 20,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      borderLeftWidth: 3,
      borderLeftColor: theme.accentWalk,
    },
    alertChipText: { flex: 1, ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    alertChipAction: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary },
    briefingCard: {
      marginHorizontal: 20,
      marginTop: 12,
      padding: 12,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      gap: 6,
    },
    briefingTitle: { ...TYPE.caption, fontWeight: "700", color: theme.textPrimary },
    briefingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    briefingText: { flex: 1, ...TYPE.caption, color: theme.textSecondary },
    cachedBanner: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: theme.conditionLight },
    cachedBannerText: { ...TYPE.caption, color: theme.textPrimary },
    severeBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.conditionStorm },
    severeBannerText: { flex: 1, ...TYPE.caption, color: "#FFFFFF", fontWeight: "600" },
    confidenceBanner: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: theme.surface },
    confidenceBannerText: { ...TYPE.caption, color: theme.confidenceLow },
    // Inside the body column now, so it reads as a property of this journey
    // rather than another full-bleed strip competing with the banners.
    recurrenceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.pill,
      backgroundColor: theme.surface,
    },
    recurrenceLabel: { ...TYPE.caption, color: theme.textSecondary, flex: 1 },
    recurrenceToggleLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk, minHeight: 30, textAlignVertical: "center" },
    completedToggle: { minHeight: 44, justifyContent: "center", alignItems: "center" },
    completedToggleLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary },
    feedbackContainer: { gap: SPACING.sm },
    feedbackPrompt: { ...TYPE.caption, color: theme.textSecondary },
    feedbackRow: { flexDirection: "row", gap: SPACING.xs },
    feedbackButton: { flex: 1, minHeight: 44, justifyContent: "center", paddingVertical: SPACING.sm, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: theme.surface },
    feedbackButtonPositive: { backgroundColor: theme.feedbackPositive },
    feedbackLabel: { ...TYPE.micro, textAlign: "center", color: theme.textPrimary },
    calibrationToast: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: theme.surfaceRaised },
    calibrationToastText: { ...TYPE.caption, color: theme.textPrimary },
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
    sheetTitle: { ...TYPE.subtitle, textAlign: "center", color: theme.textPrimary },
  });
}

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { listLocations } from "../../db/repositories/locations";
import { createSavedRoute, listSavedRoutes, touchSavedRoute } from "../../db/repositories/savedRoutes";
import { updateJourney } from "../../db/repositories/journeys";
import { planJourney, DEPART_TIME_LEAD_MS } from "../../lib/planJourney";
import { showAlert } from "../../lib/crossPlatformAlert";
import { findRainWindowNear } from "../../lib/weather";
import { getHourlyForecast } from "../../services/weatherService";
import { formatTime } from "../../lib/formatTime";
import { useNowBucket } from "../../lib/useNowBucket";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import SavedLocationPicker from "../../components/SavedLocationPicker";
import HourlyOutlook from "../../components/HourlyOutlook";
import FormRow from "../../components/FormRow";
import FormSection from "../../components/FormSection";
import ActionIcon from "../../components/ActionIcon";
import useTheme from "../../theme/useTheme";
import { SPACING } from "../../theme/typography";
import type { CarryPreference, SavedLocation, SavedRoute, TravelMode } from "../../types";

// Journey planner — docs/04-screens-navigation.md §4.3/§4.3.1, wired to the
// real Google Routes + Open-Meteo pipeline (docs/08-build-phases.md Phase 4,
// src/lib/planJourney.ts).
const MODES: TravelMode[] = ["walk", "drive", "bus", "train", "cycle"];
const MODE_LABEL: Record<TravelMode, string> = {
  walk: "Walk",
  drive: "Drive",
  bus: "Bus",
  train: "Train",
  cycle: "Cycle",
  hike: "Hike",
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Same relabelling and reasoning as SettingsScreen.tsx's identical
// constant — the old chip showed the raw CarryPreference value name
// ("No preference"/"Avoid spares") with no label explaining what it even
// was, cycling silently on tap. This is the per-trip override of the
// Settings-level default (§7.9).
const CARRY_PREFERENCE_OPTIONS: { value: CarryPreference; label: string }[] = [
  { value: "no-preference", label: "Pack a spare" },
  { value: "avoid-spares", label: "Skip it" },
];

// Was a bare "Formal occasion" switch with no supporting copy — a toggle whose
// label named an occasion but never said what flipping it would change. It's
// now the same labelled segmented control as the spare layer above it, with a
// hint drawn from what §7.10 actually does: prefer a formal-type shoe (even at
// a waterproof/grip penalty), bias layer picks toward `formal`-tagged items,
// and skip the wind-chill layer, since bulk is likelier to be wrong for the
// occasion than useful.
const FORMAL_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: "Everyday" },
  { value: true, label: "Formal" },
];

// A default return time needs *some* starting point before the user edits
// it — 8h after the outbound leave time approximates a typical workday,
// same as the placeholder value Phase 3 originally hardcoded (now
// user-editable rather than fixed).
const DEFAULT_RETURN_GAP_MS = 8 * 60 * 60_000;
// How far around the chosen return time to look for a nearby rain window —
// wide enough to catch "just missed it by 45 minutes," narrow enough that
// the suggestion still reads as "near your time," not "sometime today."
const RETURN_RAIN_LOOKAROUND_HOURS = 2;
// findRainWindowNear() only suggests a shift when the rain run has a dry
// reading immediately before and after it — a genuine isolated shower, not
// just the edge of a longer spell. Fetching this much extra padding beyond
// the lookaround window means a shower sitting right at that boundary
// still has a real reading past it to confirm dryness against, rather than
// silently failing the isolation check for lack of data.
const RETURN_RAIN_FETCH_PADDING_HOURS = 2;

type TimeMode = "leave-now" | "leave-by" | "arrive-by";
const TIME_MODE_LABEL: Record<TimeMode, string> = {
  "leave-now": "Leave now",
  "leave-by": "Leave by",
  "arrive-by": "Arrive by",
};
const TIME_MODES: TimeMode[] = ["leave-now", "leave-by", "arrive-by"];

// Granularity "Leave now" is rounded to for the hourly outlook — see
// selectedDepartTimeIso. Small enough that "now" stays honest, coarse enough
// that an idle Plan screen costs at most a dozen Google Routes calls an hour.
const DEPART_BUCKET_MS = 5 * 60_000;

// Route-rail geometry. A SavedLocationPicker stacks a 13px label (12 top
// margin + ~17 line + 4 bottom margin ≈ 33) above a 44-minHeight bordered
// field, putting the centre of that field ~56px down the row. The rail's
// markers used to sit at 34 — level with the *top* edge of the field, which
// read as each marker labelling the gap above its input rather than the
// input itself. Centring them on the field instead is the whole point of
// these two constants; if the picker's label or field metrics change, this
// is the one number to re-derive.
const PICKER_FIELD_CENTER_Y = 56;
const MARKER_BOX = 22;
const RAIL_LEAD = PICKER_FIELD_CENTER_Y - MARKER_BOX / 2;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function nowDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function PlanScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [origin, setOrigin] = useState<SavedLocation | undefined>(undefined);
  const [destination, setDestination] = useState<SavedLocation | undefined>(undefined);
  // Undefined entries are stops the user hasn't picked a place for yet —
  // same "unset until chosen" convention origin/destination already use
  // (SavedLocationPicker already renders a placeholder for `undefined`).
  // addStop() used to require an existing saved location to seed a new row
  // with, which meant it silently did nothing for a brand-new install with
  // no saved locations yet (worse, that guard fired a showAlert(), which on
  // web is a blocking window.alert and unreliable in embedded browsers — see
  // DECISIONS.md 2026-07-23 — so it read as the button doing literally
  // nothing). A stop can now always start empty.
  const [waypoints, setWaypoints] = useState<(SavedLocation | undefined)[]>([]);
  const [timeMode, setTimeMode] = useState<TimeMode>("leave-now");
  const [dateStr, setDateStr] = useState(nowDateStr());
  const [timeStr, setTimeStr] = useState(nowTimeStr());
  const [mode, setMode] = useState<TravelMode>("walk");
  const [repeatsEnabled, setRepeatsEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [planReturnTrip, setPlanReturnTrip] = useState(false);
  const [returnDateStr, setReturnDateStr] = useState("");
  const [returnTimeStr, setReturnTimeStr] = useState("");
  const [returnRainWindow, setReturnRainWindow] = useState<{ startIso: string; endIso: string } | null>(null);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const [saveThisRoute, setSaveThisRoute] = useState(false);
  const [formal, setFormal] = useState(false);
  const [carryPreference, setCarryPreference] = useState<CarryPreference>("no-preference");
  const [planning, setPlanning] = useState(false);
  // Stable "now" for the "Leave now" outlook — see selectedDepartTimeIso below.
  const departNowBucket = useNowBucket(DEPART_BUCKET_MS);

  useFocusEffect(
    useCallback(() => {
      listLocations().then((rows) => {
        setLocations(rows);
        // Origin defaults to Home (if set) whenever Plan is opened fresh —
        // docs/04-screens-navigation.md §4.3, "the most common case is
        // planning from home right now." The functional setState form
        // reads the *current* origin at update time rather than a
        // potentially-stale closure, so this stays correct without
        // needing `origin` in a dependency list — and only ever overrides
        // an unset origin, never one the user already picked.
        const home = rows.find((l) => l.label.trim().toLowerCase() === "home");
        if (home) setOrigin((prev) => prev ?? home);
      });
      listSavedRoutes().then(setSavedRoutes);
    }, [])
  );

  function applySavedRoute(route: SavedRoute) {
    const routeOrigin = locations.find((l) => l.id === route.originId);
    const routeDestination = locations.find((l) => l.id === route.destinationId);
    if (routeOrigin) setOrigin(routeOrigin);
    if (routeDestination) setDestination(routeDestination);
    if (route.preferredMode) setMode(route.preferredMode);
    touchSavedRoute(route.id);
  }

  function addStop() {
    setWaypoints((current) => [...current, undefined]);
  }

  function toggleDay(day: number) {
    setSelectedDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()));
  }

  async function handlePlanJourney() {
    if (!origin || !destination) {
      showAlert("Pick a start location and destination", "Both are needed before this can be planned.");
      return;
    }
    // A stop row can be added and left empty (see addStop() above) — drop
    // any that were never actually given a place before this goes anywhere
    // near planJourney(), which expects a real, fully-resolved SavedLocation
    // per waypoint.
    const filledWaypoints = waypoints.filter((w): w is SavedLocation => !!w);

    // "Leave now" is a mode in its own right, not a correction — no notice
    // needed. "Leave by" is checked client-side since we already know the
    // clock time; "arrive by" is resolved server-side (planJourney doesn't
    // know the answer until it's solved the route), so its own
    // `timeAdjusted` flag is checked once the plan comes back instead.
    let departTime = new Date(Date.now() + DEPART_TIME_LEAD_MS).toISOString();
    let arriveByTime: string | undefined;
    let timeWasAdjustedLocally = false;
    if (timeMode === "leave-by") {
      departTime = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      if (new Date(departTime).getTime() <= Date.now() + DEPART_TIME_LEAD_MS) {
        departTime = new Date(Date.now() + DEPART_TIME_LEAD_MS).toISOString();
        timeWasAdjustedLocally = true;
      }
    } else if (timeMode === "arrive-by") {
      arriveByTime = new Date(`${dateStr}T${timeStr}:00`).toISOString();
    }

    const recurrence =
      timeMode === "leave-by" && repeatsEnabled && selectedDays.length > 0
        ? { daysOfWeek: selectedDays, departTimeOfDay: timeStr, active: true }
        : undefined;

    setPlanning(true);
    try {
      const result = await planJourney({
        origin,
        destination,
        waypoints: filledWaypoints,
        departTime,
        arriveByTime,
        mode,
        formal,
        carryPreference,
        recurrence,
      });

      if (result.kind === "failed") {
        // §5.1 — no live route and no cached fallback to reuse.
        showAlert("Can't plan a new route right now", "Check your connection, then try again.", [
          { text: "Retry", onPress: handlePlanJourney },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      if (timeWasAdjustedLocally || result.timeAdjusted) {
        showAlert(
          "Leaving now instead",
          "Your requested time had already passed by the time this was planned, so we're planning from right now."
        );
      }

      if (planReturnTrip) {
        // A user-picked return date/time (defaulted to +8h when the toggle
        // was switched on, editable from there) replaces the old fixed
        // +8h-no-matter-what mock. Falls back to that same +8h if the
        // fields are somehow still empty (e.g. toggled on and off fast
        // enough that the seeding effect never ran).
        const parsedReturn = returnDateStr && returnTimeStr ? new Date(`${returnDateStr}T${returnTimeStr}:00`) : null;
        const returnDepart = (
          parsedReturn && !isNaN(parsedReturn.getTime())
            ? parsedReturn
            : new Date(new Date(result.journey.departTime).getTime() + DEFAULT_RETURN_GAP_MS)
        ).toISOString();
        const returnResult = await planJourney({
          origin: destination,
          destination: origin,
          waypoints: [...filledWaypoints].reverse(),
          departTime: returnDepart,
          mode,
          formal,
          carryPreference,
        });
        if (returnResult.kind !== "failed") {
          await Promise.all([
            updateJourney({ ...result.journey, linkedReturnJourneyId: returnResult.journey.id }),
            updateJourney({ ...returnResult.journey, linkedReturnJourneyId: result.journey.id }),
          ]);
        }
      }

      if (saveThisRoute) {
        await createSavedRoute({ label: `${origin.label} → ${destination.label}`, originId: origin.id, destinationId: destination.id, preferredMode: mode });
      }

      navigation.navigate("JourneyDetail", {
        journeyId: result.journey.id,
        cachedFromDate: result.kind === "success-cached" ? result.cachedFromDate : undefined,
      });
    } finally {
      setPlanning(false);
    }
  }

  // §9.5 — feeds the hourly outlook below the date/time fields; invalid
  // in-progress typing (mid-edit date/time text) simply omits the outlook
  // rather than crashing on an "Invalid Date" .toISOString() call. "Leave
  // now" has no typed time to parse — anchor it on the current time instead.
  //
  // Quantised to a bucket (see useNowBucket) rather than read as a raw
  // instant, which matters more than it looks. A bare `new Date()` here
  // produces a new millisecond value on *every render*, and the outlook keys
  // its forecast and ETA fetches on this string: each response's state update
  // re-renders Plan, mints a new timestamp, and invalidates the request that
  // just landed, so the route ETA's debounce is reset before it can fire.
  //
  // The *next* boundary, not the current one: Google Routes rejects a past
  // departureTime outright ("Timestamp must be set to a future time", HTTP
  // 400 — observed against the live API), which a rounded-down bucket is for
  // all but the first instant of its window. Rounding up keeps the value
  // stable between renders *and* always in the future, at the cost of "leave
  // now" meaning "within the next five minutes" — well inside the hourly
  // granularity the outlook actually displays.
  let selectedDepartTimeIso: string | undefined;
  if (timeMode === "leave-now") {
    selectedDepartTimeIso = new Date(departNowBucket + DEPART_BUCKET_MS).toISOString();
  } else {
    const selectedDepartTime = new Date(`${dateStr}T${timeStr}:00`);
    selectedDepartTimeIso = isNaN(selectedDepartTime.getTime()) ? undefined : selectedDepartTime.toISOString();
  }

  // Same "omit rather than crash on invalid in-progress typing" pattern as
  // selectedDepartTimeIso above.
  let returnDepartTimeIso: string | undefined;
  if (returnDateStr && returnTimeStr) {
    const returnDepartTime = new Date(`${returnDateStr}T${returnTimeStr}:00`);
    returnDepartTimeIso = isNaN(returnDepartTime.getTime()) ? undefined : returnDepartTime.toISOString();
  }

  function seedReturnTimeIfUnset(enabling: boolean) {
    setPlanReturnTrip(enabling);
    if (enabling && !returnDateStr && !returnTimeStr) {
      const base = new Date((selectedDepartTimeIso ? new Date(selectedDepartTimeIso).getTime() : Date.now()) + DEFAULT_RETURN_GAP_MS);
      setReturnDateStr(`${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`);
      setReturnTimeStr(`${pad2(base.getHours())}:${pad2(base.getMinutes())}`);
    }
  }

  // Scans a window centred on the chosen return time for a nearby rain
  // window (§7.14-adjacent, but purely informational — same non-blocking,
  // suggestion-only posture as the severe-weather advisory). Runs off the
  // *destination*'s coordinates, since that's where the return leg departs
  // from. Omits the suggestion entirely on a failed fetch, same "supplement,
  // not a blocker" degrade HourlyOutlook already uses.
  useEffect(() => {
    if (!planReturnTrip || !destination || !returnDepartTimeIso) {
      Promise.resolve().then(() => setReturnRainWindow(null));
      return;
    }
    let cancelled = false;
    const lookAroundMs = (RETURN_RAIN_LOOKAROUND_HOURS + RETURN_RAIN_FETCH_PADDING_HOURS) * 3_600_000;
    const fetchFromIso = new Date(new Date(returnDepartTimeIso).getTime() - lookAroundMs).toISOString();
    const hoursToFetch = (RETURN_RAIN_LOOKAROUND_HOURS + RETURN_RAIN_FETCH_PADDING_HOURS) * 2 + 1;
    getHourlyForecast({ lat: destination.lat, lng: destination.lng }, fetchFromIso, hoursToFetch).then((result) => {
      if (cancelled) return;
      setReturnRainWindow("data" in result ? findRainWindowNear(result.data, returnDepartTimeIso!, RETURN_RAIN_LOOKAROUND_HOURS) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [planReturnTrip, destination, returnDepartTimeIso]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {savedRoutes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {savedRoutes.map((route) => (
            <Pressable key={route.id} onPress={() => applySavedRoute(route)} style={styles.routeChip}>
              <Text style={styles.routeChipLabel}>{route.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <FormSection title="Route">
        <View style={styles.timelineRow}>
          <View style={styles.timelineRail}>
            {/* Blank, not dashed — nothing comes before the start of a
                route. It exists only to drop the marker onto the same
                baseline every other marker sits on. */}
            <View style={styles.timelineLeadSpacer} />
            <View style={styles.timelineMarker}>
              <ActionIcon kind="pin" size={18} color={theme.accentWalk} />
            </View>
            <View style={styles.timelineConnector} />
          </View>
          <View style={styles.timelineContent}>
            <SavedLocationPicker label="Start Location" value={origin} onChange={setOrigin} placeholder="Choose a start location" />
          </View>
        </View>

        {waypoints.map((stop, index) => (
          <View key={index} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineConnectorLead} />
              <View style={styles.timelineMarker}>
                <View style={styles.timelineDotStop} />
              </View>
              <View style={styles.timelineConnector} />
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.waypointRow}>
                <View style={styles.waypointPicker}>
                  <SavedLocationPicker
                    label={`Stop ${index + 1}`}
                    value={stop}
                    onChange={(location) =>
                      setWaypoints((current) => current.map((w, i) => (i === index ? location : w)))
                    }
                    placeholder="Choose a stop"
                  />
                </View>
                <Pressable
                  onPress={() => setWaypoints((current) => current.filter((_, i) => i !== index))}
                  hitSlop={8}
                  style={styles.removeStop}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove stop ${index + 1}`}
                >
                  <ActionIcon kind="close" size={16} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.timelineRow}>
          <View style={styles.timelineRail}>
            {/* The rail used to stop dead at the bottom of the row above and
                pick up again at a marker pinned to the very top of this one —
                the line visibly broke right where the route arrives, and that
                marker sat a good 30px higher than every dot above it. This
                lead segment carries the dashes down through the gap and drops
                it onto the same baseline as the other markers. */}
            <View style={styles.timelineConnectorLead} />
            <View style={styles.timelineMarker}>
              <ActionIcon kind="flag" size={18} color={theme.accentWalk} filled />
            </View>
          </View>
          <View style={styles.timelineContent}>
            <SavedLocationPicker label="Destination" value={destination} onChange={setDestination} placeholder="Choose a destination" />
          </View>
        </View>

        <Pressable onPress={addStop} accessibilityRole="button" accessibilityLabel="Add a stop">
          <Text style={styles.addStopLabel}>+ Add a stop</Text>
        </Pressable>
      </FormSection>

      {/* Mode sits above When deliberately: how you're travelling is what
          decides how long the trip takes, and the When section's hourly
          outlook is computed from that duration — picking the time first
          means picking it against an outlook the next tap invalidates. */}
      <FormSection title="Mode">
        <View style={styles.row}>
          {MODES.map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeChip, mode === m && styles.modeChipActive]}>
              <Text style={[styles.modeChipLabel, mode === m && styles.modeChipLabelActive]}>{MODE_LABEL[m]}</Text>
            </Pressable>
          ))}
        </View>
      </FormSection>

      <FormSection title="When">
        <View style={styles.row}>
          {TIME_MODES.map((tm) => (
            <Pressable key={tm} onPress={() => setTimeMode(tm)} style={[styles.modeChip, timeMode === tm && styles.modeChipActive]}>
              <Text style={[styles.modeChipLabel, timeMode === tm && styles.modeChipLabelActive]}>{TIME_MODE_LABEL[tm]}</Text>
            </Pressable>
          ))}
        </View>
        {timeMode !== "leave-now" && (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholderTextColor={theme.textSecondary}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="YYYY-MM-DD"
            />
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholderTextColor={theme.textSecondary}
              value={timeStr}
              onChangeText={setTimeStr}
              placeholder="HH:mm"
            />
          </View>
        )}
        {origin && destination && selectedDepartTimeIso && (
          <HourlyOutlook
            origin={origin}
            waypoints={waypoints}
            destination={destination}
            mode={mode}
            departTimeIso={selectedDepartTimeIso}
          />
        )}

        {timeMode === "leave-by" && (
          <FormRow label="Repeats">
            <Switch value={repeatsEnabled} onValueChange={setRepeatsEnabled} />
          </FormRow>
        )}
        {timeMode === "leave-by" && repeatsEnabled && (
          <View style={styles.row}>
            {DAY_LABELS.map((dayLabel, day) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={[styles.dayChip, selectedDays.includes(day) && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipLabel, selectedDays.includes(day) && styles.dayChipLabelActive]}>{dayLabel}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </FormSection>

      {/* One "Preferences" card used to hold the dress code, the spare layer
          and the save-route bookmark together. They aren't one decision: the
          first two change what gets recommended, the third only decides
          whether the route is remembered afterwards. Split into their own
          sections, with saving moved down beside the button that acts on it. */}
      <FormSection title="Dress code">
        <Text style={styles.hint}>
          Formal prefers dress shoes and anything tagged formal, and skips the bulky wind layer.
        </Text>
        <View style={styles.segmentRow}>
          {FORMAL_OPTIONS.map((option) => (
            <Pressable
              key={String(option.value)}
              onPress={() => setFormal(option.value)}
              style={[styles.segment, formal === option.value && styles.segmentActive]}
              accessibilityRole="button"
              // The selected state goes in the *label*, not accessibilityState:
              // react-native-web drops accessibilityState for role="button"
              // entirely (verified in the DOM — no aria-pressed, no
              // aria-selected), which would leave the choice conveyed by fill
              // colour alone, exactly what §9.6 rules out.
              accessibilityLabel={`Dress code: ${option.label}${formal === option.value ? ", selected" : ""}`}
            >
              <Text style={[styles.segmentLabel, formal === option.value && styles.segmentLabelActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </FormSection>

      <FormSection title="Spare layer">
        <Text style={styles.hint}>Whether to suggest packing a removable layer for this trip.</Text>
        <View style={styles.segmentRow}>
          {CARRY_PREFERENCE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setCarryPreference(option.value)}
              style={[styles.segment, carryPreference === option.value && styles.segmentActive]}
              accessibilityRole="button"
              // Selected state in the label — see the dress-code segments above.
              accessibilityLabel={`Spare layer: ${option.label}${carryPreference === option.value ? ", selected" : ""}`}
            >
              <Text style={[styles.segmentLabel, carryPreference === option.value && styles.segmentLabelActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </FormSection>

      {/* One card holds both the toggle and (when on) the time picker below
          it, rather than a switch with a separately-styled block floating
          underneath — the shared card boundary is what reads as "this
          content belongs to this toggle," the same way the Settings
          screen's Advanced disclosure keeps its body inside its own
          section. */}
      <View style={styles.returnCard}>
        <FormRow label="Plan return trip too">
          <Switch value={planReturnTrip} onValueChange={seedReturnTimeIfUnset} />
        </FormRow>
        {planReturnTrip && (
          <View style={styles.returnCardBody}>
            <View style={styles.returnCardDivider} />
            <Text style={styles.label}>Return time</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholderTextColor={theme.textSecondary}
                value={returnDateStr}
                onChangeText={setReturnDateStr}
                placeholder="YYYY-MM-DD"
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholderTextColor={theme.textSecondary}
                value={returnTimeStr}
                onChangeText={setReturnTimeStr}
                placeholder="HH:mm"
              />
            </View>
            {/* The return trip runs the same route backwards, so its outlook
                takes the reversed stop order — the destination is where you
                set off from on the way home. */}
            {origin && destination && returnDepartTimeIso && (
              <HourlyOutlook
                origin={destination}
                waypoints={[...waypoints].reverse()}
                destination={origin}
                mode={mode}
                departTimeIso={returnDepartTimeIso}
              />
            )}
            {returnRainWindow && (
              <View style={styles.rainSuggestion}>
                <Text style={styles.rainSuggestionText}>
                  Rain expected {formatTime(returnRainWindow.startIso, hour12)}–{formatTime(returnRainWindow.endIso, hour12)} near your
                  return time — consider leaving before {formatTime(returnRainWindow.startIso, hour12)} or after{" "}
                  {formatTime(returnRainWindow.endIso, hour12)} to dodge the shower.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Last thing before the button that acts on it — saving is a decision
          about this route as a whole, so it only really makes sense once the
          route above it is settled. */}
      <Pressable
        onPress={() => setSaveThisRoute((v) => !v)}
        style={styles.saveRouteRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: saveThisRoute }}
        // State repeated in the label because react-native-web emits neither
        // aria-checked nor aria-pressed here (verified in the DOM), so without
        // it the only signal that this is on is the bookmark's fill colour.
        accessibilityLabel={saveThisRoute ? "Save this route, on" : "Save this route, off"}
      >
        <ActionIcon kind="bookmark" size={20} color={saveThisRoute ? theme.accentWalk : theme.textSecondary} filled={saveThisRoute} />
        <Text style={styles.label}>Save this route</Text>
      </Pressable>

      <Pressable onPress={handlePlanJourney} disabled={planning} style={[styles.planButton, planning && styles.planButtonDisabled]}>
        {planning ? <ActivityIndicator color={theme.bg} /> : <Text style={styles.planButtonLabel}>Plan journey</Text>}
      </Pressable>
    </ScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { padding: 20, gap: 4, backgroundColor: theme.bg },
    chipRow: { marginBottom: 8 },
    routeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surface, marginRight: 8 },
    routeChipLabel: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
    // Route timeline — a small rail to the left of each origin/stop/
    // destination field: a pin for the origin, an outlined dot for each stop,
    // a flag for the destination, connected by a dashed line so the row of
    // separate pickers reads as one continuous route instead of an unordered
    // list of location fields. (The same three shapes carry over onto the
    // map's markers — see leafletIcons.ts.)
    //
    // Every marker is centred on the picker's *field box*, not on the top of
    // it — see RAIL_LEAD above. The offset is produced by a lead segment
    // above the marker rather than a marginTop on the marker itself, so the
    // dashes can run *through* it instead of leaving a hole in the line above
    // every single marker — which is what the rail used to do.
    timelineRow: { flexDirection: "row" },
    timelineRail: { width: 22, alignItems: "center" },
    timelineDotStop: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: theme.textSecondary,
      backgroundColor: theme.surface,
    },
    // One fixed-height box every marker sits centred inside, so the flag (18),
    // the pin (18) and the stop dot (10) all land on the same centre line
    // without each needing its own lead height worked out from its own size.
    timelineMarker: { height: MARKER_BOX, alignItems: "center", justifyContent: "center" },
    timelineLeadSpacer: { height: RAIL_LEAD },
    // marginTop only, not marginVertical: the 4px is breathing room under the
    // marker, but a matching 4px at the *bottom* just reopened the hole at
    // each row boundary that timelineConnectorLead's negative top margin
    // exists to close. Running flush to the row edge lets the two segments
    // meet across FormSection's gap.
    timelineConnector: { flex: 1, borderLeftWidth: 2, borderStyle: "dashed", borderColor: theme.border, marginTop: 4 },
    // The dashed version of timelineLeadSpacer, for every marker that has a
    // route arriving at it. Fixed height rather than flex: 1 — it runs
    // *above* its marker, so it has to end exactly on the shared baseline,
    // not absorb the leftover row height. The negative top margin pulls it up
    // through FormSection's 12px row gap so it meets the segment coming down
    // from the row above; the -4/+4 leaves the same 4px breathing room above
    // the marker that timelineConnector leaves below it.
    timelineConnectorLead: {
      height: RAIL_LEAD + SPACING.md - 4,
      marginTop: -SPACING.md,
      marginBottom: 4,
      borderLeftWidth: 2,
      borderStyle: "dashed",
      borderColor: theme.border,
    },
    timelineContent: { flex: 1, marginLeft: 10 },
    waypointRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    waypointPicker: { flex: 1 },
    removeStop: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
    addStopLabel: { color: theme.textSecondary, fontSize: 13, marginTop: 8, marginBottom: 4 },
    saveRouteRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
    label: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
    row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    flex1: { flex: 1 },
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: theme.textPrimary },
    modeChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    modeChipActive: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk },
    modeChipLabel: { fontSize: 13, color: theme.textPrimary },
    modeChipLabelActive: { color: "#FFFFFF", fontWeight: "600" },
    returnCard: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.surface,
    },
    returnCardBody: { marginTop: 4 },
    returnCardDivider: { height: 1, backgroundColor: theme.border, marginTop: 12, marginBottom: 4 },
    rainSuggestion: {
      flexDirection: "row",
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.conditionRain,
    },
    rainSuggestionText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
    hint: { fontSize: 12, color: theme.textSecondary, marginBottom: 8 },
    segmentRow: { flexDirection: "row", gap: 8 },
    segment: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
    segmentActive: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk },
    segmentLabel: { fontSize: 13, color: theme.textPrimary },
    segmentLabelActive: { color: "#FFFFFF", fontWeight: "600" },
    dayChip: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
    dayChipActive: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk },
    dayChipLabel: { fontSize: 11, color: theme.textPrimary },
    dayChipLabelActive: { color: "#FFFFFF", fontWeight: "600" },
    planButton: { marginTop: 24, marginBottom: 40, paddingVertical: 14, alignItems: "center", borderRadius: 8, backgroundColor: theme.accentWalk },
    planButtonDisabled: { opacity: 0.6 },
    planButtonLabel: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  });
}

import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import { boundsKey, hexToRgba, regionForCoordinates, usableCoordinates } from "../lib/mapGeometry";
import { DARK_MAP_STYLE } from "./mapDarkStyle";
import ActionIcon from "./ActionIcon";
import ModeIcon from "./ModeIcon";
import type { ModeIconKind } from "./modeIconPaths";
import useTheme from "../theme/useTheme";
import { darkTheme } from "../theme/tokens";

// Journey Detail's map — docs/09-design-system.md §9.3 item 1. Native
// (iOS/Android) implementation; see JourneyMap.web.tsx for why web gets a
// separate file rather than importing react-native-maps directly (
// DECISIONS.md, "Locations CRUD uses text/number fields, not map pin-drop").
// Phase 6 adds the long-press entry point for EnvironmentAnnotation capture
// (§4.5) and the live radius-circle preview shown while the annotation
// sheet is open.
export interface MapStop {
  lat: number;
  lng: number;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusM: number;
}

// §9.3 item 1 — one marker per outdoor leg's midpoint, filled with that
// leg's condition color (§9.1) and containing classifyWeather()'s emoji.
// Computed by the caller (JourneyDetailScreen), which has both the leg
// weather and the active useTheme() token object — JourneyMap itself stays
// a dumb renderer for everything except its own basemap chrome (see
// `theme` below), so the native/web split can't drift on marker styling.
export interface ConditionMarker {
  lat: number;
  lng: number;
  color: string;
  emoji: string;
  label: string; // accessibilityLabel, §9.6 — never color alone
}

// §4.5 — a saved EnvironmentAnnotation shown on the map so the user can see
// their marked local-knowledge spots (windy corners, covered walkways, …)
// alongside the route, not only when actively adding one. Built by the
// caller from EFFECT_META + the annotationPin token, same dumb-renderer
// split as ConditionMarker.
export interface MapAnnotation {
  lat: number;
  lng: number;
  radiusM: number;
  icon: string;
  label: string;
  color: string;
}

// Where a transit leg boards and alights. Both basemaps (Google's and
// CARTO's) draw their own station pucks, but only past roughly zoom 16 — so
// on a map framed to the whole commute, the two points a transit journey
// actually turns on were the only things not marked. These are route data,
// drawn at every zoom, and distinct from a ConditionMarker in shape and
// colour so "here's your stop" never reads as a weather badge.
export interface MapTransitStop {
  lat: number;
  lng: number;
  kind: "board" | "alight";
  /** Drawn inside the marker, so a stop says which vehicle it's for. */
  mode: "bus" | "train";
  color: string;
  label: string; // accessibilityLabel, §9.6
}

// Phase 22 (Journey Mode) — where the user actually is, drawn as a disc
// carrying the current leg's transport glyph rather than the generic blue
// dot every maps app shares. Same dumb-renderer split as the markers above:
// the caller resolves which mode is current and which accent it takes, so
// native and web can't disagree about it.
export interface MapUserPuck {
  lat: number;
  lng: number;
  mode: ModeIconKind;
  /** Degrees clockwise from north; rotates the nose, not the glyph. */
  bearingDeg?: number;
  /** Reported GPS accuracy — drawn as a halo only when it's poor enough to matter. */
  accuracyM?: number;
  color: string;
  label: string; // accessibilityLabel, §9.6 — never a bare dot
}

export type MapFollowMode = "off" | "follow" | "free";

interface Props {
  stops: MapStop[];
  // Decoded, concatenated polyline geometry from the real routed journey
  // (Google Routes' per-leg encoded polyline, already decoded by the
  // caller via annotations.ts's decodePolyline — JourneyMap stays a dumb
  // renderer, same reasoning as conditionMarkers below). Falls back to a
  // straight line through `stops` when absent/empty (e.g. no live route
  // data), which is a real degradation, not the normal case.
  routePath?: MapStop[];
  accentColor: string;
  // How this journey is travelled, drawn as the glyph inside the origin
  // marker: the start of a route is where you are now, so it says what
  // you'll be on rather than repeating the generic "a place" teardrop that
  // every saved location already uses. Same glyph set as the Journey Mode
  // puck (modeIconPaths.ts), so the marker you set off from and the puck
  // that replaces it once you're moving are the same vehicle. Omitted →
  // the origin falls back to the platform pin.
  originMode?: ModeIconKind;
  onLongPress?: (coordinate: { lat: number; lng: number }) => void;
  previewCircle?: MapCircle | null;
  conditionMarkers?: ConditionMarker[];
  transitStops?: MapTransitStop[];
  // Saved EnvironmentAnnotations to display (§4.5) — distinct from the
  // single transient `previewCircle` shown while adding a new one.
  annotations?: MapAnnotation[];
  // §9.1 annotationPin token — the radius preview shown while adding an
  // EnvironmentAnnotation (§4.5) is themed distinctly from the route/mode
  // accent, since it isn't a mode color. Falls back to accentColor so
  // existing callers/tests that don't pass it keep working.
  previewColor?: string;
  // Phase 22 — the stretch already walked/ridden, drawn dimmed so the route
  // ahead is the one that reads. `routePath` stays the *whole* journey (it's
  // what the map frames against); these two only affect stroke color, and
  // omitting them renders exactly as before.
  traveledPath?: MapStop[];
  remainingPath?: MapStop[];
  userPuck?: MapUserPuck | null;
  followMode?: MapFollowMode;
  /** Fired when the user pans the map themselves, so the caller can drop out of follow. */
  onUserPan?: () => void;
}

// The route line reads as a single stroke rather than a hairline over busy
// basemap detail; the casing underneath it keeps it legible where it
// crosses same-colored roads or park fill.
const ROUTE_STROKE_WIDTH = 5;
const ROUTE_CASING_WIDTH = 8;
const FIT_EDGE_PADDING = { top: 56, right: 40, bottom: 56, left: 40 };

// Phase 22 — the route behind you stays visible (it's context for where you
// came from) but must not compete with the stretch ahead for attention.
const TRAVELED_STROKE_ALPHA = 0.3;

// How tight the follow camera sits. A driving or transit leg covers ground
// far faster than a walk, so it needs more of the road ahead in frame to be
// useful rather than just closer detail.
const FOLLOW_ZOOM_WALKING = 17;
const FOLLOW_ZOOM_VEHICLE = 16;
const FOLLOW_ANIMATE_MS = 600;
// Below this, the GPS halo is smaller than the puck itself and reads as
// visual noise rather than as uncertainty.
const ACCURACY_HALO_MIN_M = 25;
// See the settle effect below. Generous on purpose: the cost of waiting too
// long is a few extra frames of marker re-rasterization, and the cost of not
// waiting long enough is a marker with no glyph in it.
const MARKER_SETTLE_MS = 1500;

function followZoomFor(mode: ModeIconKind): number {
  return mode === "drive" || mode === "bus" || mode === "train" ? FOLLOW_ZOOM_VEHICLE : FOLLOW_ZOOM_WALKING;
}

export default function JourneyMap({
  stops,
  routePath,
  accentColor,
  originMode,
  onLongPress,
  previewCircle,
  conditionMarkers,
  transitStops,
  annotations,
  previewColor,
  traveledPath,
  remainingPath,
  userPuck,
  followMode = "off",
  onUserPan,
}: Props) {
  const theme = useTheme();
  const isDark = theme === darkTheme;
  const mapRef = useRef<MapView>(null);
  const hasFittedRef = useRef(false);
  const [settledSignature, setSettledSignature] = useState<string | null>(null);
  // Custom markers can only rasterize once the native map surface exists.
  // Settling the signature before then froze them mid-layout — which is how
  // the origin marker shipped as a solid accent disc with its travel-mode
  // glyph missing entirely.
  const [mapReady, setMapReady] = useState(false);

  const coordinates = useMemo(
    () => usableCoordinates(stops).map((s) => ({ latitude: s.lat, longitude: s.lng })),
    [stops]
  );

  // Custom-view markers (the origin/stop, condition and annotation badges
  // below) re-rasterize on every render while tracksViewChanges is on, which
  // is what made panning this map stutter. They're static once laid out, so
  // tracking is switched off shortly after they appear — and back on whenever
  // the set changes (a re-planned route, a newly saved local-knowledge spot),
  // since a marker that mounts with tracking already off is the classic
  // react-native-maps trap that freezes it as a blank circle on iOS.
  //
  // The Journey Mode puck contributes only its *mode*, never its position.
  // Its coordinate changes on every GPS fix, but moving a marker repositions
  // the bitmap that was already rasterized rather than redrawing it — only
  // the glyph inside changes when the current leg switches from walk to bus.
  // Feeding position in here would re-rasterize several times a minute and
  // reintroduce exactly the stutter this mechanism exists to prevent.
  const markerSignature = `${coordinates.length}:${conditionMarkers?.length ?? 0}:${(transitStops ?? []).map((s) => `${s.kind}${s.mode}`).join("")}:${annotations?.length ?? 0}:${userPuck?.mode ?? "none"}:${originMode ?? "pin"}`;
  const tracksViewChanges = settledSignature !== markerSignature;
  const lineCoordinates = useMemo(() => {
    const path = usableCoordinates(routePath);
    return path.length > 0 ? path.map((p) => ({ latitude: p.lat, longitude: p.lng })) : coordinates;
  }, [routePath, coordinates]);

  const traveledCoordinates = useMemo(
    () => usableCoordinates(traveledPath).map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [traveledPath]
  );
  // The accent stroke covers only what's left when a journey is in progress,
  // and the whole route otherwise.
  const accentCoordinates = useMemo(() => {
    const remaining = usableCoordinates(remainingPath);
    return remaining.length > 1 ? remaining.map((p) => ({ latitude: p.lat, longitude: p.lng })) : lineCoordinates;
  }, [remainingPath, lineCoordinates]);

  // What the map should frame: the drawn route plus anything sitting off it
  // (a saved annotation near, but not on, the path).
  const fitPoints = useMemo(
    () => [
      ...lineCoordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
      ...usableCoordinates(annotations),
    ],
    [lineCoordinates, annotations]
  );
  const fitKey = useMemo(() => boundsKey(fitPoints), [fitPoints]);
  // Only the very first frame comes from initialRegion — fitToCoordinates
  // takes over as soon as the map is ready. It still frames the whole route
  // rather than a fixed window around the first stop, so there's no visible
  // jump from "zoomed into the origin" to "the actual journey," and it's
  // the fallback if onMapReady never fires.
  const initialRegion = useMemo(() => regionForCoordinates(fitPoints), [fitPoints]);

  // Long enough for each marker's contents to have laid out and rasterized —
  // and these hold react-native-svg glyphs, which take a good deal longer to
  // appear than the emoji and stop numbers this delay was originally tuned
  // for. Under-waiting doesn't degrade the marker, it blanks it.
  useEffect(() => {
    if (!mapReady) return;
    const timer = setTimeout(() => setSettledSignature(markerSignature), MARKER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [markerSignature, mapReady]);

  // Re-frame whenever the framed extent actually changes — a forecast-drift
  // re-plan or a newly saved annotation replaces the geometry underneath an
  // already-mounted map, which initialRegion (mount-only) can't react to.
  // The first fit is instant: animating it would visibly slide the map on
  // every open, for no information the user asked for. Only a genuine change
  // to an already-framed route animates, where the movement is the point.
  //
  // Skipped entirely while following (Phase 22): re-framing the whole route
  // and centring on the puck are two cameras fighting for the same map, and
  // the fight would restart on every fix.
  useEffect(() => {
    if (followMode === "follow") return;
    if (fitPoints.length < 2) return;
    const animated = hasFittedRef.current;
    hasFittedRef.current = true;
    mapRef.current?.fitToCoordinates(
      fitPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: FIT_EDGE_PADDING, animated }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, followMode]);

  // Phase 22 — the follow camera. Deliberately north-up: heading-up needs
  // rotation enabled, which changes the gesture surface for every other use
  // of this map, in exchange for a bearing that's noisy at walking pace. The
  // puck's nose already carries direction.
  useEffect(() => {
    if (followMode !== "follow" || !userPuck) return;
    mapRef.current?.animateCamera(
      { center: { latitude: userPuck.lat, longitude: userPuck.lng }, zoom: followZoomFor(userPuck.mode) },
      { duration: FOLLOW_ANIMATE_MS }
    );
  }, [followMode, userPuck]);

  if (coordinates.length === 0 || !initialRegion) return <View style={[styles.container, { backgroundColor: theme.surface }]} />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.container}
        initialRegion={initialRegion}
        // Apple Maps honors this and ignores customMapStyle; Google Maps on
        // Android is the other way around — both are passed so the basemap
        // follows the app theme on either platform (see mapDarkStyle.ts).
        userInterfaceStyle={isDark ? "dark" : "light"}
        customMapStyle={isDark ? DARK_MAP_STYLE : []}
        // Android's Google Maps toolbar overlays "open in Maps"/"directions"
        // buttons on top of the route whenever a marker is selected — an
        // out-of-app escape hatch that isn't wanted on a screen whose whole
        // job is showing this journey.
        toolbarEnabled={false}
        // Tilt and rotation on a 280pt-tall embedded map are all downside:
        // easy to trigger by accident with two fingers, and a skewed or
        // north-off route is harder to read, with no on-screen control to
        // undo it.
        pitchEnabled={false}
        rotateEnabled={false}
        // Android otherwise recenters the map under the pressed marker,
        // shoving the rest of the route off-screen just to read one badge.
        moveOnMarkerPress={false}
        // The effect above may have run before the native map existed to
        // receive the call (mapRef still null) — this is the one that
        // actually lands on first open.
        // Fires for user gestures only — a programmatic animateCamera can't
        // trigger it, so the follow camera can't pan itself out of follow.
        onPanDrag={onUserPan}
        onMapReady={() => {
          setMapReady(true);
          if (followMode === "follow") return;
          if (fitPoints.length < 2) return;
          hasFittedRef.current = true;
          mapRef.current?.fitToCoordinates(
            fitPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
            { edgePadding: FIT_EDGE_PADDING, animated: false }
          );
        }}
        onLongPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          onLongPress?.({ lat: latitude, lng: longitude });
        }}
      >
        <Polyline
          coordinates={lineCoordinates}
          strokeColor={hexToRgba(isDark ? "#000000" : "#FFFFFF", 0.45)}
          strokeWidth={ROUTE_CASING_WIDTH}
          lineCap="round"
          lineJoin="round"
        />
        {/* Phase 22 — the stretch behind the user, drawn between the casing
            and the accent stroke so the alpha blends against the basemap
            rather than over a full-strength line. When no journey is in
            progress `traveledPath` is absent and the accent below covers the
            whole route exactly as before. */}
        {traveledCoordinates.length > 1 && (
          <Polyline
            coordinates={traveledCoordinates}
            strokeColor={hexToRgba(accentColor, TRAVELED_STROKE_ALPHA)}
            strokeWidth={ROUTE_STROKE_WIDTH}
            lineCap="round"
            lineJoin="round"
          />
        )}
        <Polyline
          coordinates={accentCoordinates}
          strokeColor={accentColor}
          strokeWidth={ROUTE_STROKE_WIDTH}
          lineCap="round"
          lineJoin="round"
        />
        {/* Start, intermediate stops and the destination used to be the same
            pinColor marker, so a multi-stop journey was a row of identical
            pins with no way to tell which end was which. Three distinct
            markers: the mode you're travelling by at the origin, an outlined
            numbered dot per stop, a flag at the destination — the two ends
            are the ones that must be unmistakable, and the origin doubles as
            "where you are now," so it carries the vehicle rather than a
            second generic place-pin. */}
        {coordinates.map((coordinate, i) => {
          const title = stopTitle(i, coordinates.length);
          // Also the single-coordinate case, where origin and destination are
          // the same point and "where does this end" isn't a question.
          if (i === 0) {
            if (!originMode) {
              return (
                <Marker
                  key={`stop-${i}`}
                  coordinate={coordinate}
                  pinColor={accentColor}
                  title={title}
                  accessibilityLabel={title}
                />
              );
            }
            return (
              <Marker
                key={`stop-${i}`}
                coordinate={coordinate}
                title={title}
                accessibilityLabel={title}
                tracksViewChanges={tracksViewChanges}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.originMarker, { backgroundColor: accentColor }]}>
                  <ModeIcon kind={originMode} size={16} color="#FFFFFF" />
                </View>
              </Marker>
            );
          }
          return (
            <Marker
              key={`stop-${i}`}
              coordinate={coordinate}
              title={title}
              accessibilityLabel={title}
              tracksViewChanges={tracksViewChanges}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              {i === coordinates.length - 1 ? (
                <View style={[styles.destinationMarker, { backgroundColor: accentColor }]}>
                  <ActionIcon kind="flag" size={14} color="#FFFFFF" filled />
                </View>
              ) : (
                <View style={[styles.stopMarker, { borderColor: accentColor }]}>
                  <Text style={[styles.stopMarkerLabel, { color: accentColor }]}>{i}</Text>
                </View>
              )}
            </Marker>
          );
        })}
        {(conditionMarkers ?? []).map((marker, i) => (
          <Marker
            key={`condition-${i}`}
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            title={marker.label}
            accessibilityLabel={marker.label}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.conditionMarker, { backgroundColor: marker.color }]}>
              <Text style={styles.conditionMarkerEmoji}>{marker.emoji}</Text>
            </View>
          </Marker>
        ))}
        {/* Drawn after the condition badges so a stop is never buried under a
            weather puck sitting on the same corner: where you get on the bus
            is the more actionable of the two. */}
        {(transitStops ?? []).map((stop, i) => (
          <Marker
            key={`transit-stop-${i}`}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.label}
            accessibilityLabel={stop.label}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={5}
          >
            {/* A rounded square, not a disc — every other marker on this map
                is round, so shape alone distinguishes a stop at a glance,
                and the square has room for the vehicle glyph a bare dot
                didn't. Boarding is filled (the one you have to be at on
                time); alighting is hollow. */}
            <View
              style={[
                styles.transitStopMarker,
                stop.kind === "board"
                  ? { backgroundColor: stop.color, borderColor: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", borderColor: stop.color },
              ]}
            >
              <ModeIcon kind={stop.mode} size={13} color={stop.kind === "board" ? "#FFFFFF" : stop.color} />
            </View>
          </Marker>
        ))}
        {/* react-native-maps only recognizes its own overlay components as
            direct MapView children — these used to be grouped per annotation
            inside a plain <View>, which quietly stopped every saved
            local-knowledge spot from rendering at all. Two flat passes, same
            shape as the web map. */}
        {(annotations ?? []).map((annotation, i) => (
          <Circle
            key={`annotation-circle-${i}`}
            center={{ latitude: annotation.lat, longitude: annotation.lng }}
            radius={annotation.radiusM}
            strokeColor={hexToRgba(annotation.color, 0.7)}
            fillColor={hexToRgba(annotation.color, 0.12)}
            strokeWidth={1.5}
          />
        ))}
        {(annotations ?? []).map((annotation, i) => (
          <Marker
            key={`annotation-${i}`}
            coordinate={{ latitude: annotation.lat, longitude: annotation.lng }}
            title={annotation.label}
            accessibilityLabel={annotation.label}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.annotationMarker, { backgroundColor: annotation.color }]}>
              <Text style={styles.annotationMarkerIcon}>{annotation.icon}</Text>
            </View>
          </Marker>
        ))}
        {previewCircle && (
          <Circle
            center={{ latitude: previewCircle.lat, longitude: previewCircle.lng }}
            radius={previewCircle.radiusM}
            strokeColor={previewColor ?? accentColor}
            fillColor={hexToRgba(previewColor ?? accentColor, 0.15)}
            strokeWidth={2}
          />
        )}
        {/* Phase 22 — the GPS accuracy halo, drawn only when the fix is
            genuinely vague. Flat pass rather than nested in the puck marker
            below, for the same Fabric reason as the annotation circles. */}
        {userPuck && (userPuck.accuracyM ?? 0) > ACCURACY_HALO_MIN_M && (
          <Circle
            center={{ latitude: userPuck.lat, longitude: userPuck.lng }}
            radius={userPuck.accuracyM!}
            strokeColor={hexToRgba(userPuck.color, 0.35)}
            fillColor={hexToRgba(userPuck.color, 0.1)}
            strokeWidth={1}
          />
        )}
        {userPuck && (
          <Marker
            coordinate={{ latitude: userPuck.lat, longitude: userPuck.lng }}
            title={userPuck.label}
            accessibilityLabel={userPuck.label}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
            // Keeps the puck lying on the map rather than standing up like a
            // pin, and stops it being sorted under the stop markers.
            flat
            zIndex={10}
          >
            <View style={styles.puckWrapper}>
              {/* Only the nose rotates. A rotated bus or pedestrian glyph
                  reads as a vehicle on its side; direction belongs on a
                  shape that has no upright of its own. */}
              {userPuck.bearingDeg !== undefined && (
                <View style={[styles.puckNoseOrbit, { transform: [{ rotate: `${userPuck.bearingDeg}deg` }] }]}>
                  <View style={[styles.puckNose, { borderBottomColor: userPuck.color }]} />
                </View>
              )}
              <View style={[styles.puck, { backgroundColor: userPuck.color }]}>
                <ModeIcon kind={userPuck.mode} size={18} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>
      {/* §4.5's long-press capture had no affordance anywhere on this
          screen — a gesture nobody is told about is a feature nobody finds.
          Hidden while the annotation sheet is open, since the hint has
          already been acted on by then. */}
      {onLongPress && !previewCircle && (
        <View style={[styles.hint, { backgroundColor: hexToRgba(theme.surface, 0.92), borderColor: theme.border }]} pointerEvents="none">
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>Hold on the map to mark a spot</Text>
        </View>
      )}
    </View>
  );
}

function stopTitle(index: number, total: number): string {
  if (index === 0) return "Start";
  if (index === total - 1) return "Destination";
  return `Stop ${index}`;
}

// Phase 22 puck geometry. The wrapper is deliberately larger than the disc
// so the rotating nose has room to swing without being clipped by the
// marker's bounds — a marker view is sized to its content, and an
// overflowing child is cut off on Android.
const PUCK_SIZE = 34;
const PUCK_NOSE_WIDTH = 9;
const PUCK_NOSE_HEIGHT = 7;
const PUCK_ORBIT = PUCK_SIZE + PUCK_NOSE_HEIGHT * 2 + 4;

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%" },
  puckWrapper: { width: PUCK_ORBIT, height: PUCK_ORBIT, alignItems: "center", justifyContent: "center" },
  puck: {
    width: PUCK_SIZE,
    height: PUCK_SIZE,
    borderRadius: PUCK_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  },
  // Rotating a full-size box around the puck's centre puts the nose on the
  // circle's edge at any bearing, without per-angle trigonometry.
  puckNoseOrbit: { position: "absolute", width: PUCK_ORBIT, height: PUCK_ORBIT, alignItems: "center" },
  puckNose: {
    width: 0,
    height: 0,
    borderLeftWidth: PUCK_NOSE_WIDTH / 2,
    borderRightWidth: PUCK_NOSE_WIDTH / 2,
    borderBottomWidth: PUCK_NOSE_HEIGHT,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  conditionMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  conditionMarkerEmoji: { fontSize: 12 },
  // Mirrors leafletIcons.ts's transitStopDivIcon — keep the two in step.
  transitStopMarker: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  // Mirrors leafletIcons.ts's flagDivIcon/stopDivIcon — keep the two in step,
  // they're the same marker on two platforms. The destination holds a white
  // flag glyph in a filled disc: see flagDivIcon's comment for how the route's
  // two ends ended up with these shapes.
  // A touch larger than the destination flag: it holds a vehicle glyph
  // rather than a single shape, and it's the marker the eye starts from.
  originMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  destinationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stopMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stopMarkerLabel: { fontSize: 11, fontWeight: "700" },
  annotationMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  annotationMarkerIcon: { fontSize: 13 },
  // Top-left, not bottom-left: Google's logo and the legally-required
  // attribution live in the bottom-left corner of the native map, and this
  // chip was sitting squarely on top of them.
  hint: {
    position: "absolute",
    left: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  hintText: { fontSize: 11, fontWeight: "600" },
});

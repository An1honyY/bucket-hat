import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import { boundsKey, hexToRgba, regionForCoordinates, usableCoordinates } from "../lib/mapGeometry";
import { DARK_MAP_STYLE } from "./mapDarkStyle";
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
  onLongPress?: (coordinate: { lat: number; lng: number }) => void;
  previewCircle?: MapCircle | null;
  conditionMarkers?: ConditionMarker[];
  // Saved EnvironmentAnnotations to display (§4.5) — distinct from the
  // single transient `previewCircle` shown while adding a new one.
  annotations?: MapAnnotation[];
  // §9.1 annotationPin token — the radius preview shown while adding an
  // EnvironmentAnnotation (§4.5) is themed distinctly from the route/mode
  // accent, since it isn't a mode color. Falls back to accentColor so
  // existing callers/tests that don't pass it keep working.
  previewColor?: string;
}

// The route line reads as a single stroke rather than a hairline over busy
// basemap detail; the casing underneath it keeps it legible where it
// crosses same-colored roads or park fill.
const ROUTE_STROKE_WIDTH = 5;
const ROUTE_CASING_WIDTH = 8;
const FIT_EDGE_PADDING = { top: 56, right: 40, bottom: 56, left: 40 };

export default function JourneyMap({ stops, routePath, accentColor, onLongPress, previewCircle, conditionMarkers, annotations, previewColor }: Props) {
  const theme = useTheme();
  const isDark = theme === darkTheme;
  const mapRef = useRef<MapView>(null);
  const hasFittedRef = useRef(false);
  const [settledSignature, setSettledSignature] = useState<string | null>(null);

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
  const markerSignature = `${coordinates.length}:${conditionMarkers?.length ?? 0}:${annotations?.length ?? 0}`;
  const tracksViewChanges = settledSignature !== markerSignature;
  const lineCoordinates = useMemo(() => {
    const path = usableCoordinates(routePath);
    return path.length > 0 ? path.map((p) => ({ latitude: p.lat, longitude: p.lng })) : coordinates;
  }, [routePath, coordinates]);

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

  // Long enough for each badge's contents (an emoji, a stop number) to have
  // laid out.
  useEffect(() => {
    const timer = setTimeout(() => setSettledSignature(markerSignature), 500);
    return () => clearTimeout(timer);
  }, [markerSignature]);

  // Re-frame whenever the framed extent actually changes — a forecast-drift
  // re-plan or a newly saved annotation replaces the geometry underneath an
  // already-mounted map, which initialRegion (mount-only) can't react to.
  // The first fit is instant: animating it would visibly slide the map on
  // every open, for no information the user asked for. Only a genuine change
  // to an already-framed route animates, where the movement is the point.
  useEffect(() => {
    if (fitPoints.length < 2) return;
    const animated = hasFittedRef.current;
    hasFittedRef.current = true;
    mapRef.current?.fitToCoordinates(
      fitPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: FIT_EDGE_PADDING, animated }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

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
        onMapReady={() => {
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
        <Polyline
          coordinates={lineCoordinates}
          strokeColor={accentColor}
          strokeWidth={ROUTE_STROKE_WIDTH}
          lineCap="round"
          lineJoin="round"
        />
        {/* Start, intermediate stops and the destination used to be the same
            pinColor marker, so a multi-stop journey was a row of identical
            pins with no way to tell which end was which. These reuse
            PlanScreen's route-rail vocabulary — filled dot / outlined
            numbered dot / pin — so the rail the journey was built on and the
            map it's read back from say the same thing. Only the destination
            keeps the platform pin, which is what a teardrop already means. */}
        {coordinates.map((coordinate, i) => {
          const title = stopTitle(i, coordinates.length);
          if (i === coordinates.length - 1) {
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
              {i === 0 ? (
                <View style={[styles.originMarker, { backgroundColor: accentColor }]} />
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

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%" },
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
  // Mirrors leafletIcons.ts's originDivIcon/stopDivIcon — keep the two in
  // step, they're the same marker on two platforms.
  originMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
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
  hint: {
    position: "absolute",
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  hintText: { fontSize: 11, fontWeight: "600" },
});

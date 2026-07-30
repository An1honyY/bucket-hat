import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import useLeafletCss from "./useLeafletCss";
import { pinDivIcon, flagDivIcon, stopDivIcon, conditionDivIcon, annotationDivIcon, userPuckDivIcon } from "./leafletIcons";
import { basemapFor } from "./leafletBasemap";
import { boundsKey, hexToRgba, usableCoordinates } from "../lib/mapGeometry";
import type { ConditionMarker, MapAnnotation, MapCircle, MapFollowMode, MapStop, MapUserPuck } from "./JourneyMap";
import useTheme from "../theme/useTheme";
import { darkTheme } from "../theme/tokens";

// Web implementation of the Journey Detail route map — same react-leaflet +
// OpenStreetMap approach LocationPickerMap.web.tsx already established for
// the identical "react-native-maps has no web target" gap (see that file's
// header comment and DECISIONS.md). This one renders a route polyline,
// per-stop pins, per-leg condition badges, and an optional annotation-radius
// preview circle instead of a single draggable pin.
interface Props {
  stops: MapStop[];
  // Decoded, concatenated polyline geometry from the real routed journey —
  // see JourneyMap.tsx's Props for the full rationale. Falls back to a
  // straight line through `stops` when absent/empty.
  routePath?: MapStop[];
  accentColor: string;
  // Native captures a new annotation on long-press. The browser equivalent
  // is `contextmenu` — right-click on a desktop, press-and-hold on a
  // touchscreen — rather than the plain left-click this used to listen for,
  // which meant every attempt to click the map at all (to dismiss, to focus
  // before scrolling) threw the add-a-spot sheet open uninvited.
  onLongPress?: (coordinate: { lat: number; lng: number }) => void;
  previewCircle?: MapCircle | null;
  conditionMarkers?: ConditionMarker[];
  annotations?: MapAnnotation[];
  previewColor?: string;
  // Phase 22 — see JourneyMap.tsx's Props for the full rationale. Omitting
  // all of these renders exactly as before.
  traveledPath?: MapStop[];
  remainingPath?: MapStop[];
  userPuck?: MapUserPuck | null;
  followMode?: MapFollowMode;
  onUserPan?: () => void;
}

const ROUTE_STROKE_WEIGHT = 5;
const ROUTE_CASING_WEIGHT = 9;
const FIT_PADDING: [number, number] = [28, 28];
// A journey with a single usable point has no extent to fit — street level is
// as much as can be said about it.
const SINGLE_STOP_ZOOM = 15;
// Phase 22 — mirrors the native map's constants; see JourneyMap.tsx.
const TRAVELED_STROKE_ALPHA = 0.3;
const FOLLOW_ZOOM_WALKING = 17;
const FOLLOW_ZOOM_VEHICLE = 16;
const ACCURACY_HALO_MIN_M = 25;

function followZoomFor(mode: MapUserPuck["mode"]): number {
  return mode === "drive" || mode === "bus" || mode === "train" ? FOLLOW_ZOOM_VEHICLE : FOLLOW_ZOOM_WALKING;
}

// Phase 22 — the follow camera, and the gesture that breaks out of it.
// Leaflet's `dragstart` fires only for real user drags, so a programmatic
// setView below can't knock the map out of follow by itself.
function FollowCamera({
  puck,
  followMode,
  onUserPan,
}: {
  puck?: MapUserPuck | null;
  followMode: MapFollowMode;
  onUserPan?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onUserPan) return;
    const handler = () => onUserPan();
    map.on("dragstart", handler);
    return () => {
      map.off("dragstart", handler);
    };
  }, [map, onUserPan]);

  useEffect(() => {
    if (followMode !== "follow" || !puck) return;
    map.setView([puck.lat, puck.lng], followZoomFor(puck.mode), { animate: true });
  }, [map, followMode, puck]);

  return null;
}

function ContextMenuToAnnotate({ onTrigger }: { onTrigger?: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    contextmenu(e: LeafletMouseEvent) {
      onTrigger?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Frames the whole route rather than a fixed zoom around the first stop —
// a journey can span much further than a single picked pin, so a static
// zoom (the picker's approach) would crop longer commutes badly. Keyed on
// the framed extent rather than the raw point list: a decoded route is
// routinely thousands of points, and re-serializing all of them on every
// render (the original dependency) is work done to detect a change that
// only the bounding box can express.
function FitBounds({ positions, followMode }: { positions: [number, number][]; followMode: MapFollowMode }) {
  const map = useMap();
  const key = useMemo(() => boundsKey(positions.map(([lat, lng]) => ({ lat, lng }))), [positions]);
  // MapContainer's center/zoom props only set the very first frame. Fitting
  // over the top of them with an animation means the map visibly lurches
  // from "zoomed in on the origin" to the actual route on every open — and
  // leaves the route mis-framed entirely until the animation finishes, which
  // in a backgrounded tab can be a long time. Only later re-fits (a re-plan,
  // a newly saved spot) are a change worth animating.
  const hasFittedRef = useRef(false);

  // Skipped while following (Phase 22): framing the whole route and
  // centring on the puck are two cameras fighting over one map.
  useEffect(() => {
    if (followMode === "follow") return;
    if (positions.length === 0) return;
    const animate = hasFittedRef.current;
    hasFittedRef.current = true;
    if (positions.length === 1) {
      map.setView(positions[0], SINGLE_STOP_ZOOM, { animate });
    } else {
      map.fitBounds(positions, { padding: FIT_PADDING, animate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, followMode]);

  // Leaflet measures its container once at mount and renders grey gutters if
  // that size later changes — which it does on any window resize, and on the
  // phone-width/desktop-width switch this app's web build goes through. The
  // route is re-framed to the new box at the same time, since a container
  // that just got much narrower frames it differently.
  //
  // Observing the container rather than listening for window `resize` is what
  // makes this work at all: the window event fires before react-native-web
  // has re-laid out the flex box underneath, so a fit driven by it measures
  // the *old* size and leaves the route running off the edge.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      // The container still has to be re-measured while following — only the
      // re-framing is suppressed, or the follow camera would be yanked back
      // to the whole route on every resize.
      if (followMode === "follow") return;
      if (positions.length > 1) map.fitBounds(positions, { padding: FIT_PADDING, animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, followMode]);

  return null;
}

export default function JourneyMap({
  stops,
  routePath,
  accentColor,
  onLongPress,
  previewCircle,
  conditionMarkers,
  annotations,
  previewColor,
  traveledPath,
  remainingPath,
  userPuck,
  followMode = "off",
  onUserPan,
}: Props) {
  // The native JourneyMap reads theme for its own basemap chrome too (dark
  // map styling) — same narrow use here: tile choice (CARTO's light/dark
  // sets) and the hint chip, not general theme dependency creep.
  const theme = useTheme();
  const basemap = basemapFor(theme === darkTheme);
  useLeafletCss();

  const positions: [number, number][] = useMemo(
    () => usableCoordinates(stops).map((s) => [s.lat, s.lng] as [number, number]),
    [stops]
  );
  const linePositions: [number, number][] = useMemo(() => {
    const path = usableCoordinates(routePath);
    return path.length > 0 ? path.map((p) => [p.lat, p.lng] as [number, number]) : positions;
  }, [routePath, positions]);
  const traveledPositions: [number, number][] = useMemo(
    () => usableCoordinates(traveledPath).map((p) => [p.lat, p.lng] as [number, number]),
    [traveledPath]
  );
  // The accent stroke covers only what's left when a journey is in progress,
  // and the whole route otherwise.
  const accentPositions: [number, number][] = useMemo(() => {
    const remaining = usableCoordinates(remainingPath);
    return remaining.length > 1 ? remaining.map((p) => [p.lat, p.lng] as [number, number]) : linePositions;
  }, [remainingPath, linePositions]);
  // Frame the route plus any saved spot sitting off it, matching native.
  const fitPositions: [number, number][] = useMemo(
    () => [...linePositions, ...usableCoordinates(annotations).map((a) => [a.lat, a.lng] as [number, number])],
    [linePositions, annotations]
  );

  if (positions.length === 0) return <View style={[styles.container, { backgroundColor: theme.surface }]} />;

  return (
    <View style={styles.container}>
      <MapContainer
        center={positions[0]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className={basemap.isDark ? "cwp-dark-basemap" : undefined}
        // This map sits inside Journey Detail's vertical scroll view.
        // Wheel-zoom on by default means scrolling the page over the map
        // zooms the map instead — the single most disorienting thing this
        // screen did. Zoom is still available via the buttons, double-click,
        // and pinch; only the hijack is gone.
        scrollWheelZoom={false}
      >
        <TileLayer url={basemap.url} attribution={basemap.attribution} detectRetina />
        <FitBounds positions={fitPositions} followMode={followMode} />
        <FollowCamera puck={userPuck} followMode={followMode} onUserPan={onUserPan} />
        {/* Casing under the route stroke, so the line stays legible where it
            crosses similarly-colored roads or park fill (mirrors native). */}
        <Polyline
          positions={linePositions}
          pathOptions={{
            color: basemap.isDark ? "#000000" : "#FFFFFF",
            opacity: 0.45,
            weight: ROUTE_CASING_WEIGHT,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
        {/* Phase 22 — the stretch behind the user, between the casing and
            the accent stroke so its alpha blends against the basemap rather
            than over a full-strength line. */}
        {traveledPositions.length > 1 && (
          <Polyline
            positions={traveledPositions}
            pathOptions={{
              color: hexToRgba(accentColor, TRAVELED_STROKE_ALPHA),
              weight: ROUTE_STROKE_WEIGHT,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
        <Polyline
          positions={accentPositions}
          pathOptions={{ color: accentColor, weight: ROUTE_STROKE_WEIGHT, lineCap: "round", lineJoin: "round" }}
        />
        {positions.map((position, i) => {
          const title = stopTitle(i, positions.length);
          return (
            <Marker
              key={`stop-${i}`}
              position={position}
              icon={
                i === 0
                  ? pinDivIcon(accentColor)
                  : i === positions.length - 1
                    ? flagDivIcon(accentColor)
                    : stopDivIcon(accentColor, String(i))
              }
              title={title}
              alt={title}
            />
          );
        })}
        {(conditionMarkers ?? []).map((marker, i) => (
          <Marker
            key={`condition-${i}`}
            position={[marker.lat, marker.lng]}
            icon={conditionDivIcon(marker.color, marker.emoji)}
            // `title` gives the badge a real hover tooltip — without it a
            // colored dot with an emoji in it was the only thing telling
            // the user which leg it belonged to. `alt` keeps §9.6's
            // never-color-alone screen-reader text.
            title={marker.label}
            alt={marker.label}
          />
        ))}
        {(annotations ?? []).map((annotation, i) => (
          <Circle
            key={`annotation-circle-${i}`}
            center={[annotation.lat, annotation.lng]}
            radius={annotation.radiusM}
            pathOptions={{ color: annotation.color, fillColor: annotation.color, fillOpacity: 0.12, weight: 1.5 }}
          />
        ))}
        {(annotations ?? []).map((annotation, i) => (
          <Marker
            key={`annotation-${i}`}
            position={[annotation.lat, annotation.lng]}
            icon={annotationDivIcon(annotation.color, annotation.icon)}
            title={annotation.label}
            alt={annotation.label}
          />
        ))}
        {previewCircle && (
          <Circle
            center={[previewCircle.lat, previewCircle.lng]}
            radius={previewCircle.radiusM}
            pathOptions={{ color: previewColor ?? accentColor, fillColor: previewColor ?? accentColor, fillOpacity: 0.15, weight: 2 }}
          />
        )}
        {/* Phase 22 — the GPS accuracy halo, only when the fix is genuinely
            vague, then the puck itself on top of every other marker. */}
        {userPuck && (userPuck.accuracyM ?? 0) > ACCURACY_HALO_MIN_M && (
          <Circle
            center={[userPuck.lat, userPuck.lng]}
            radius={userPuck.accuracyM!}
            pathOptions={{ color: userPuck.color, fillColor: userPuck.color, fillOpacity: 0.1, weight: 1, opacity: 0.35 }}
          />
        )}
        {userPuck && (
          <Marker
            position={[userPuck.lat, userPuck.lng]}
            icon={userPuckDivIcon(userPuck.color, userPuck.mode, userPuck.bearingDeg)}
            title={userPuck.label}
            alt={userPuck.label}
            zIndexOffset={1000}
          />
        )}
        <ContextMenuToAnnotate onTrigger={onLongPress} />
      </MapContainer>
      {/* Right-click is not a gesture anyone guesses at — with the plain
          left-click trigger gone, §4.5's capture flow needs to say so.
          Mirrors the native map's equivalent hint chip. */}
      {onLongPress && !previewCircle && (
        <View style={[styles.hint, { backgroundColor: hexToRgba(theme.surface, 0.92), borderColor: theme.border }]} pointerEvents="none">
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>Right-click the map to mark a spot</Text>
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
  hint: {
    position: "absolute",
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    // Above Leaflet's own panes/controls, which sit at z-index 400–1000.
    zIndex: 1200,
  },
  hintText: { fontSize: 11, fontWeight: "600" },
});

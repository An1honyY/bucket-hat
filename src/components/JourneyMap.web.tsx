import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import useLeafletCss from "./useLeafletCss";
import { pinDivIcon, flagDivIcon, stopDivIcon, conditionDivIcon, annotationDivIcon } from "./leafletIcons";
import { basemapFor } from "./leafletBasemap";
import { boundsKey, hexToRgba, usableCoordinates } from "../lib/mapGeometry";
import type { ConditionMarker, MapAnnotation, MapCircle, MapStop } from "./JourneyMap";
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
}

const ROUTE_STROKE_WEIGHT = 5;
const ROUTE_CASING_WEIGHT = 9;
const FIT_PADDING: [number, number] = [28, 28];
// A journey with a single usable point has no extent to fit — street level is
// as much as can be said about it.
const SINGLE_STOP_ZOOM = 15;

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
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const key = useMemo(() => boundsKey(positions.map(([lat, lng]) => ({ lat, lng }))), [positions]);
  // MapContainer's center/zoom props only set the very first frame. Fitting
  // over the top of them with an animation means the map visibly lurches
  // from "zoomed in on the origin" to the actual route on every open — and
  // leaves the route mis-framed entirely until the animation finishes, which
  // in a backgrounded tab can be a long time. Only later re-fits (a re-plan,
  // a newly saved spot) are a change worth animating.
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (positions.length === 0) return;
    const animate = hasFittedRef.current;
    hasFittedRef.current = true;
    if (positions.length === 1) {
      map.setView(positions[0], SINGLE_STOP_ZOOM, { animate });
    } else {
      map.fitBounds(positions, { padding: FIT_PADDING, animate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
      if (positions.length > 1) map.fitBounds(positions, { padding: FIT_PADDING, animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

export default function JourneyMap({ stops, routePath, accentColor, onLongPress, previewCircle, conditionMarkers, annotations, previewColor }: Props) {
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
        <FitBounds positions={fitPositions} />
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
        <Polyline
          positions={linePositions}
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

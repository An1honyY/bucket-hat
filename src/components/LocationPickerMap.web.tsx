import { useEffect, useRef } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type L from "leaflet";
import type { LeafletMouseEvent } from "leaflet";
import useLeafletCss from "./useLeafletCss";
import { pinDivIcon } from "./leafletIcons";
import { basemapFor } from "./leafletBasemap";
import ActionIcon from "./ActionIcon";
import { pickerStatusText, useLocationPicker, type PickerCoords } from "./useLocationPicker";
import useTheme from "../theme/useTheme";
import { darkTheme } from "../theme/tokens";

// Web implementation of the map-based location picker — react-leaflet +
// OpenStreetMap tiles, both free/keyless (matching this project's existing
// preference for free/keyless APIs where one exists, e.g. Open-Meteo over
// a paid weather API — docs/02-external-apis.md §2), rather than adding a
// second Google Maps Platform product (Maps JavaScript API) alongside
// Places/Routes/Geocoding just for this one screen. `react-native-maps`
// itself has no web target at all (see LocationPickerMap.tsx's header
// comment and JourneyMap.web.tsx's precedent for the same gap on a
// different screen) — this isn't a fallback/placeholder, it's a real,
// independently-implemented map for web specifically. No marker-image
// assets are loaded — the pin is an inline SVG L.divIcon, so LEAFLET_CSS
// (vendored, see that file's header) is the only extra asset this needs.
//
// Seeding, the debounced reverse-geocode label and the locate button are
// shared with the native file via useLocationPicker.ts — see its header.
interface Props {
  visible: boolean;
  initialCoords?: { lat: number; lng: number };
  onConfirm: (coords: { lat: number; lng: number }, resolvedLabel?: string) => void;
  onClose: () => void;
}

const SEEDED_ZOOM = 12;
const FALLBACK_ZOOM = 13;
const LOCATE_ZOOM = 16;
// Long enough for the browser's second click of a double-click to arrive.
const DOUBLE_CLICK_GRACE_MS = 250;

// A plain click moves the pin (the mouse substitute for native's tap), but
// Leaflet fires `click` for *each* click of a double-click — so
// double-clicking to zoom in, the most ordinary map gesture there is, also
// dragged the pin to wherever the user happened to be zooming. Holding each
// click briefly and dropping it if a `dblclick` follows keeps both gestures.
function ClickToMove({ onMove }: { onMove: (coords: PickerCoords) => void }) {
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
  }, []);

  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (pendingRef.current) clearTimeout(pendingRef.current);
      const { lat, lng } = e.latlng;
      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        onMove({ lat, lng });
      }, DOUBLE_CLICK_GRACE_MS);
    },
    dblclick() {
      if (pendingRef.current) clearTimeout(pendingRef.current);
      pendingRef.current = null;
    },
  });
  return null;
}

// Follows the pin only when it moved for a reason other than the user
// pointing at a spot — see LocationPickerState.recenterToken.
function RecenterOnToken({ token, coords }: { token: number; coords: PickerCoords | null }) {
  const map = useMap();

  useEffect(() => {
    if (token === 0 || !coords) return;
    map.flyTo([coords.lat, coords.lng], LOCATE_ZOOM, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Leaflet measures its container once at mount and leaves grey gutters if
  // that size later changes — which it does whenever the browser window is
  // resized while this full-screen sheet is open. Observing the container
  // rather than the window means this runs after react-native-web has
  // re-laid the flex box out, not before (see JourneyMap.web.tsx).
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function LocationPickerMap({ visible, initialCoords, onConfirm, onClose }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const picker = useLocationPicker(visible, initialCoords);
  const { seed, marker, setMarker } = picker;
  const markerRef = useRef<L.Marker>(null);
  useLeafletCss();

  // Not rendered at all while closed (rather than hidden-but-mounted) so
  // MapContainer always initializes against a container that already has
  // its final on-screen size — Leaflet mis-sizes itself if it mounts while
  // its container is display:none/zero-size, which a hidden-but-mounted
  // Modal would otherwise risk.
  if (!visible) return null;

  const zoom = seed?.isFallback === false ? SEEDED_ZOOM : FALLBACK_ZOOM;
  const basemap = basemapFor(theme === darkTheme);
  const statusText = pickerStatusText(picker);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.headerButton}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Drop a pin</Text>
          <Pressable
            onPress={() => marker && onConfirm(marker, picker.resolvedLabel)}
            hitSlop={8}
            disabled={!marker}
            accessibilityRole="button"
            accessibilityLabel="Use this location"
            accessibilityState={{ disabled: !marker }}
          >
            <Text style={[styles.headerButton, styles.headerButtonPrimary, !marker && styles.headerButtonDisabled]}>Use this</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>Click or drag the pin to the exact spot.</Text>
        {/* One fixed-height line, always present — a spinner/label/nothing
            rotation made the whole map jump on every pin move. */}
        <Text style={styles.status} numberOfLines={1}>
          {statusText}
        </Text>
        {picker.locateError && <Text style={styles.locateError}>{picker.locateError}</Text>}

        {!seed || !marker ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accentWalk} />
          </View>
        ) : (
          <View style={styles.mapWrap}>
            <MapContainer
              center={[seed.lat, seed.lng]}
              zoom={zoom}
              style={{ height: "100%", width: "100%" }}
              className={basemap.isDark ? "cwp-dark-basemap" : undefined}
            >
              <TileLayer url={basemap.url} attribution={basemap.attribution} detectRetina />
              <Marker
                position={[marker.lat, marker.lng]}
                icon={pinDivIcon(theme.accentWalk)}
                draggable
                ref={markerRef}
                title="Selected spot — drag to move"
                alt="Selected spot"
                eventHandlers={{
                  dragend: () => {
                    const position = markerRef.current?.getLatLng();
                    if (position) setMarker({ lat: position.lat, lng: position.lng });
                  },
                }}
              />
              <ClickToMove onMove={setMarker} />
              <RecenterOnToken token={picker.recenterToken} coords={marker} />
            </MapContainer>

            <Pressable
              onPress={picker.useCurrentLocation}
              disabled={picker.locating}
              style={styles.locateButton}
              accessibilityRole="button"
              accessibilityLabel="Move the pin to my current location"
            >
              {picker.locating ? (
                <ActivityIndicator size="small" color={theme.accentWalk} />
              ) : (
                <ActionIcon kind="crosshair" size={20} color={theme.accentWalk} />
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    headerButton: { fontSize: 15, color: theme.textSecondary, minHeight: 44, textAlignVertical: "center" },
    headerButtonPrimary: { color: theme.accentWalk, fontWeight: "600" },
    headerButtonDisabled: { opacity: 0.4 },
    hint: { fontSize: 12, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 20 },
    status: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textPrimary,
      textAlign: "center",
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
      minHeight: 30,
    },
    locateError: { fontSize: 12, color: theme.confidenceLow, textAlign: "center", paddingHorizontal: 20, paddingBottom: 8 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    mapWrap: { flex: 1 },
    locateButton: {
      position: "absolute",
      right: 16,
      bottom: 28,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      // Above Leaflet's own panes and controls, which sit at 400–1000.
      zIndex: 1200,
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
    },
  });
}

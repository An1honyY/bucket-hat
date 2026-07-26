import { useEffect, useRef } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import ActionIcon from "./ActionIcon";
import { DARK_MAP_STYLE } from "./mapDarkStyle";
import { pickerStatusText, useLocationPicker } from "./useLocationPicker";
import useTheme from "../theme/useTheme";
import { darkTheme } from "../theme/tokens";

// Map-based location picker — docs/04-screens-navigation.md §4 "Locations"
// bullet's "add via map pin drop," closing the deferral logged in
// DECISIONS.md ("Locations CRUD uses text/number fields, not map pin-drop
// or Places search"). Native (iOS/Android) implementation; see
// LocationPickerMap.web.tsx for the same web-target gap JourneyMap.tsx
// already established a pattern for. A friendlier alternative to typing
// raw coordinates for anyone who doesn't have (or trust) a street address
// for the spot they mean — tap or drag the pin, confirm, done.
//
// All the non-map behavior (seeding the pin from GPS → saved default →
// Auckland, the debounced reverse-geocode label, the locate button) lives in
// useLocationPicker.ts, shared verbatim with the web file — see its header.
interface Props {
  visible: boolean;
  initialCoords?: { lat: number; lng: number };
  onConfirm: (coords: { lat: number; lng: number }, resolvedLabel?: string) => void;
  onClose: () => void;
}

// A resolved GPS/saved-location start gets a bit more breathing room than
// the tight fallback zoom — enough to drag the pin to a nearby spot without
// immediately panning off-screen. The Auckland fallback stays tight since
// it's just a generic city center to start from, not "your area."
const SEEDED_DELTA = 0.08;
const FALLBACK_DELTA = 0.05;
// Where the locate button drops you: close enough to pick out a specific
// doorway, which is the whole point of jumping to your own position.
const LOCATE_DELTA = 0.006;

export default function LocationPickerMap({ visible, initialCoords, onConfirm, onClose }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const isDark = theme === darkTheme;
  const picker = useLocationPicker(visible, initialCoords);
  const { seed, marker, setMarker } = picker;
  const mapRef = useRef<MapView>(null);

  // Follow the pin only when it moved for a reason other than the user
  // pointing at a spot — see LocationPickerState.recenterToken.
  useEffect(() => {
    if (picker.recenterToken === 0 || !marker) return;
    mapRef.current?.animateToRegion(
      { latitude: marker.lat, longitude: marker.lng, latitudeDelta: LOCATE_DELTA, longitudeDelta: LOCATE_DELTA },
      450
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker.recenterToken]);

  const delta = seed?.isFallback === false ? SEEDED_DELTA : FALLBACK_DELTA;
  const statusText = pickerStatusText(picker);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Full-screen modal, so it owns its own safe area — the header row
          used to sit under the status bar / notch on its own 16pt padding. */}
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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

        <Text style={styles.hint}>Tap or drag the pin to the exact spot.</Text>
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
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{ latitude: seed.lat, longitude: seed.lng, latitudeDelta: delta, longitudeDelta: delta }}
              // Apple Maps honors the first, Google Maps on Android the
              // second — a white map inside the dark theme was the picker's
              // most jarring detail (see mapDarkStyle.ts).
              userInterfaceStyle={isDark ? "dark" : "light"}
              customMapStyle={isDark ? DARK_MAP_STYLE : []}
              toolbarEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setMarker({ lat: latitude, lng: longitude });
              }}
            >
              <Marker
                coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                draggable
                onDragEnd={(event) => {
                  const { latitude, longitude } = event.nativeEvent.coordinate;
                  setMarker({ lat: latitude, lng: longitude });
                }}
                pinColor={theme.accentWalk}
                title="Selected spot"
                accessibilityLabel="Selected spot — drag to move"
              />
            </MapView>

            <Pressable
              onPress={picker.useCurrentLocation}
              disabled={picker.locating}
              style={styles.locateButton}
              hitSlop={6}
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
      </SafeAreaView>
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
    map: { flex: 1 },
    locateButton: {
      position: "absolute",
      right: 16,
      bottom: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      // Legible over whatever basemap detail happens to be underneath.
      shadowColor: "#000000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
  });
}

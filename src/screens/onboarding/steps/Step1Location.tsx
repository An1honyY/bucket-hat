import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import ActionIcon, { type ActionIconKind } from "../../../components/ActionIcon";
import AddressAutocomplete from "../../../components/AddressAutocomplete";
import LocationPickerMap from "../../../components/LocationPickerMap";
import ScreenPattern from "../../../components/ScreenPattern";
import { reverseGeocode } from "../../../services/placesService";
import { getPositionWithinTimeout } from "../../../lib/approximateLocation";
import useTheme from "../../../theme/useTheme";
import { cardElevationStyle } from "../../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../../theme/typography";

// docs/04-screens-navigation.md §4.1 (2026-07-21 minimal-onboarding
// rework) — onboarding's only forced step. Everything the old 6-step
// wizard asked for beyond a general location (Home/Work, gear basics,
// notification permission, crash reporting) moved to the postponable
// setup checklist on Today (SetupChecklist.tsx) — see DECISIONS.md.
// Keeps the "explain why before the OS permission dialog" principle the
// old Step1LocationPermission established, just as one path among four
// (GPS / typed address / map pin / skip) rather than a forced first
// screen of its own.
//
// Restyled 2026-08-02 alongside the new welcome screen: §4.1's four paths
// are unchanged in behaviour, but they were three near-identical text
// buttons stacked under a paragraph, which gave the one screen onboarding
// forces on people no visual hierarchy at all. They're now rows with an
// icon and a line saying what each actually does, and a denied permission
// says so instead of appearing to do nothing.
interface Props {
  onDone: (location: { lat: number; lng: number; label: string } | undefined) => void;
  /** Back to the welcome screen. Omitted when there's nothing behind this. */
  onBack?: () => void;
}

export default function Step1Location({ onDone, onBack }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [requesting, setRequesting] = useState(false);
  const [typingAddress, setTypingAddress] = useState(false);
  const [addressText, setAddressText] = useState("");
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);
  const [locationNote, setLocationNote] = useState<string | undefined>(undefined);

  async function useCurrentLocation() {
    setRequesting(true);
    setLocationNote(undefined);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // Previously a bare `return`, which left the screen looking like
        // the button had done nothing at all — the deny happens in an OS
        // dialog the app never sees the outcome of otherwise.
        setLocationNote("Location's off. Type a suburb instead, or turn it on in Settings.");
        return;
      }
      // Bounded, so onboarding can't stall indefinitely on a device that
      // never gets a fix. A (0,0) result is filtered out too — it's never a
      // real location (see approximateLocation.ts) and is treated the same
      // as the request having failed, rather than saved as this user's spot.
      const position = await getPositionWithinTimeout();
      if (!position) {
        setLocationNote("Couldn't find you just now. Try again, or type a suburb.");
        return;
      }
      const { lat, lng } = position;
      // A bare "Current location" tells the user nothing about where that
      // actually is — reverse-geocode to a real place name, falling back to
      // the generic label only if that lookup itself fails.
      const result = await reverseGeocode(lat, lng);
      onDone({ lat, lng, label: "data" in result ? result.data.formattedAddress : "Current location" });
    } catch {
      setLocationNote("Couldn't find you just now. Try again, or type a suburb.");
    } finally {
      setRequesting(false);
    }
  }

  async function handleMapConfirm(coords: { lat: number; lng: number }, resolvedLabel?: string) {
    setMapPickerOpen(false);
    // The picker already reverse-geocoded this pin live while dragging —
    // reuse it instead of paying for the same Google Geocoding call twice.
    if (resolvedLabel) {
      onDone({ lat: coords.lat, lng: coords.lng, label: resolvedLabel });
      return;
    }
    setResolvingPin(true);
    const result = await reverseGeocode(coords.lat, coords.lng);
    setResolvingPin(false);
    onDone({ lat: coords.lat, lng: coords.lng, label: "data" in result ? result.data.formattedAddress : "Pinned location" });
  }

  return (
    <View style={styles.screen}>
      <ScreenPattern />
      {/* Outside the ScrollView: the content below is vertically centred,
          and a back control that drifts with it reads as part of the form
          rather than as the way out. */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {onBack ? (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          ) : null}
        </View>
        <View accessibilityLabel="Step 2 of 2" style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Where are you?</Text>
        {/* §4.1's "explain why before the OS permission dialog", in one
            line. The old version also promised that places and gear come
            later; the welcome screen has already said as much, and this is
            the screen where every extra clause is one more thing between
            someone and a working app. */}
        <Text style={styles.body}>So we can show today&apos;s weather and what to wear.</Text>

        {resolvingPin ? (
          <ActivityIndicator style={styles.resolvingSpinner} color={theme.accentWalk} />
        ) : typingAddress ? (
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Suburb or address</Text>
            <AddressAutocomplete
              value={addressText}
              onChangeText={setAddressText}
              onSelectPlace={(result) => onDone({ lat: result.lat, lng: result.lng, label: result.address })}
              placeholder="Suburb or address"
            />
            <Pressable accessibilityRole="button" onPress={() => setTypingAddress(false)} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Other ways</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.options}>
            <OptionRow
              icon="crosshair"
              title="Use my location"
              body="Your device will ask first."
              onPress={useCurrentLocation}
              busy={requesting}
              primary
            />
            <OptionRow
              icon="search"
              title="Type a suburb"
              body="No permission needed."
              onPress={() => setTypingAddress(true)}
            />
            <OptionRow
              icon="pin"
              title="Pick it on a map"
              body="Roughly is fine."
              onPress={() => setMapPickerOpen(true)}
            />
          </View>
        )}

        {locationNote ? (
          <Text accessibilityLiveRegion="polite" style={styles.note}>
            {locationNote}
          </Text>
        ) : null}

        <LocationPickerMap visible={mapPickerOpen} onConfirm={handleMapConfirm} onClose={() => setMapPickerOpen(false)} />

        <View style={styles.skipBlock}>
          <Pressable accessibilityRole="button" onPress={() => onDone(undefined)} style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Skip for now</Text>
          </Pressable>
          {/* True as written: with no default_location stored,
              approximateLocation.ts falls through device GPS to the
              Auckland centre-point. Not "set it later in Settings" —
              there's no Settings control for this. */}
          <Text style={styles.skipNote}>We&apos;ll use your device&apos;s location, or central Auckland.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

interface OptionProps {
  icon: ActionIconKind;
  title: string;
  body: string;
  onPress: () => void;
  busy?: boolean;
  primary?: boolean;
}

function OptionRow({ icon, title, body, onPress, busy = false, primary = false }: OptionProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityState={{ busy, disabled: busy }}
      onPress={onPress}
      disabled={busy}
      style={[styles.option, primary && styles.optionPrimary, busy && styles.optionBusy]}
    >
      <View style={[styles.optionIcon, primary && styles.optionIconPrimary]}>
        {busy ? (
          <ActivityIndicator color={primary ? "#FFFFFF" : theme.accentWalk} />
        ) : (
          <ActionIcon kind={icon} size={20} color={primary ? "#FFFFFF" : theme.accentWalk} />
        )}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, primary && styles.optionTitlePrimary]}>{title}</Text>
        <Text style={[styles.optionBody, primary && styles.optionBodyPrimary]}>{body}</Text>
      </View>
    </Pressable>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl, justifyContent: "center", gap: SPACING.sm },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.sm,
    },
    // Equal-weight sides so the progress dots land on the screen's centre
    // line rather than "Back"'s.
    headerSide: { flex: 1 },
    backButton: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
    backLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    progress: { flexDirection: "row", gap: 6, alignItems: "center" },
    dot: { width: 7, height: 7, borderRadius: RADIUS.circle, backgroundColor: theme.border },
    dotDone: { backgroundColor: theme.textSecondary },
    dotActive: { backgroundColor: theme.accentWalk, width: 20 },
    title: { ...TYPE.title, fontSize: 26, color: theme.textPrimary },
    body: { ...TYPE.body, color: theme.textSecondary, lineHeight: 22, marginBottom: SPACING.md },
    options: { gap: SPACING.sm },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      ...cardElevationStyle(theme),
    },
    optionPrimary: { backgroundColor: theme.accentWalk },
    optionBusy: { opacity: 0.7 },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.circle,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.surfaceRaisedBorder,
    },
    // Inside the filled row a raised-surface circle reads as a smudge —
    // a translucent white knock-out keeps the same shape against the accent.
    optionIconPrimary: { backgroundColor: "rgba(255,255,255,0.18)", borderColor: "transparent" },
    optionText: { flex: 1, gap: 2 },
    optionTitle: { ...TYPE.subtitle, fontSize: 15, color: theme.textPrimary },
    optionTitlePrimary: { color: "#FFFFFF" },
    optionBody: { ...TYPE.caption, color: theme.textSecondary },
    optionBodyPrimary: { color: "rgba(255,255,255,0.85)" },
    addressBlock: { gap: SPACING.sm },
    addressLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
    resolvingSpinner: { marginTop: SPACING.xxl },
    note: { ...TYPE.caption, color: theme.danger, marginTop: SPACING.md, lineHeight: 19 },
    skipBlock: { marginTop: SPACING.xl, alignItems: "center", gap: 2 },
    textButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: SPACING.sm },
    textButtonLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    skipNote: { ...TYPE.micro, fontSize: 12, color: theme.textSecondary },
  });
}

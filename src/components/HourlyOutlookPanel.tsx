import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LocationOutlook } from "../lib/useLocationOutlooks";
import { useTimeFormatStore } from "../lib/useTimeFormatStore";
import useTheme from "../theme/useTheme";
import { RADIUS, SPACING } from "../theme/typography";
import ActionIcon from "./ActionIcon";
import RainGauge from "./RainGauge";
import WeatherKey from "./WeatherKey";
import { collectKeyEntries, formatHourLabel, iconKindFor } from "../lib/outlookDisplay";
import { WEATHER_ICON_LABEL } from "./WeatherIcon";

// The "Full outlook" panel — every location on the trip, each with its
// complete hourly strip, sliding in from the right.
//
// Right rather than the bottom sheet used elsewhere (SavedLocationPicker,
// UnavailabilitySheet): those are pickers that interrupt to take an answer,
// this is reference material you read alongside the plan you're building. A
// tall side panel also fits several stacked horizontal strips far better than
// a bottom sheet capped at 70% height.
//
// One key at the bottom covering all locations, not one per strip — the
// glyphs mean the same thing in every strip, and repeating the legend three
// times would be most of the panel's height.
//
// No `visible` prop by design: the caller mounts this only while it should be
// open, matching UnavailabilitySheet's convention, so each open is a fresh
// mount with no state to sync.
const ROLE_LABEL: Record<LocationOutlook["role"], string> = {
  origin: "Start",
  stop: "Stop",
  destination: "Destination",
};

interface Props {
  outlooks: LocationOutlook[];
  onClose: () => void;
}

export default function HourlyOutlookPanel({ outlooks, onClose }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");

  const { rainBuckets, skyKinds } = collectKeyEntries(outlooks.flatMap((o) => o.readings));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropRow}>
        {/* Tapping the dimmed area to the left closes, same as the bottom
            sheets' backdrop. Kept as a sibling of the panel rather than its
            parent so a tap inside the panel needs no stopPropagation. */}
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the full outlook" />
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.heading}>Full outlook</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel="Close the full outlook">
              <ActionIcon kind="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {outlooks.map((outlook) => (
              <View key={`${outlook.location.lat},${outlook.location.lng},${outlook.role}`} style={styles.block}>
                <Text style={styles.roleLabel}>{ROLE_LABEL[outlook.role]}</Text>
                <Text style={styles.locationName} numberOfLines={1}>
                  {outlook.location.label}
                </Text>
                <Text style={styles.fromNote}>from {formatHourLabel(outlook.atIso, hour12)}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripContent}>
                  {outlook.readings.map((reading) => (
                    <RainGauge
                      key={reading.time}
                      hour={formatHourLabel(reading.time, hour12)}
                      rainIntensity={reading.rainIntensity}
                      tempC={reading.tempC}
                      precipMm={reading.precipMm}
                      conditionKind={iconKindFor(reading)}
                      conditionLabel={WEATHER_ICON_LABEL[iconKindFor(reading)]}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}

            <WeatherKey rainBuckets={rainBuckets} skyKinds={skyKinds} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdropRow: { flex: 1, flexDirection: "row" },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    panel: {
      width: "86%",
      maxWidth: 420,
      backgroundColor: theme.surfaceRaised,
      borderTopLeftRadius: RADIUS.card,
      borderBottomLeftRadius: RADIUS.card,
      paddingTop: SPACING.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.sm,
    },
    heading: { fontSize: 17, fontWeight: "600", color: theme.textPrimary },
    close: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    body: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
    block: { gap: 2 },
    roleLabel: { fontSize: 10, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase" },
    locationName: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    fromNote: { fontSize: 11, color: theme.textSecondary, marginBottom: 6 },
    stripContent: { gap: 12, paddingRight: 4 },
  });
}

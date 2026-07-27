import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { collectKeyEntries, formatHourLabel, iconKindFor } from "../lib/outlookDisplay";
import { useLocationOutlooks, type LocationOutlook } from "../lib/useLocationOutlooks";
import { useRouteEtas } from "../lib/useRouteEtas";
import { useTimeFormatStore } from "../lib/useTimeFormatStore";
import useTheme from "../theme/useTheme";
import { cardElevationStyle } from "../theme/tokens";
import { RADIUS, SPACING } from "../theme/typography";
import type { SavedLocation, TravelMode } from "../types";
import HourlyOutlookPanel from "./HourlyOutlookPanel";
import RainGauge from "./RainGauge";
import WeatherKey from "./WeatherKey";
import WeatherIcon, { WEATHER_ICON_LABEL } from "./WeatherIcon";

// docs/09-design-system.md §9.5 — the Plan screen's hourly outlook.
//
// This replaces the previous single unlabelled strip, which silently showed
// the *origin* only. Two problems with that: nothing on screen said which
// location you were looking at, and for anything longer than a short hop the
// origin's 12-hour forecast says nothing useful about where you're going.
//
// The shape now follows the trip. Origin and each stop get a single reading —
// the hour you're actually there, since you're passing through — and the
// destination gets a strip, because that's the one place you may stay for
// hours. A button opens the full 12-hour outlook for every location.
const ROLE_NOTE: Record<LocationOutlook["role"], string> = {
  origin: "leaving",
  stop: "passing through",
  destination: "arriving",
};

interface Props {
  origin?: SavedLocation;
  waypoints: (SavedLocation | undefined)[];
  destination?: SavedLocation;
  mode: TravelMode;
  departTimeIso?: string;
}

export default function HourlyOutlook({ origin, waypoints, destination, mode, departTimeIso }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const [panelOpen, setPanelOpen] = useState(false);

  const etas = useRouteEtas({ origin, waypoints, destination, mode, departTimeIso });
  const outlooks = useLocationOutlooks(etas);

  const withData = outlooks.filter((o) => o.readings.length > 0);
  if (withData.length === 0) return null;

  const destinationOutlook = withData.find((o) => o.role === "destination");
  const passThrough = withData.filter((o) => o.role !== "destination");

  // Only what this card draws: one reading each for origin/stops, and the
  // destination's whole strip.
  const shown = [
    ...passThrough.map((o) => o.readings[0]).filter(Boolean),
    ...(destinationOutlook?.readings ?? []),
  ];
  const { rainBuckets, skyKinds } = collectKeyEntries(shown);

  // Any location falling back to the departure hour means the route couldn't
  // be timed — worth saying rather than showing times that look routed.
  const anyEstimated = withData.some((o) => !o.estimated);

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Hourly outlook</Text>
          <Pressable
            onPress={() => setPanelOpen(true)}
            style={styles.moreButton}
            accessibilityRole="button"
            accessibilityLabel="Open the full hourly outlook for every location on this trip"
          >
            <Text style={styles.moreLabel}>Full outlook</Text>
          </Pressable>
        </View>

        {passThrough.map((outlook) => {
          const reading = outlook.readings[0];
          const kind = iconKindFor(reading);
          return (
            <View key={`${outlook.location.lat},${outlook.location.lng},${outlook.role}`} style={styles.row}>
              <View style={styles.rowLabel}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {outlook.location.label}
                </Text>
                <Text style={styles.roleNote}>
                  {ROLE_NOTE[outlook.role]} {formatHourLabel(outlook.atIso, hour12)}
                </Text>
              </View>
              <View
                style={styles.rowReading}
                accessible
                accessibilityLabel={`${outlook.location.label}, ${ROLE_NOTE[outlook.role]} ${formatHourLabel(outlook.atIso, hour12)}, ${WEATHER_ICON_LABEL[kind]}, ${Math.round(reading.tempC)} degrees${reading.precipMm > 0 ? `, ${reading.precipMm}mm rain` : ""}`}
              >
                <WeatherIcon kind={kind} size={16} color={theme.textSecondary} />
                <Text style={styles.rowTemp}>{Math.round(reading.tempC)}°</Text>
                <RainGauge hour="" rainIntensity={reading.rainIntensity} precipMm={reading.precipMm} />
              </View>
            </View>
          );
        })}

        {destinationOutlook && (
          <View style={styles.destinationBlock}>
            <View style={styles.rowLabel}>
              <Text style={styles.locationName} numberOfLines={1}>
                {destinationOutlook.location.label}
              </Text>
              <Text style={styles.roleNote}>
                {ROLE_NOTE.destination} {formatHourLabel(destinationOutlook.atIso, hour12)} — next{" "}
                {destinationOutlook.readings.length} hours
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripContent}>
              {destinationOutlook.readings.map((reading) => (
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
        )}

        {anyEstimated && (
          <Text style={styles.estimateNote}>
            {"Times along the way couldn't be estimated — all shown at your departure hour."}
          </Text>
        )}
      </View>

      <WeatherKey rainBuckets={rainBuckets} skyKinds={skyKinds} />

      {panelOpen && <HourlyOutlookPanel outlooks={withData} onClose={() => setPanelOpen(false)} />}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      gap: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
    moreButton: { minHeight: 32, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: theme.border },
    moreLabel: { fontSize: 11, fontWeight: "600", color: theme.accentWalk },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
    rowLabel: { flexShrink: 1 },
    locationName: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
    roleNote: { fontSize: 11, color: theme.textSecondary },
    rowReading: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    rowTemp: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
    destinationBlock: { gap: 6, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.sm },
    stripContent: { gap: 12, paddingRight: 4 },
    estimateNote: { fontSize: 11, color: theme.textSecondary, fontStyle: "italic" },
  });
}

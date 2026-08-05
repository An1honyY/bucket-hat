import { StyleSheet, Text, View } from "react-native";
import type { LocationOutlook } from "../lib/useLocationOutlooks";
import { useTimeFormatStore } from "../lib/useTimeFormatStore";
import useTheme from "../theme/useTheme";
import { SPACING } from "../theme/typography";
import HourlyForecastRow from "./HourlyForecastRow";
import SidePanel, { panelBlockStyle } from "./SidePanel";
import WeatherKey from "./WeatherKey";
import { collectKeyEntries, formatHourLabel } from "../lib/outlookDisplay";

// The "Full outlook" panel — every location on the trip, each with its
// complete hourly strip. The shell (slide-in, backdrop, header, width) is
// SidePanel's; see there for why this is a side panel and not a sheet.
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
    <SidePanel heading="Full outlook" closeLabel="Close the full outlook" onClose={onClose}>
      {outlooks.map((outlook) => (
        <View key={`${outlook.location.lat},${outlook.location.lng},${outlook.role}`} style={styles.block}>
          <Text style={styles.roleLabel}>{ROLE_LABEL[outlook.role]}</Text>
          <Text style={styles.locationName} numberOfLines={1}>
            {outlook.location.label}
          </Text>
          <Text style={styles.fromNote}>from {formatHourLabel(outlook.atIso, hour12)}</Text>
          <HourlyForecastRow readings={outlook.readings} nowIso={outlook.atIso} bleed={SPACING.md} />
        </View>
      ))}

      <View style={[styles.block, styles.keyBlock]}>
        <WeatherKey rainBuckets={rainBuckets} skyKinds={skyKinds} showsWind />
      </View>
    </SidePanel>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // One card per location, so each strip has an edge to scroll against.
    // `gap` is overridden to 2: this block's three label lines are one stacked
    // heading, not three separate rows.
    block: { ...panelBlockStyle(theme), gap: 2 },
    keyBlock: { paddingTop: 0 },
    roleLabel: { fontSize: 10, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase" },
    locationName: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    fromNote: { fontSize: 11, color: theme.textSecondary, marginBottom: 6 },
  });
}

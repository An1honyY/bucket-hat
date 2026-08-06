import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DailyReading, HourlyReading } from "../../services/weatherService";
import { cardElevationStyle, type ThemeTokens } from "../../theme/tokens";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING , TYPE } from "../../theme/typography";

import HourlyForecastRow from "../../components/HourlyForecastRow";
import LocalForecastPanel from "./LocalForecastPanel";

// Today's hourly forecast for wherever the user is — the hours right ahead of
// them, with a button opening the full 48-hour and 7-day view.
//
// This deliberately reverses the 2026-07-21 call that kept an hourly strip off
// Today ("§9.3.1 says just current conditions"). That entry left the door open
// for whoever touched Today next, and this is that pass: the Right now card
// still answers "what is it like *now*", and this card answers "what happens
// next" without changing what Right now shows.
//
// A full day ahead on the card, scrolled horizontally; the 48-hour and 7-day
// views stay behind the button. Eight hours (the original figure) stopped
// short of the evening for anyone checking after lunch, which is exactly when
// "what am I coming home in" is the question being asked.
const HOURS_ON_CARD = 24;

interface Props {
  suburb: string | null;
  hourly: HourlyReading[];
  daily: DailyReading[];
}

export default function LocalForecastCard({ suburb, hourly, daily }: Props) {
  // App-wide mood — see RightNowCard for why it isn't resolved per-card.
  const theme = useTheme();
  const styles = getStyles(theme);
  const [panelOpen, setPanelOpen] = useState(false);

  // Same omit-rather-than-placeholder rule the rest of this app uses: with no
  // readings there is nothing to show, so the card doesn't appear at all.
  if (hourly.length === 0) return null;

  const onCard = hourly.slice(0, HOURS_ON_CARD);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Next 24 hours</Text>
          {suburb && <Text style={styles.suburbLabel}>{suburb}</Text>}
        </View>
        <Pressable
          onPress={() => setPanelOpen(true)}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel="Open the 48 hour and 7 day forecast"
        >
          <Text style={styles.moreLabel}>48h &amp; week</Text>
        </Pressable>
      </View>

      <HourlyForecastRow readings={onCard} bleed={SPACING.lg} theme={theme} />

      {panelOpen && (
        <LocalForecastPanel suburb={suburb} hourly={hourly} daily={daily} onClose={() => setPanelOpen(false)} />
      )}
    </View>
  );
}

function getStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
      ...cardElevationStyle(theme),
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
    headerText: { flexShrink: 1 },
    title: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    suburbLabel: { ...TYPE.caption, color: theme.textSecondary },
    moreButton: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
    },
    moreLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
  });
}

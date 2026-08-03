import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRecommendation } from "../../lib/useRecommendation";
import ActionIcon from "../../components/ActionIcon";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { Journey } from "../../types";

// History's compact row — docs/09-design-system.md §9.4.2: "same row
// structure as the Today-tab compact card" (src/screens/today/JourneyCard.tsx),
// plus a "current picks, not that day's" tag for journeys with no stored recommendationSnapshot
// (docs/04-screens-navigation.md §4.4). Unlike JourneyCard, this never shows
// weather-severity dots or a "Leaving now" action — both are live-journey
// concerns that don't apply to something already past.
interface Props {
  journey: Journey;
  onPress: () => void;
}

export default function HistoryRow({ journey, onPress }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const snapshot = journey.recommendationSnapshot;
  // Only recompute against current inventory when there's no frozen
  // snapshot to read — useRecommendation no-ops on a null journey.
  const recomputed = useRecommendation(snapshot ? null : journey);

  let topLabel: string;
  if (snapshot) {
    topLabel = snapshot.layerNames[snapshot.layerNames.length - 1] ?? "Nothing extra needed — you're set";
  } else if (recomputed) {
    const topLayer = recomputed.layers[recomputed.layers.length - 1];
    topLabel = topLayer ? ("id" in topLayer ? topLayer.name : topLayer.fallbackText) : "Nothing extra needed — you're set";
  } else {
    topLabel = "…";
  }

  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const departTime = formatTime(journey.departTime, hour12);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.routeRow}>
          <Text style={styles.route}>
            {journey.origin.label} → {journey.destination.label}
          </Text>
          {journey.recurrence && <ActionIcon kind="repeat" size={12} color={theme.textSecondary} />}
          {journey.linkedReturnJourneyId && <ActionIcon kind="swap" size={12} color={theme.textSecondary} />}
        </View>
        <Text style={styles.time}>{departTime}</Text>
      </View>

      <View style={styles.recRow}>
        <Text style={styles.topRecommendation}>{topLabel}</Text>
        {!snapshot && <Text style={styles.recomputedTag}>current picks, not that day&apos;s</Text>}
      </View>
    </Pressable>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { padding: SPACING.lg, borderRadius: RADIUS.card, backgroundColor: theme.surface, marginBottom: SPACING.md, gap: SPACING.sm, ...cardElevationStyle(theme) },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    routeRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, flexShrink: 1 },
    route: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 },
    time: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary },
    recRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
    topRecommendation: { ...TYPE.caption, color: theme.textPrimary },
    recomputedTag: { ...TYPE.micro, color: theme.textSecondary, fontStyle: "italic" },
  });
}

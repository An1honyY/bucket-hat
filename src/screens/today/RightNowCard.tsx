import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { RightNowState } from "../../lib/useRightNow";
import { classifyWeather } from "../../lib/weather";
import { conditionColorForIcon } from "../../theme/conditionColor";
import useWeatherTheme from "../../theme/useWeatherTheme";
import { cardElevationStyle } from "../../theme/tokens";
import ClothingTypeIcon, { accessoryIconKind, type ClothingIconKind } from "../../components/ClothingTypeIcon";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import type { LayerPick } from "../../lib/recommend";

// "Right now" card — docs/09-design-system.md §9.3.1, docs/04-screens-
// navigation.md §4.2. A smaller self-contained version of the gear
// recommendation card: current conditions + the reduced recommendation,
// no map, no leg list, no journey label.
//
// §9.1 (2026-07-21) — takes RightNowState as props rather than calling
// useRightNow() itself, so TodayScreen can fetch it once and share both the
// data and the resulting weather-reactive theme with JourneyCard below it,
// instead of each card re-fetching/re-resolving independently.
function pickLabel(pick: { name: string } | { fallbackText: string }): { text: string; isFallback: boolean } {
  return "name" in pick ? { text: pick.name, isFallback: false } : { text: pick.fallbackText, isFallback: true };
}

function layerIconKind(pick: LayerPick): ClothingIconKind {
  const type = "layerType" in pick ? pick.layerType : pick.type;
  if (type === "accessory") return accessoryIconKind("fallbackText" in pick ? pick.fallbackText : pick.name);
  if (type === "jacket" || type === "midlayer" || type === "base" || type === "bottoms") return type;
  return "accessory";
}

export default function RightNowCard({ loading, weather, recommendation, suburb, fetchedAt, refreshing }: RightNowState & { refreshing?: boolean }) {
  const theme = useWeatherTheme(weather);
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!weather || !recommendation) {
    return (
      <View style={styles.card}>
        <Text style={styles.fallback}>Couldn&apos;t fetch current conditions right now.</Text>
      </View>
    );
  }

  const condition = classifyWeather(weather.weatherCode, weather.precipMm, weather.windKph);
  const heroIcon = weatherIconKindFor(condition, weather.isDaylight);
  // When the reading was fetched, not the forecast hour it describes. These
  // are the same instant on a fresh load, but they diverge as soon as the card
  // keeps showing a stored reading — which is the whole point of the "as of"
  // line now that a refresh no longer blanks the card.
  const asOf = formatTime(fetchedAt !== null && fetchedAt !== undefined ? new Date(fetchedAt).toISOString() : weather.time, hour12);
  const picks: { pick: { name: string } | { fallbackText: string }; icon: ClothingIconKind }[] = [
    ...recommendation.layers.map((pick) => ({ pick, icon: layerIconKind(pick) })),
    ...recommendation.accessories.map((pick) => ({ pick, icon: layerIconKind(pick) })),
  ];
  if (recommendation.shoes) picks.push({ pick: recommendation.shoes, icon: "shoe" });
  if (recommendation.umbrella) picks.push({ pick: recommendation.umbrella, icon: "umbrella" });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Right now</Text>
      {suburb && <Text style={styles.suburbLabel}>{suburb}</Text>}
      <View style={styles.conditionRow}>
        {/* Coloured from the glyph, not from severity. Severity 0 maps to
            conditionDry, a deliberately muted grey that suits a small leg
            badge and made this card's hero icon *dimmer* than the plain
            textPrimary it replaced — the opposite of the intent. */}
        <WeatherIcon kind={heroIcon} size={26} color={conditionColorForIcon(theme, heroIcon)} />
        <Text style={styles.temp}>{Math.round(weather.apparentTempC)}°C</Text>
        <Text style={styles.conditionLabel}>{condition.label}</Text>
        {weather.uvIndex >= 6 && (
          <View style={styles.uvBadge}>
            <Text style={styles.uvBadgeText}>UV {Math.round(weather.uvIndex)}</Text>
          </View>
        )}
      </View>

      {/* The picks used to be a bare wrapped row directly under the
          temperature, at the same visual weight as the conditions above them —
          two unrelated kinds of information running together with nothing
          marking where one stopped. They're now a labelled subsection behind a
          divider, and each pick is its own chip so items are countable at a
          glance instead of reading as one long sentence. */}
      {picks.length > 0 && (
        <View style={styles.picksSection}>
          <Text style={styles.picksHeading}>What to wear</Text>
          <View style={styles.picksRow}>
            {picks.map(({ pick, icon }, i) => {
              const { text, isFallback } = pickLabel(pick);
              return (
                <View key={i} style={[styles.pickChip, isFallback && styles.pickChipFallback]}>
                  <ClothingTypeIcon kind={icon} size={15} color={isFallback ? theme.textSecondary : theme.accentWalk} />
                  <Text style={isFallback ? styles.pickTextFallback : styles.pickText}>{text}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* An automatic refresh has no pull-to-refresh spinner behind it, so the
          only signal it's happening is here — otherwise a stale-looking "as
          of" gives no hint that a newer reading is already on its way. */}
      <Text style={styles.asOf}>{refreshing ? `as of ${asOf} · updating…` : `as of ${asOf}`}</Text>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useWeatherTheme>) {
  return StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.surfaceRaised,
      gap: 8,
      marginBottom: 16,
      ...cardElevationStyle(theme),
    },
    title: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    suburbLabel: { fontSize: 12, color: theme.textSecondary },
    conditionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    temp: { fontSize: 24, fontWeight: "700", color: theme.textPrimary },
    conditionLabel: { fontSize: 14, fontWeight: "600", color: theme.textSecondary },
    uvBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.uvBadge },
    uvBadgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "600" },
    picksSection: { gap: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 2 },
    picksHeading: { fontSize: 10, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
    picksRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    // A resolved pick names something the user owns, so it gets the accent and
    // a tinted chip. A fallback is generic advice, so it stays quieter and
    // outlined — the difference was previously carried by italics alone.
    pickChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.accentWalk,
    },
    pickChipFallback: { borderColor: theme.border },
    pickText: { fontSize: 13, fontWeight: "700", color: theme.accentWalk },
    pickTextFallback: { fontSize: 13, color: theme.textSecondary },
    fallback: { fontSize: 13, fontStyle: "italic", color: theme.textSecondary },
    asOf: { fontSize: 11, color: theme.textSecondary },
  });
}

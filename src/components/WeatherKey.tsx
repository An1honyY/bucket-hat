import { StyleSheet, Text, View } from "react-native";
import useTheme from "../theme/useTheme";
import type { RainIntensity } from "../lib/weather";
import RainGauge from "./RainGauge";
import WeatherIcon, { WEATHER_ICON_LABEL, type WeatherIconKind } from "./WeatherIcon";

// A key explaining the outlook's two signals — the droplet fill level (rain
// intensity) and the condition icon above it — since neither is
// self-explanatory the first time someone sees them.
//
// It used to list all four rain buckets and a fixed five sky types on every
// render, so a dry, clear afternoon still got a legend explaining Heavy rain
// and Storm. It now takes the kinds actually on screen and explains only
// those; the caller collects them from the readings it rendered.
//
// Deliberately rendered outside the outlook card rather than inside — it's
// reference material for reading the card, not more of the card's content,
// and blending the two made it easy to mistake one for the other.
const RAIN_ORDER: RainIntensity[] = ["none", "low", "med", "high"];
const RAIN_LABEL: Record<RainIntensity, string> = { none: "Dry", low: "Light", med: "Moderate", high: "Heavy" };

// Fixed display order so the key doesn't reshuffle as the forecast changes.
const SKY_ORDER: WeatherIconKind[] = [
  "sun",
  "moon",
  "partlyCloudyDay",
  "partlyCloudyNight",
  "cloud",
  "fog",
  "wind",
  "drizzle",
  "rain",
  "snow",
  "storm",
];

interface Props {
  rainBuckets: ReadonlySet<RainIntensity>;
  skyKinds: ReadonlySet<WeatherIconKind>;
}

export default function WeatherKey({ rainBuckets, skyKinds }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const rain = RAIN_ORDER.filter((b) => rainBuckets.has(b));
  // partlyCloudyDay and partlyCloudyNight share one label ("Partly cloudy").
  // If a 12-hour window spans dusk both can be present, and listing the same
  // words twice next to two near-identical glyphs reads as a rendering fault.
  const seenLabels = new Set<string>();
  const sky = SKY_ORDER.filter((k) => {
    if (!skyKinds.has(k)) return false;
    const label = WEATHER_ICON_LABEL[k];
    if (seenLabels.has(label)) return false;
    seenLabels.add(label);
    return true;
  });

  if (rain.length === 0 && sky.length === 0) return null;

  return (
    <View style={styles.legend}>
      <Text style={styles.legendHeading}>Key</Text>
      {rain.length > 0 && (
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Rain:</Text>
          {rain.map((bucket) => (
            <View key={bucket} style={styles.legendItem}>
              <RainGauge hour="" rainIntensity={bucket} />
              <Text style={styles.legendItemLabel}>{RAIN_LABEL[bucket]}</Text>
            </View>
          ))}
        </View>
      )}
      {sky.length > 0 && (
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Sky:</Text>
          {sky.map((kind) => (
            <View key={kind} style={styles.legendItem}>
              <WeatherIcon kind={kind} size={16} color={theme.textSecondary} />
              <Text style={styles.legendItemLabel}>{WEATHER_ICON_LABEL[kind]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    legend: { marginTop: 12, gap: 6 },
    legendHeading: { fontSize: 11, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", marginBottom: 2 },
    legendRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
    legendLabel: { fontSize: 11, fontWeight: "600", color: theme.textSecondary, width: 34 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendItemLabel: { fontSize: 11, color: theme.textSecondary },
  });
}

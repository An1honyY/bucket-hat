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
// One square for every swatch and one line-height for every label, so the
// three rows stack on a single rhythm instead of each sizing itself to
// whatever artwork it happens to contain.
const SWATCH_BOX = 20;
const ROW_GAP = 8;

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
  /** Whether the strip this key describes prints a wind figure per hour. The
   *  hourly columns drop the unit to fit 36px, so the number under the wind
   *  glyph is unreadable without being told once what it is. */
  showsWind?: boolean;
}

export default function WeatherKey({ rainBuckets, skyKinds, showsWind = false }: Props) {
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

  if (rain.length === 0 && sky.length === 0 && !showsWind) return null;

  return (
    <View style={styles.legend}>
      <Text style={styles.legendHeading}>Key</Text>
      {rain.length > 0 && (
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Rain:</Text>
          <View style={styles.legendItems}>
            {rain.map((bucket) => (
              <View key={bucket} style={styles.legendItem}>
                <View style={styles.swatchBox}>
                  <RainGauge hour="" rainIntensity={bucket} swatch />
                </View>
                <Text style={styles.legendItemLabel}>{RAIN_LABEL[bucket]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {showsWind && (
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Wind:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={styles.swatchBox}>
                <WeatherIcon kind="wind" size={16} color={theme.textSecondary} />
              </View>
              <Text style={styles.legendItemLabel}>Speed in km/h</Text>
            </View>
          </View>
        </View>
      )}
      {sky.length > 0 && (
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Sky:</Text>
          <View style={styles.legendItems}>
            {sky.map((kind) => (
              <View key={kind} style={styles.legendItem}>
                <View style={styles.swatchBox}>
                  <WeatherIcon kind={kind} size={16} color={theme.textSecondary} />
                </View>
                <Text style={styles.legendItemLabel}>{WEATHER_ICON_LABEL[kind]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    legend: { marginTop: 12, gap: ROW_GAP },
    legendHeading: { fontSize: 11, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", marginBottom: 2 },
    // The label is a column beside the items, not another item inside the
    // wrapping row. As a sibling it shared the wrap, so a Sky row long enough
    // to wrap started its second line under the label rather than under the
    // first item — the row read as indented by accident.
    legendRow: { flexDirection: "row", alignItems: "flex-start", gap: 2 },
    // `rowGap`/`columnGap` rather than one `gap`: when items wrap, the space
    // between them and the space between the wrapped lines are different
    // problems, and a single value that suits one looks wrong for the other.
    legendItems: { flex: 1, flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", columnGap: 12, rowGap: ROW_GAP },
    // Fixed width so "Rain:", "Sky:" and "Wind:" start their items on one
    // vertical line — the rows previously each began wherever their own label
    // happened to end, which is what made the block look ragged. Sized for the
    // longest label rather than the 34 that clipped "Wind:".
    legendLabel: { fontSize: 11, fontWeight: "600", color: theme.textSecondary, width: 38, lineHeight: SWATCH_BOX, paddingRight: 2 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    // Every swatch — droplet or glyph — occupies the same box, so items sit on
    // one baseline across all three rows regardless of the artwork inside.
    // Without it the taller droplets set the rain row's height and the sky row
    // beside it read as a different scale of thing.
    swatchBox: { width: SWATCH_BOX, height: SWATCH_BOX, alignItems: "center", justifyContent: "center" },
    legendItemLabel: { fontSize: 11, color: theme.textSecondary, lineHeight: SWATCH_BOX },
  });
}

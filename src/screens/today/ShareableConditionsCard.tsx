import { Image, StyleSheet, Text, View } from "react-native";
import type { RightNowState } from "../../lib/useRightNow";
import { classifyWeather, formatWindKph } from "../../lib/weather";
import { conditionColorForIcon } from "../../theme/conditionColor";
import useTheme from "../../theme/useTheme";
import { NUMERIC, RADIUS, SPACING, TYPE } from "../../theme/typography";
import ClothingTypeIcon, { accessoryIconKind, type ClothingIconKind } from "../../components/ClothingTypeIcon";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import MetaDivider from "../../components/MetaDivider";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import { gearPickLabel } from "../../lib/gearLabel";
import type { LayerPick } from "../../lib/recommend";

// Phase 14's export view — docs/13-extended-features.md §13.2. The "Right
// now" card as a picture, not as a screen.
//
// §13.2 allows either capturing the live card or "a slightly restyled
// export-specific version, if the live card's tap targets don't translate
// well to a static image". They don't, and it is more than the tap targets:
//
//   - The live card's width is the screen's. A shared image should be the
//     same shape from a phone and from a desktop browser, so this one is a
//     fixed CARD_WIDTH.
//   - Gear photos are asynchronous and personal. A capture can catch them
//     half-loaded, and a picture meant to leave the app is the last place to
//     put a photo of the inside of someone's wardrobe by default.
//   - "as of 9:14, updating…", the refresh spinner and the tappable chips all
//     describe a live surface. In a still image they are noise at best.
//
// What it keeps is the card's own content and colours, so it reads as the
// thing the sender was actually looking at.

/** Fixed, so the exported PNG is the same shape everywhere. Roughly a phone
 *  card's width, which is what the layout inside it was designed for. */
export const CARD_WIDTH = 340;

function layerIconKind(pick: LayerPick): ClothingIconKind {
  const type = "layerType" in pick ? pick.layerType : pick.type;
  if (type === "accessory") return accessoryIconKind("fallbackText" in pick ? pick.fallbackText : pick.name);
  if (type === "jacket" || type === "midlayer" || type === "base" || type === "bottoms") return type;
  return "accessory";
}

const markSource = require("../../../assets/header-logo.png");

type Props = Pick<RightNowState, "weather" | "recommendation" | "suburb" | "fetchedAt">;

export default function ShareableConditionsCard({ weather, recommendation, suburb, fetchedAt }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  if (!weather || !recommendation) return null;

  const condition = classifyWeather(weather.weatherCode, weather.precipMm, weather.windKph);
  const heroIcon = weatherIconKindFor(condition, weather.isDaylight);
  const asOf = formatTime(
    fetchedAt !== null && fetchedAt !== undefined ? new Date(fetchedAt).toISOString() : weather.time,
    hour12
  );

  // Same order the live card lists them in: layers, accessories, shoes,
  // umbrella. `gearPickLabel` is what turns each into text either way, so the
  // picture and the screen can't word the same pick differently.
  const picks: { pick: Parameters<typeof gearPickLabel>[0]; icon: ClothingIconKind }[] = [
    ...recommendation.layers.map((pick) => ({ pick, icon: layerIconKind(pick) })),
    ...recommendation.accessories.map((pick) => ({ pick, icon: layerIconKind(pick) })),
  ];
  if (recommendation.shoes) picks.push({ pick: recommendation.shoes, icon: "shoe" });
  if (recommendation.umbrella) picks.push({ pick: recommendation.umbrella, icon: "umbrella" });

  return (
    // Opaque, and deliberately so: §13.2 names transparent backgrounds as one
    // of view-shot's two historical traps, and a card captured over nothing
    // arrives as dark text on a black rectangle.
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{suburb ? `${suburb} right now` : "Right now"}</Text>

      <View style={styles.conditionRow}>
        <WeatherIcon kind={heroIcon} size={34} color={conditionColorForIcon(theme, heroIcon)} />
        <Text style={styles.temp}>{Math.round(weather.tempC)}°C</Text>
        <Text style={styles.conditionLabel}>{condition.label}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detail}>Feels like {Math.round(weather.apparentTempC)}°</Text>
        <MetaDivider />
        <Text style={styles.detail}>Wind {formatWindKph(weather.windKph)}</Text>
      </View>

      {picks.length > 0 && (
        <View style={styles.picksSection}>
          <Text style={styles.picksHeading}>What to wear</Text>
          <View style={styles.picksRow}>
            {picks.map(({ pick, icon }, i) => {
              const { text, isFallback } = gearPickLabel(pick);
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

      {/* The one deliberately non-utilitarian line in the app (§13.2): this is
          the only surface designed to be seen by someone who doesn't have it.
          The time sits on the same row so the flourish costs no extra height
          and the picture still says when it was true. */}
      <View style={styles.footer}>
        <Image source={markSource} style={styles.mark} resizeMode="contain" />
        <Text style={styles.wordmark}>via Bucket Hat</Text>
        <View style={styles.footerSpacer} />
        <Text style={styles.asOf}>{asOf}</Text>
      </View>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      padding: SPACING.lg,
      gap: SPACING.sm,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
    },
    eyebrow: { ...TYPE.eyebrow, color: theme.textSecondary },
    conditionRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    temp: { ...TYPE.display, ...NUMERIC, color: theme.textPrimary },
    conditionLabel: { ...TYPE.title, color: theme.textPrimary, flexShrink: 1 },
    detailRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
    detail: { ...TYPE.caption, color: theme.textSecondary },
    picksSection: { gap: SPACING.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.md },
    picksHeading: { ...TYPE.eyebrow, color: theme.textSecondary },
    picksRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
    pickChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      maxWidth: CARD_WIDTH - SPACING.lg * 2,
    },
    pickChipFallback: { borderStyle: "dashed" },
    pickText: { ...TYPE.caption, color: theme.textPrimary, flexShrink: 1 },
    pickTextFallback: { ...TYPE.caption, color: theme.textSecondary, flexShrink: 1 },
    footer: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, paddingTop: SPACING.xs },
    mark: { width: 22, height: 16 },
    wordmark: { ...TYPE.micro, color: theme.textSecondary },
    footerSpacer: { flex: 1 },
    asOf: { ...TYPE.micro, color: theme.textSecondary },
  });
}

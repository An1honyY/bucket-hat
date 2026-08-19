import { StyleSheet, Text, View } from "react-native";
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
import MascotBase from "../../components/mascot/MascotBase";
import { MASCOT_ANIMATIONS, SHIVER_UNDERLAY } from "../../components/mascot/states";
import { mascotGarmentFills, mascotStateFor } from "../../lib/mascot";

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
// thing the sender was actually looking at — plus the mascot, who is not on
// the live card at all (he stands *above* it, §9.7). A picture that leaves
// the app is the one surface where the character earns his place twice over,
// and he is drawn here through `MascotBase` rather than `Mascot`: no
// Reanimated, no timers, one held pose, so a capture can't catch him
// mid-blink or mid-step.

/** Fixed, so the exported PNG is the same shape everywhere. Roughly a phone
 *  card's width, which is what the layout inside it was designed for. */
export const CARD_WIDTH = 340;

/** Big enough to read as a character rather than as a sticker, small enough
 *  to leave the temperature the loudest thing on the card. */
const MASCOT_SIZE = 86;

/** Where the app is, when the reverse geocode hasn't produced a suburb — a
 *  failed lookup, or a permission the user hasn't given. v1 is Auckland-only
 *  by design (docs/02-external-apis.md §2.1), so this is a fact about the app
 *  rather than a guess about the reading. */
const FALLBACK_PLACE = "Auckland";

function layerIconKind(pick: LayerPick): ClothingIconKind {
  const type = "layerType" in pick ? pick.layerType : pick.type;
  if (type === "accessory") return accessoryIconKind("fallbackText" in pick ? pick.fallbackText : pick.name);
  if (type === "jacket" || type === "midlayer" || type === "base" || type === "bottoms") return type;
  return "accessory";
}

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
  // The picture always says where it is. On the live card the suburb is a
  // nicety — you know where you are — but a card sent to someone else without
  // a place name is a temperature from nowhere.
  const place = suburb ?? FALLBACK_PLACE;
  // The same state and outfit the companion is wearing on Today, from the
  // engine's own signals. `reduced` is the state's held pose — it exists for
  // the reduce-motion path (§13.9), and a still image wants exactly that.
  const mascotState = mascotStateFor(recommendation.signals);
  // Shiver composes under the held pose, exactly as it does in Mascot.tsx —
  // it is a modifier on top of the state, not a state, and a cold-snap card
  // that showed him standing comfortably would be the picture disagreeing
  // with the gloves it is recommending.
  const heldPose = MASCOT_ANIMATIONS[mascotState.primary].reduced;
  const mascotPose = mascotState.shivering ? { ...SHIVER_UNDERLAY, ...heldPose } : heldPose;

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
      <View style={styles.headerRow}>
        <View style={styles.headerCol}>
          <Text style={styles.eyebrow}>{place} right now</Text>

          <View style={styles.conditionRow}>
            <WeatherIcon kind={heroIcon} size={34} color={conditionColorForIcon(theme, heroIcon)} />
            <Text style={styles.temp}>{Math.round(weather.tempC)}°C</Text>
          </View>

          <Text style={styles.conditionLabel}>{condition.label}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detail}>Feels like {Math.round(weather.apparentTempC)}°</Text>
            <MetaDivider />
            <Text style={styles.detail}>Wind {formatWindKph(weather.windKph)}</Text>
          </View>
        </View>

        <MascotBase size={MASCOT_SIZE} pose={mascotPose} garments={mascotGarmentFills(recommendation.signals)} />
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

      {/* §13.2's attribution line. Type only: the hat was drawn here from
          `header-logo.png`, a raster mark scaled down to 22px, and it came out
          of the capture visibly soft. The mascot above is the same hat drawn
          as vectors, and he is crisp at any size — one mark on the card, and
          the sharp one. The time shares the row so the flourish costs no extra
          height and the picture still says when it was true. */}
      <View style={styles.footer}>
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
    // He stands at the end of the header rather than over it: absolutely
    // positioned he would sit on top of a long condition label ("Heavy rain"),
    // and the one thing this card cannot afford is the weather being covered
    // by the mascot describing it.
    headerRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
    headerCol: { flex: 1, gap: SPACING.xs },
    eyebrow: { ...TYPE.eyebrow, color: theme.textSecondary },
    conditionRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    temp: { ...TYPE.display, ...NUMERIC, color: theme.textPrimary },
    // On its own line now that the mascot has taken the right of the header:
    // beside the temperature it had about 60px left and broke mid-word.
    conditionLabel: { ...TYPE.subtitle, color: theme.textPrimary },
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
    wordmark: { ...TYPE.micro, color: theme.textSecondary },
    footerSpacer: { flex: 1 },
    asOf: { ...TYPE.micro, color: theme.textSecondary },
  });
}

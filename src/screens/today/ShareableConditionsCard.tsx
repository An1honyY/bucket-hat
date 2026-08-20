import { StyleSheet, Text, View } from "react-native";
import type { WeatherSnapshot } from "../../types";
import { classifyWeather, formatWindKph } from "../../lib/weather";
import { conditionColorForIcon } from "../../theme/conditionColor";
import useTheme from "../../theme/useTheme";
import { NUMERIC, RADIUS, SPACING, TYPE } from "../../theme/typography";
import ClothingTypeIcon, { accessoryIconKind, type ClothingIconKind } from "../../components/ClothingTypeIcon";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import MetaDivider from "../../components/MetaDivider";
import { gearPickLabel } from "../../lib/gearLabel";
import type { LayerPick, Recommendation } from "../../lib/recommend";
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
 *  to leave the temperature the loudest thing on the card — and now also
 *  small enough not to out-measure the two lines he stands beside. */
const MASCOT_SIZE = 78;

function layerIconKind(pick: LayerPick): ClothingIconKind {
  const type = "layerType" in pick ? pick.layerType : pick.type;
  if (type === "accessory") return accessoryIconKind("fallbackText" in pick ? pick.fallbackText : pick.name);
  if (type === "jacket" || type === "midlayer" || type === "base" || type === "bottoms") return type;
  return "accessory";
}

/**
 * What one exported card is about.
 *
 * Built by ShareWeatherCard from either the live reading or a forecast window
 * (§13.2, extended 2026-08-19), so this component stays a renderer: it never
 * decides what "tomorrow" means or which hour of a rain spell to draw.
 */
export interface ShareCardSubject {
  /** "Auckland right now", "Auckland · Rain 2–5pm". */
  eyebrow: string;
  /** The hour the card is drawn for: now, or the window's peak. */
  weather: WeatherSnapshot;
  recommendation: Recommendation;
  /** A span's low–high. Absent for a single moment, which has neither. */
  tempRangeC?: { minC: number; maxC: number };
  /** Highest sustained wind across a span; the moment's own wind otherwise. */
  windKph: number;
  /**
   * Bottom right: when this was true, as a date — plus a clock time when the
   * card is about a single moment.
   *
   * It used to be "Today"/"Tomorrow", which contradicted the eyebrow on every
   * evening card ("Auckland CBD · Tonight … Today") and left a picture that
   * outlives the day it describes with no way to date it.
   */
  stamp: string;
}

export default function ShareableConditionsCard({ subject }: { subject: ShareCardSubject }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { eyebrow, weather, recommendation, tempRangeC, windKph, stamp } = subject;
  // A range whose ends round to the same degree isn't a range — a steady 13°
  // window would read "13° 13°".
  const hasRange = tempRangeC !== undefined && Math.round(tempRangeC.minC) !== Math.round(tempRangeC.maxC);

  const condition = classifyWeather(weather.weatherCode, weather.precipMm, weather.windKph);
  const heroIcon = weatherIconKindFor(condition, weather.isDaylight);
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
          <Text style={styles.eyebrow}>{eyebrow}</Text>

          {/* A span leads with its high, and names its low in words.
              Bold-max-beside-secondary-min is the 7-day panel's pairing
              (§9.5), and it works there because the column headers and the
              six neighbours around it say which is which. Alone in a picture
              sent to someone who has never seen the app, "12°C 11°" is two
              temperatures and no clue — so the low says it is the low. */}
          <View style={styles.conditionRow}>
            <WeatherIcon kind={heroIcon} size={34} color={conditionColorForIcon(theme, heroIcon)} />
            <Text style={styles.temp}>{Math.round(hasRange ? tempRangeC!.maxC : weather.tempC)}°C</Text>
            {hasRange && <Text style={styles.tempLow}>Low {Math.round(tempRangeC!.minC)}°</Text>}
          </View>
        </View>

        <MascotBase size={MASCOT_SIZE} pose={mascotPose} garments={mascotGarmentFills(recommendation.signals)} />
      </View>

      {/* The condition and the facts that qualify it, on one row rather than
          stacked three deep: they answer one question between them ("is it
          worse than the number above?"), and as separate lines the card read
          as a list of unrelated remarks.

          Below the header rather than inside its left column, because beside
          the mascot the row had about 200px and wrapped — and a wrapped row of
          divider-separated facts strands a divider at the end of the first
          line, pointing at nothing.

          A moment says how it feels; a span has already given its range, so it
          only adds the wind. One hour's apparent temperature is a fact about
          that hour, and pinning it to a whole day would be the card's most
          misreadable line. */}
      <View style={styles.detailRow}>
        <Text style={styles.conditionLabel}>{condition.label}</Text>
        <MetaDivider />
        {!hasRange && (
          <>
            <Text style={styles.detail}>Feels like {Math.round(weather.apparentTempC)}°</Text>
            <MetaDivider />
          </>
        )}
        <Text style={styles.detail}>
          {tempRangeC ? "Wind up to " : "Wind "}
          {formatWindKph(windKph)}
        </Text>
      </View>

      {picks.length > 0 && (
        <View style={styles.picksSection}>
          <Text style={styles.picksHeading}>What to wear</Text>
          {/* One chip treatment, owned item or engine fallback alike. On the
              live card the dashed outline means "this is a category, not
              something of yours" — a distinction the sender already knows and
              the recipient cannot act on, and five dashed boxes in a picture
              read as a card that failed to finish loading. Filled rather than
              outlined for the same reason: a tag is a thing, an outline is a
              control, and nothing here is tappable. */}
          <View style={styles.picksRow}>
            {picks.map(({ pick, icon }, i) => {
              const { text } = gearPickLabel(pick);
              return (
                <View key={i} style={styles.pickChip}>
                  <ClothingTypeIcon kind={icon} size={15} color={theme.accentWalk} />
                  <Text style={styles.pickText}>{text}</Text>
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
        <Text style={styles.asOf}>{stamp}</Text>
      </View>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      // A step more generous than the live card's §9.2 padding. That one is
      // budgeting against the screen edge; this one is the whole picture, and
      // an exported image with a tight margin looks cropped rather than laid
      // out.
      padding: SPACING.xl,
      gap: SPACING.md,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
    },
    // He stands at the end of the header rather than over it: absolutely
    // positioned he would sit on top of a long condition label ("Heavy rain"),
    // and the one thing this card cannot afford is the weather being covered
    // by the mascot describing it.
    //
    // Centred rather than bottom-aligned. Sharing his baseline was right while
    // the column was the taller of the two and set the row's height; now that
    // the condition and wind have moved to a full-width row below, the column
    // is two lines against his 78, and bottom-alignment banked all of that
    // difference into one gap above the eyebrow that read as a mistake.
    headerRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    headerCol: { flex: 1, gap: SPACING.xs },
    eyebrow: { ...TYPE.eyebrow, color: theme.textSecondary },
    conditionRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    temp: { ...TYPE.display, ...NUMERIC, color: theme.textPrimary },
    // Named, so it can sit beside the high without being taken for one. A
    // step smaller than the 7-day panel's paired minimum because it now
    // carries a word as well as a figure, and a `title`-sized "Low 8°"
    // competes with the number it is there to annotate.
    tempLow: { ...TYPE.subtitle, ...NUMERIC, color: theme.textSecondary },
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
      backgroundColor: theme.bg,
      maxWidth: CARD_WIDTH - SPACING.xl * 2,
    },
    pickText: { ...TYPE.caption, color: theme.textPrimary, flexShrink: 1 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: SPACING.md,
    },
    // A step up from `micro`: this is the only line on the card addressed to
    // someone who doesn't have the app, and it was the quietest thing on it.
    wordmark: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary },
    footerSpacer: { flex: 1 },
    asOf: { ...TYPE.micro, ...NUMERIC, color: theme.textSecondary },
  });
}

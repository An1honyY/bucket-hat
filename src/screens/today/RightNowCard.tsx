import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { RightNowState } from "../../lib/useRightNow";
import { classifyWeather, feelsLikeDiverges, formatWindKph } from "../../lib/weather";
import { conditionColorForIcon } from "../../theme/conditionColor";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import { cardElevationStyle } from "../../theme/tokens";
import ClothingTypeIcon, { accessoryIconKind, type ClothingIconKind } from "../../components/ClothingTypeIcon";
import GearThumbnail from "../../components/GearThumbnail";
import GearDetailSheet, { type GearItem } from "../../components/GearDetailSheet";
import WeatherIcon, { weatherIconKindFor } from "../../components/WeatherIcon";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import type { LayerPick } from "../../lib/recommend";
import { gearPickLabel } from "../../lib/gearLabel";

// "Right now" card — docs/09-design-system.md §9.3.1, docs/04-screens-
// navigation.md §4.2. A smaller self-contained version of the gear
// recommendation card: current conditions + the reduced recommendation,
// no map, no leg list, no journey label.
//
// §9.1 (2026-07-21) — takes RightNowState as props rather than calling
// useRightNow() itself, so TodayScreen can fetch it once and share both the
// data and the resulting weather-reactive theme with JourneyCard below it,
// instead of each card re-fetching/re-resolving independently.
// §3.3's list-row thumbnail size. Double the 20px this card used to draw:
// at that size a photo of your own jacket was a smudge, which defeats the
// point of showing the photo rather than a category glyph.
const PICK_PHOTO_SIZE = 40;
// What a chip's glyph measures when there's no photo to show — the size the
// chips used before photos were enlarged, so a photoless pick still reads as a
// chip rather than as a mostly-empty tile.
const PICK_ICON_SIZE = 15;

function layerIconKind(pick: LayerPick): ClothingIconKind {
  const type = "layerType" in pick ? pick.layerType : pick.type;
  if (type === "accessory") return accessoryIconKind("fallbackText" in pick ? pick.fallbackText : pick.name);
  if (type === "jacket" || type === "midlayer" || type === "base" || type === "bottoms") return type;
  return "accessory";
}

export default function RightNowCard({ loading, weather, recommendation, suburb, fetchedAt, refreshing }: RightNowState & { refreshing?: boolean }) {
  // The app-wide mood, not one resolved from this card's own `weather`.
  // They're the same reading — Today publishes it as ambient, a saved
  // location publishes it as the override — but they didn't arrive in the
  // same commit: the card resolved its mood during render while the chrome
  // waited for the override, which is published from an effect. Opening a
  // location in a different mood visibly repainted the content first and the
  // header, tab bar and background a beat later. One source, one commit.
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  // Which owned pick is open in the detail dialog, if any.
  const [openItem, setOpenItem] = useState<{ item: GearItem; icon: ClothingIconKind } | null>(null);

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
  // Emphasised only when the gap is big enough that the engine also said
  // something about it — see FEELS_LIKE_DIVERGENCE_C.
  const diverges = feelsLikeDiverges(weather.tempC, weather.apparentTempC);
  // When the reading was fetched, not the forecast hour it describes. These
  // are the same instant on a fresh load, but they diverge as soon as the card
  // keeps showing a stored reading — which is the whole point of the "as of"
  // line now that a refresh no longer blanks the card.
  const asOf = formatTime(fetchedAt !== null && fetchedAt !== undefined ? new Date(fetchedAt).toISOString() : weather.time, hour12);
  // The whole item, not a name/id/photo projection: the detail sheet needs
  // every property that went into the pick being made, and the engine already
  // hands us the real ClothingItem/ShoeItem/UmbrellaItem.
  type Pick = GearItem | { fallbackText: string };
  const picks: { pick: Pick; icon: ClothingIconKind }[] = [
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
        {/* The air temperature, not the apparent one. This card showed
            `apparentTempC` here unlabelled for its whole life, which is the
            one number a bare "5°C" must not be: every other weather app
            people cross-check against puts the air temperature in this slot,
            so the card looked simply wrong rather than differently informed.
            The figure the engine actually dressed for is still here — it's
            the line below, where it can be named. */}
        <Text style={styles.temp}>{Math.round(weather.tempC)}°C</Text>
        <Text style={styles.conditionLabel}>{condition.label}</Text>
        {weather.uvIndex >= 6 && (
          <View style={styles.uvBadge}>
            <Text style={styles.uvBadgeText}>UV {Math.round(weather.uvIndex)}</Text>
          </View>
        )}
      </View>

      {/* Feels-like and wind, always shown rather than threshold-gated. On a
          still day at face value both still answer a question the user came
          with ("is it as cold as it looks?", "do I need something windproof?")
          — and a figure that only appears in bad weather teaches people not to
          look for it. The compact per-hour cells and leg badges stay gated,
          where a row of twelve is genuinely noise. */}
      <View style={styles.detailRow}>
        <Text style={[styles.detail, diverges && styles.detailEmphasis]}>
          Feels like {Math.round(weather.apparentTempC)}°
        </Text>
        <Text style={styles.detail}>Wind {formatWindKph(weather.windKph)}</Text>
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
              const { text, isFallback } = gearPickLabel(pick);
              // An owned item shows its own photo where it has one (§3.3) —
              // the chip is the smallest surface in the app that can carry
              // "this is *your* jacket" rather than a category glyph. At the
              // old 20px that claim was hard to make out, so it's now the 40px
              // list-row size from §3.3, and the chip is tappable: the photo
              // being legible is what invites the tap in the first place.
              const item = !isFallback && "id" in pick ? pick : null;
              const content = (
                <>
                  {item ? (
                    <GearThumbnail
                      itemId={item.id}
                      photoUri={item.photoUri}
                      kind={icon}
                      size={PICK_PHOTO_SIZE}
                      bareIconSize={PICK_ICON_SIZE}
                      iconColor={theme.accentWalk}
                    />
                  ) : (
                    <ClothingTypeIcon kind={icon} size={PICK_ICON_SIZE} color={isFallback ? theme.textSecondary : theme.accentWalk} />
                  )}
                  {/* flexShrink lets a long line wrap inside the chip instead
                      of pushing the chip past the card's edge — fallback copy
                      like a full "none available" sentence is easily wider
                      than the card. */}
                  <Text style={[isFallback ? styles.pickTextFallback : styles.pickText, styles.pickTextFlex]}>{text}</Text>
                </>
              );

              if (!item) {
                return (
                  <View key={i} style={[styles.pickChip, isFallback && styles.pickChipFallback]}>
                    {content}
                  </View>
                );
              }
              return (
                <Pressable
                  key={i}
                  onPress={() => setOpenItem({ item, icon })}
                  style={styles.pickChip}
                  accessibilityRole="button"
                  accessibilityLabel={`${text} — see details`}
                >
                  {content}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* An automatic refresh has no pull-to-refresh spinner behind it, so the
          only signal it's happening is here — otherwise a stale-looking "as
          of" gives no hint that a newer reading is already on its way. */}
      <Text style={styles.asOf}>{refreshing ? `as of ${asOf}, updating…` : `as of ${asOf}`}</Text>

      {openItem && (
        <GearDetailSheet item={openItem.item} kind={openItem.icon} onClose={() => setOpenItem(null)} />
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
      ...cardElevationStyle(theme),
    },
    title: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    suburbLabel: { ...TYPE.caption, color: theme.textSecondary },
    conditionRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    temp: { fontSize: 24, fontWeight: "700", color: theme.textPrimary },
    conditionLabel: { ...TYPE.body, fontWeight: "600", color: theme.textSecondary },
    // `lg`, not `xs`: the dot that used to divide these two facts is gone, so
    // the gap is doing that job on its own and has to be unmistakable.
    detailRow: { flexDirection: "row", alignItems: "center", gap: SPACING.lg, flexWrap: "wrap", marginTop: -2 },
    detail: { ...TYPE.caption, color: theme.textSecondary },
    // §9.6 — the emphasis is weight and colour together, never colour alone,
    // and the line states the figure either way; nothing here is conveyed by
    // the styling on its own.
    detailEmphasis: { fontWeight: "700", color: theme.textPrimary },
    detailSeparator: { ...TYPE.caption, color: theme.textSecondary },
    uvBadge: { marginLeft: "auto", paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, backgroundColor: theme.uvBadge },
    uvBadgeText: { ...TYPE.micro, color: "#FFFFFF", fontWeight: "700" },
    picksSection: { gap: SPACING.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.md, marginTop: 2 },
    picksHeading: { ...TYPE.micro, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
    picksRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACING.sm },
    // A resolved pick names something the user owns, so it gets the accent and
    // a tinted chip. A fallback is generic advice, so it stays quieter and
    // outlined — the difference was previously carried by italics alone.
    pickChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      // A chip may be as wide as the row but never wider — the cap is what
      // actually stops a long recommendation escaping the card, with
      // pickTextFlex letting the label wrap to satisfy it.
      maxWidth: "100%",
      flexShrink: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.circle,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.accentWalk,
    },
    pickChipFallback: { borderColor: theme.border },
    // The chip is laid out by the row's wrap, but its *text* also has to be
    // allowed to wrap: without this a single long fallback sentence sets the
    // chip's width and the chip runs past the card's right edge.
    pickTextFlex: { flexShrink: 1, flexGrow: 0 },
    pickText: { ...TYPE.caption, fontWeight: "700", color: theme.accentWalk },
    pickTextFallback: { ...TYPE.caption, color: theme.textSecondary },
    fallback: { ...TYPE.caption, fontStyle: "italic", color: theme.textSecondary },
    asOf: { ...TYPE.micro, color: theme.textSecondary },
  });
}

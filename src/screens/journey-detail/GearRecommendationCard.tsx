import { Pressable, StyleSheet, Text, View } from "react-native";
import { GENERIC_PICKS_NOTE, type LayerPick, type Recommendation } from "../../lib/recommend";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import ClothingTypeIcon, { accessoryIconKind, type ClothingIconKind } from "../../components/ClothingTypeIcon";
import GearThumbnail from "../../components/GearThumbnail";
import Mascot from "../../components/mascot/Mascot";
import { mascotFeetOffset } from "../../components/mascot/MascotBase";
import { mascotGarmentFills, mascotStateFor } from "../../lib/mascot";
import type { GearAddTarget } from "../../navigation/types";
import type { RecommendationSnapshot } from "../../types";
import { displayGearLabel, gearPickLabel } from "../../lib/gearLabel";

// Gear recommendation card — docs/09-design-system.md §9.3 item 4, backed by
// the real recommendGear() engine (docs/07-recommendation-engine.md §7).
//
// Two lists, not five (2026-08-03). The card used to render layers, then
// accessories, then a bottoms/shoes/umbrella row, then notes — four sections
// in three different type sizes, with the things you own and the things you
// don't interleaved inside each one. It now reads as:
//
//   Wear      — what you own, one row each, with the item's own photo
//   Also grab — the gaps, in their own muted hint box, still tappable to add
//   Notes     — why, unchanged
//
// The photo is the point of the first list: this app's promise is *your*
// jacket, not "a jacket", and a name in the user's own words next to their
// own photo is the strongest version of that (§3.3's thumbnail rule, §9.0's
// "personal" read). Fallbacks have no photo by definition, which is exactly
// why they belong in the second list rather than mixed into the first.
/** §9.7 — "a smaller ~64×64pt instance in the top-right corner". */
const MASCOT_SIZE = 64;

function layerIconKind(pick: LayerPick): ClothingIconKind {
  const type = "layerType" in pick ? pick.layerType : pick.type;
  if (type === "accessory") return accessoryIconKind("fallbackText" in pick ? pick.fallbackText : pick.name);
  if (type === "jacket" || type === "midlayer" || type === "base" || type === "bottoms") return type;
  return "accessory";
}

// One slot's worth of recommendation, flattened out of Recommendation's five
// separate fields so the card can render owned and missing items as two
// lists rather than repeating the same branch in each section.
interface Slot {
  key: string;
  kind: ClothingIconKind;
  text: string;
  /** Present for a real owned item — drives the photo lookup. */
  itemId?: string;
  photoUri?: string;
  /** Where "add one" should land for a missing item. */
  target?: GearAddTarget;
}

function slotsFor(recommendation: Recommendation): { owned: Slot[]; missing: Slot[] } {
  const owned: Slot[] = [];
  const missing: Slot[] = [];

  // Outermost first: the jacket is what you actually reach for on the way
  // out, so it leads. (layerPlanForWarmthLevel resolves base-first.)
  const push = (slot: Slot, isFallback: boolean) => (isFallback ? missing : owned).push(slot);

  [...recommendation.layers].reverse().forEach((pick, i) => {
    const { text, isFallback } = gearPickLabel(pick);
    push(
      {
        key: `layer-${i}`,
        kind: layerIconKind(pick),
        text,
        itemId: "id" in pick ? pick.id : undefined,
        photoUri: "photoUri" in pick ? pick.photoUri : undefined,
        target: "layerType" in pick ? { kind: "clothing", clothingType: pick.layerType } : undefined,
      },
      isFallback
    );
  });

  if (recommendation.bottoms) {
    const pick = recommendation.bottoms;
    const { text, isFallback } = gearPickLabel(pick);
    push(
      {
        key: "bottoms",
        kind: "bottoms",
        text,
        itemId: "id" in pick ? pick.id : undefined,
        photoUri: "photoUri" in pick ? pick.photoUri : undefined,
        target: { kind: "clothing", clothingType: "bottoms" },
      },
      isFallback
    );
  }

  if (recommendation.shoes) {
    const pick = recommendation.shoes;
    const { text, isFallback } = gearPickLabel(pick);
    push(
      {
        key: "shoes",
        kind: "shoe",
        text,
        itemId: "id" in pick ? pick.id : undefined,
        photoUri: "photoUri" in pick ? pick.photoUri : undefined,
        target: { kind: "shoe" },
      },
      isFallback
    );
  }

  if (recommendation.umbrella) {
    const pick = recommendation.umbrella;
    const { text, isFallback } = gearPickLabel(pick);
    push(
      {
        key: "umbrella",
        kind: "umbrella",
        text,
        itemId: "id" in pick ? pick.id : undefined,
        photoUri: "photoUri" in pick ? pick.photoUri : undefined,
        target: { kind: "umbrella" },
      },
      isFallback
    );
  }

  recommendation.accessories.forEach((pick, i) => {
    const { text, isFallback } = gearPickLabel(pick);
    push(
      {
        key: `accessory-${i}`,
        kind: layerIconKind(pick),
        text,
        itemId: "id" in pick ? pick.id : undefined,
        photoUri: "photoUri" in pick ? pick.photoUri : undefined,
        target: { kind: "clothing", clothingType: "accessory" },
      },
      isFallback
    );
  });

  return { owned, missing };
}

interface Props {
  recommendation?: Recommendation;
  // §9.4.2 — History's detail view swaps the live Recommendation for the
  // frozen snapshot. Snapshot names are flat strings with no ids, so those
  // rows carry the type glyph rather than a photo, and nothing there is
  // actionable.
  snapshot?: RecommendationSnapshot;
  onAddGear?: (target: GearAddTarget) => void;
}

export default function GearRecommendationCard({ recommendation, snapshot, onAddGear }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (snapshot) {
    const layersTopDown = [...snapshot.layerNames]
      .map((name, i) => ({ name, kind: snapshot.layerTypes?.[i] }))
      .reverse();
    // A snapshot stores flat strings, so there's no owned-item/fallback
    // distinction left to read — `displayGearLabel` is the right rule for both
    // here, since it only raises the leading noun phrase and leaves anything a
    // user typed with its own capitals intact.
    const rows: { key: string; kind?: ClothingIconKind; text: string }[] = [
      ...layersTopDown.map(({ name, kind }, i) => ({ key: `layer-${i}`, kind, text: displayGearLabel(name) })),
      ...(snapshot.shoeName ? [{ key: "shoes", kind: "shoe" as const, text: displayGearLabel(snapshot.shoeName) }] : []),
      ...(snapshot.umbrellaName
        ? [{ key: "umbrella", kind: "umbrella" as const, text: displayGearLabel(snapshot.umbrellaName) }]
        : []),
      ...snapshot.accessoryNames.map((name, i) => ({
        key: `accessory-${i}`,
        kind: accessoryIconKind(name),
        text: displayGearLabel(name),
      })),
    ];
    return (
      <View style={styles.card}>
        {/* Frozen journeys keep their companion. The snapshot stores the
            signals it was computed from (§13.9), so a trip taken in a cold
            snap still shows a shivering mascot rather than one re-derived
            from today's weather. Rows written before Phase 21 have no
            signals and simply show none. */}
        {snapshot.signals && (
          <View style={styles.mascotPerch} pointerEvents="none">
            <Mascot
              size={MASCOT_SIZE}
              state={mascotStateFor(snapshot.signals)}
              garments={mascotGarmentFills(snapshot.signals)}
            />
          </View>
        )}
        <View style={styles.list}>
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <View style={styles.glyphSlot}>
                {row.kind && <ClothingTypeIcon kind={row.kind} size={18} color={theme.accentWalk} />}
              </View>
              <Text style={styles.itemName}>{row.text}</Text>
            </View>
          ))}
        </View>
        {/* Same split as the live path below: the generic-picks line is
            about the app's gaps, not that day's weather, so it keeps its own
            box here too — a frozen journey is still a journey someone
            reads. Nothing in it is tappable, though: adding gear now can't
            change what was worn then. */}
        {snapshot.notes.includes(GENERIC_PICKS_NOTE) && (
          <View style={styles.hint}>
            <Text style={styles.hintFooter}>{GENERIC_PICKS_NOTE}</Text>
          </View>
        )}
        <Notes notes={snapshot.notes.filter((note) => note !== GENERIC_PICKS_NOTE)} styles={styles} />
      </View>
    );
  }

  if (!recommendation) return null;

  const { owned, missing } = slotsFor(recommendation);
  // The generic-picks line is about the app's gaps, not this journey's
  // weather, so it heads the hint box instead of sitting in the notes list.
  const isGeneric = recommendation.notes.includes(GENERIC_PICKS_NOTE);
  const weatherNotes = recommendation.notes.filter((note) => note !== GENERIC_PICKS_NOTE);

  return (
    <View style={styles.card}>
      {/* §9.7 — the secondary instance, reflecting *this journey's*
          recommendation rather than the weather right now, which is the
          whole reason it isn't just a second copy of Today's.

          Perched on the card's top-right corner rather than placed inside
          it: the rows below truncate to one line, so a mascot in the content
          area would have a long item name running under it. Standing him on
          the edge means the two can never collide however he leans. */}
      <View style={styles.mascotPerch} pointerEvents="none">
        <Mascot
          size={MASCOT_SIZE}
          state={mascotStateFor(recommendation.signals)}
          garments={mascotGarmentFills(recommendation.signals)}
        />
      </View>

      {/* No heading of its own: the screen's "What to wear" section label
          sits directly above this card, and a second title inside it just
          said the same thing twice. */}
      {owned.length > 0 && (
        <View style={styles.list}>
          {owned.map((slot) => (
            <View key={slot.key} style={styles.row} accessible accessibilityLabel={slot.text}>
              <GearThumbnail itemId={slot.itemId} photoUri={slot.photoUri} kind={slot.kind} />
              <Text style={styles.itemName} numberOfLines={1}>
                {slot.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* The gaps, in their own box: greyed, headed, and never mixed in with
          things you actually own. §9.6 — each line is a real button reading
          as an action, not a description. */}
      {missing.length > 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>{owned.length > 0 ? "Also grab" : "Suggested"}</Text>
          {missing.map((slot) => {
            const row = (
              <View style={styles.hintRow}>
                <ClothingTypeIcon kind={slot.kind} size={16} color={theme.textSecondary} />
                <Text style={styles.hintText}>{slot.text}</Text>
              </View>
            );
            if (!onAddGear || !slot.target) return <View key={slot.key}>{row}</View>;
            return (
              <Pressable
                key={slot.key}
                onPress={() => onAddGear(slot.target!)}
                accessibilityRole="button"
                accessibilityLabel={`${slot.text} — double tap to add one`}
                hitSlop={6}
              >
                {row}
              </Pressable>
            );
          })}
          {isGeneric && <Text style={styles.hintFooter}>{GENERIC_PICKS_NOTE}</Text>}
        </View>
      )}

      <Notes notes={weatherNotes} styles={styles} />
    </View>
  );
}

// The §7 reasoning — warmup discount, AC contrast, UV/darkness — kept as
// accented callouts so it reads as context rather than more picks.
//
// One callout per note, not one callout holding every note. They are
// independent observations ("Walking will warm you up", "Bus/train AC will
// feel cold", "UV index reaching 7") and stacking them inside a single
// bordered box ran them together as one paragraph, so a reader had to work
// out where one hint ended and the next began.
function Notes({ notes, styles }: { notes: string[]; styles: ReturnType<typeof getStyles> }) {
  if (notes.length === 0) return null;
  return (
    <View style={styles.notesList}>
      {notes.map((note, i) => (
        <View key={i} style={styles.notesCallout}>
          <View style={styles.notesAccentBar} />
          <Text style={styles.note}>{note}</Text>
        </View>
      ))}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
      gap: SPACING.md,
      ...cardElevationStyle(theme),
    },
    // Standing on the card's top edge, inset from the right corner so the
    // radius doesn't cut under his feet.
    mascotPerch: { position: "absolute", right: SPACING.lg, top: -mascotFeetOffset(MASCOT_SIZE) },
    list: { gap: SPACING.sm },
    row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, minHeight: 40 },
    // Keeps the snapshot rows' glyphs on the same left edge the photo
    // thumbnails sit on, so the two variants of this card don't wander.
    glyphSlot: { width: 40, alignItems: "center", justifyContent: "center" },
    itemName: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 },
    // No box. The dashed outline that used to wrap this block was doing the
    // same job as the "SUGGESTED" heading above it and the hairline below,
    // only louder — and once the notes became separate callouts it was one
    // more bordered rectangle competing with them. The padding goes with it,
    // so the hairline runs the full width of the card's content and reads as
    // a section separator rather than a rule inset inside a container.
    hint: { gap: SPACING.xs },
    hintTitle: { ...TYPE.micro, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
    hintRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 28 },
    hintText: { ...TYPE.caption, color: theme.textSecondary, flexShrink: 1 },
    // Deliberately the quietest text in the card: it explains an app
    // limitation, not anything about this journey, so it should be findable
    // without competing with the hints above it. Separated by a hairline and
    // dimmed rather than shrunk further — TYPE.micro is already the smallest
    // step, and going below it would be an accessibility problem instead of a
    // hierarchy one (§9.6).
    hintFooter: {
      ...TYPE.micro,
      color: theme.textSecondary,
      opacity: 0.7,
      lineHeight: 16,
      marginTop: SPACING.sm,
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    notesList: { gap: SPACING.sm },
    // `alignItems: stretch` (the default) is what lets the 3px bar take the
    // height of its own note, so each callout is visibly its own hint.
    notesCallout: { flexDirection: "row", gap: SPACING.sm, backgroundColor: theme.bg, borderRadius: RADIUS.pill, padding: SPACING.sm },
    notesAccentBar: { width: 3, borderRadius: 2, backgroundColor: theme.accentWalk },
    note: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 18, flex: 1 },
  });
}

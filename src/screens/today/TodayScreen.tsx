import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { materializeTodaysJourneys } from "../../lib/materializeToday";
import { useRightNow } from "../../lib/useRightNow";
import { cancelLeaveByNotification } from "../../lib/notifications";
import type { RootStackParamList } from "../../navigation/types";
import type { Journey } from "../../types";
import RightNowCard from "./RightNowCard";
import { useReduceMotion } from "../../components/mascot/Mascot";
import { mascotClearance } from "../../components/mascot/MascotBase";
import PerchedMascot from "../../components/mascot/PerchedMascot";
import { useMascotPerches } from "../../components/mascot/useMascotPerches";
import { mascotGarmentFills, mascotStateFor, MASCOT_IDLE } from "../../lib/mascot";
import LocalForecastCard from "./LocalForecastCard";
import JourneyCard from "./JourneyCard";
import SetupChecklist from "./SetupChecklist";
import ScreenSurface from "../../components/ScreenSurface";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";

// Home/dashboard tab — docs/04-screens-navigation.md item 1, wired to real
// recurring-journey materialization and the reduced "Right now" path
// (docs/08-build-phases.md Phase 5).

/** §9.7 — "roughly 96×96pt" for the primary instance. */
const MASCOT_SIZE = 96;
export default function TodayScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [journeys, setJourneys] = useState<Journey[] | null>(null);
  // §9.1 (2026-07-21) — fetched once here rather than inside RightNowCard.
  // Since 2026-08-05 this is also what publishes the app-wide ambient mood
  // (useRightNow → useAmbientWeatherStore), so `theme` above already *is*
  // this reading's mood — no separate screen-level weather theme needed.
  const rightNow = useRightNow();
  // Date.now() is impure to call during render — a useState lazy
  // initializer (react-hooks/purity) only runs once at mount.
  const [nowMs] = useState(() => Date.now());
  // §13.9's greeting fires "on screen focus/mount". Mount is the component's
  // own business, but focus isn't: React Navigation keeps this tab mounted,
  // so coming back to it from Plan would otherwise be silent. Bumped inside
  // the existing focus effect rather than a second one.
  const [focusCount, setFocusCount] = useState(0);
  // A hop is motion, however short, so reduce motion pins him to the first card.
  const reduceMotion = useReduceMotion();
  const garments = rightNow.recommendation ? mascotGarmentFills(rightNow.recommendation.signals) : undefined;
  // The umbrella is the whole difference between a character 75px tall and a
  // box 116px tall, so what the screen owes him is asked for per render rather
  // than reserved for his worst case.
  const hasUmbrella = garments?.umbrella !== undefined;
  const clearance = mascotClearance(MASCOT_SIZE, hasUmbrella);
  // What each perch adds above itself while he is standing on it, and gives
  // back when he leaves — see useMascotPerches.
  //
  // 0: the top card. Nothing is above it, so he needs the lot.
  // 1: the hourly card, whose top-right corner he stands on. Above that corner
  //    is the "Right now" card's own bottom right, which holds nothing (its
  //    "as of" stamp is bottom left), so most of him overlaps empty card and
  //    only this much has to be real gap. Measured, not chosen: at SPACING.sm
  //    his hat brim clipped the last 14px of the gear chip row, and SPACING.xxl
  //    cleared it by 2px. The open umbrella then reached a further 26px up and
  //    56px further left, which is the 28 on top of it.
  // 2: the first journey card. The "Planned journeys" label above it is short
  //    and left-aligned, and he stands right — he already fits.
  const rooms = useMemo(
    () => [clearance, hasUmbrella ? SPACING.xxxl + SPACING.xl : SPACING.xxl, 0],
    [clearance, hasUmbrella]
  );
  const {
    stackRef,
    scrollRef,
    perchProps,
    onScroll: onMascotScroll,
    target: mascotPerch,
  } = useMascotPerches(clearance, reduceMotion, rooms);

  useFocusEffect(
    useCallback(() => {
      setFocusCount((n) => n + 1);
      materializeTodaysJourneys().then(setJourneys);
    }, [])
  );

  function openJourney(id: string) {
    navigation.navigate("JourneyDetail", { journeyId: id });
  }

  // §4.2 — "Leaving now" does two jobs: cancel the scheduled leave-by
  // notification (redundant the moment you're actually leaving) and open
  // Journey Detail. Phase 22 adds the third: open it already following, so
  // the tap goes straight from "I'm heading out" to a live map.
  function startJourney(id: string) {
    cancelLeaveByNotification(id).catch(() => {
      // Nothing scheduled, or notifications unavailable — the navigation
      // below is the part that matters.
    });
    navigation.navigate("JourneyDetail", { journeyId: id, journeyMode: true });
  }

  // §4.2 — the nearest *upcoming* departure gets the "Leaving now" action,
  // not just the first journey in the list (which may already be running
  // or past).
  const nextUpId = journeys
    ?.filter((j) => new Date(j.departTime).getTime() > nowMs)
    .sort((a, b) => new Date(a.departTime).getTime() - new Date(b.departTime).getTime())[0]?.id;

  return (
    <ScreenSurface>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={onMascotScroll}
        scrollEventThrottle={16}
        // Manual refresh for when the "as of" stamp looks older than the user
        // wants to trust. The automatic cadence in useRightNow is matched to
        // how often Open-Meteo's models actually publish, so this exists to
        // give the user a way to override that judgement, not to compensate
        // for it.
        refreshControl={
          <RefreshControl
            refreshing={rightNow.refreshing}
            onRefresh={rightNow.refresh}
            tintColor={theme.textSecondary}
            colors={[theme.accentWalk]}
          />
        }
      >
        {/* One positioning context for the mascot and every card he can stand
            on, so `onLayout` coordinates and his own absolute offset share an
            origin. The stack carries no padding of its own — that stays on the
            scroll content — or the two would disagree by exactly that much. */}
        <View ref={stackRef} style={styles.stack}>
          {/* Perch 0. The only spot on this screen with genuinely empty space
              above it, which is why it is the one he stands centred on — and
              the room for it comes and goes with him, so the card sits at the
              top of the screen like any other when he is further down. */}
          <View {...perchProps(0, "center")}>
            <RightNowCard {...rightNow} />
          </View>

          {/* Perch 1 — the hourly card's top-right corner, where he clips a
              corner of empty card rather than any text. */}
          <View {...perchProps(1, "right")}>
            <LocalForecastCard
              suburb={rightNow.suburb}
              hourly={rightNow.hourly}
              daily={rightNow.daily}
            />
          </View>

          <SetupChecklist />

          {/* Everything above is about the weather where you are; everything
              below is about trips you've planned. Without a heading the first
              journey card just carried on from the forecast stack as one
              undifferentiated run of cards. */}
          {journeys !== null && (
            <View style={styles.journeysSection}>
              <Text style={styles.sectionLabel} accessibilityRole="header">
                Planned journeys
              </Text>
              {journeys.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.empty}>No journeys yet — plan your first one</Text>
                </View>
              ) : (
                journeys.map((journey, i) => {
                  const card = (
                    <JourneyCard
                      journey={journey}
                      isNextUp={journey.id === nextUpId}
                      theme={theme}
                      onPress={() => openJourney(journey.id)}
                      onLeavingNow={() => startJourney(journey.id)}
                    />
                  );
                  // Perch 2 — the bottom of his range, and the one that reads
                  // as solid ground: real card, real top edge, feet on it.
                  // Only the first card. Every journey card would give him a
                  // perch whose body lands on the *departure time* of the card
                  // above, which sits top-right exactly where he'd stand.
                  return i === 0 ? (
                    <View key={journey.id} {...perchProps(2, "right")}>
                      {card}
                    </View>
                  ) : (
                    <View key={journey.id}>{card}</View>
                  );
                })
              )}
            </View>
          )}

          {/* Last child on purpose: painted after every card, so his feet land
              *on* the surface rather than under it. As a sibling earlier in the
              stack the next card's background covered them and he read as sunk
              into it. */}
          <PerchedMascot
            size={MASCOT_SIZE}
            state={rightNow.recommendation ? mascotStateFor(rightNow.recommendation.signals) : MASCOT_IDLE}
            greetToken={focusCount}
            target={mascotPerch}
            instant={reduceMotion}
            garments={garments}
          />
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    content: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    stack: { position: "relative" },
    journeysSection: { marginTop: SPACING.sm },
    sectionLabel: { ...TYPE.eyebrow, color: theme.textSecondary, marginBottom: SPACING.sm },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl * 2 },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
  });
}

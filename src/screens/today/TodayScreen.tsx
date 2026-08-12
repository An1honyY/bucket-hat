import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { materializeTodaysJourneys } from "../../lib/materializeToday";
import { useRightNow } from "../../lib/useRightNow";
import { cancelLeaveByNotification } from "../../lib/notifications";
import type { RootStackParamList } from "../../navigation/types";
import type { Journey } from "../../types";
import RightNowCard from "./RightNowCard";
import { mascotFeetOffset, useReduceMotion } from "../../components/mascot/Mascot";
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
  const { stackRef, perchProps, onScroll: onMascotScroll, target: mascotPerch } = useMascotPerches(MASCOT_SIZE, reduceMotion);

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
          {/* The room he stands in. Reserved rather than created by his own
              layout, because he is positioned over the stack now, not in it —
              see useMascotPerches for why. */}
          <View style={styles.perchClearance} />

          {/* Perch 0. The only spot on this screen with genuinely empty space
              above it, which is why it is the one he stands centred on. */}
          <View {...perchProps(0, "center")}>
            <RightNowCard {...rightNow} />
          </View>

          {/* Perch 1 — the hourly card's top-right corner. Above it is the
              "Right now" card's bottom right, which holds nothing (its "as of"
              stamp is bottom left), so he clips a corner of empty card rather
              than any text. The small top margin is the "tiny bit" of room
              that corner wants; an umbrella overhead would need considerably
              more, and this is where to add it. */}
          <View {...perchProps(1, "right")} style={styles.forecastPerch}>
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
            garments={rightNow.recommendation ? mascotGarmentFills(rightNow.recommendation.signals) : undefined}
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
    perchClearance: { height: mascotFeetOffset(MASCOT_SIZE) },
    journeysSection: { marginTop: SPACING.sm },
    // The one place the layout gives the mascot room rather than the other way
    // round, and deliberately small: he perches on this card's top-right
    // corner, and a corner only needs a little air. The big reserved band is
    // `perchClearance` above the first card; nothing else pays for him.
    //
    // Sized by measurement, not taste: at SPACING.sm his hat brim clipped the
    // last 14px of the "Right now" card's bottom gear chip, whose row wraps to
    // the full width. This clears it by 2px. An umbrella overhead would need
    // considerably more, and this is the line to change for it.
    forecastPerch: { marginTop: SPACING.xxl },
    sectionLabel: { ...TYPE.eyebrow, color: theme.textSecondary, marginBottom: SPACING.sm },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl * 2 },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
  });
}

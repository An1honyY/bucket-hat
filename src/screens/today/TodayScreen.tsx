import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { materializeTodaysJourneys } from "../../lib/materializeToday";
import { useRightNow } from "../../lib/useRightNow";
import { cancelLeaveByNotification } from "../../lib/notifications";
import type { RootStackParamList } from "../../navigation/types";
import type { Journey } from "../../types";
import RightNowCard from "./RightNowCard";
import LocalForecastCard from "./LocalForecastCard";
import JourneyCard from "./JourneyCard";
import SetupChecklist from "./SetupChecklist";
import ScreenPattern from "../../components/ScreenPattern";
import useTheme from "../../theme/useTheme";
import useWeatherTheme from "../../theme/useWeatherTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";

// Home/dashboard tab — docs/04-screens-navigation.md item 1, wired to real
// recurring-journey materialization and the reduced "Right now" path
// (docs/08-build-phases.md Phase 5).
export default function TodayScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [journeys, setJourneys] = useState<Journey[] | null>(null);
  // §9.1 (2026-07-21) — fetched once here rather than inside RightNowCard,
  // so its weather reading can also drive JourneyCard's weather-reactive
  // theme below — one screen-wide mood, not each card resolving its own.
  const rightNow = useRightNow();
  const weatherTheme = useWeatherTheme(rightNow.weather);
  // Date.now() is impure to call during render — a useState lazy
  // initializer (react-hooks/purity) only runs once at mount.
  const [nowMs] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
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
    <SafeAreaView style={styles.container}>
      <ScreenPattern tint={weatherTheme.patternTint} />
      <ScrollView
        contentContainerStyle={styles.content}
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
            colors={[weatherTheme.accentWalk]}
          />
        }
      >
        <RightNowCard {...rightNow} />

        <LocalForecastCard
          suburb={rightNow.suburb}
          hourly={rightNow.hourly}
          daily={rightNow.daily}
          weather={rightNow.weather}
        />

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
              journeys.map((journey) => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  isNextUp={journey.id === nextUpId}
                  theme={weatherTheme}
                  onPress={() => openJourney(journey.id)}
                  onLeavingNow={() => startJourney(journey.id)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    journeysSection: { marginTop: SPACING.sm },
    sectionLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textSecondary, marginBottom: SPACING.sm },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl * 2 },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center" },
  });
}

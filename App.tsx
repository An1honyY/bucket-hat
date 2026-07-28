import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDb } from "./src/db";
import { getThemePreference, getTimeFormatPreference, isOnboardingCompleted } from "./src/db/repositories/settings";
import { listUpcomingJourneys } from "./src/db/repositories/journeys";
import RootNavigator from "./src/navigation/RootNavigator";
import { withTimeout } from "./src/lib/withTimeout";
import { freezeJourneyByIdIfDue } from "./src/lib/leaveBy";
import { runCalibrationDecayIfDue } from "./src/lib/calibration";
import { checkForecastDrift } from "./src/lib/forecastDrift";
import { syncNow } from "./src/lib/sync/runSyncNow";
import { initCrashReportingIfEnabled } from "./src/lib/crashReporting";
import { useThemeStore } from "./src/theme/useThemeStore";
import { useTimeFormatStore } from "./src/lib/useTimeFormatStore";

// §5.2 — same-day journeys get re-checked at 3h/30min out; this foreground
// supplement instead just covers "anything departing soon enough that a
// stale forecast plausibly matters," independent of exact lead time.
const FOREGROUND_DRIFT_WINDOW_HOURS = 24;

// docs/13-extended-features.md §13.7's "periodic background sync". Five
// minutes is frequent enough that switching devices mid-session feels
// current, and rare enough to stay far inside the Worker's free-tier
// request budget even with several devices open all day.
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

const queryClient = new QueryClient();

export default function App() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Guard the DB-dependent startup steps with a timeout so the app still
    // renders rather than spinning forever if getDb() never resolves — a
    // defense-in-depth backstop (see withTimeout.ts); the wasm bundling bug
    // that used to make this hang on every web load is now fixed in
    // metro.config.js (DECISIONS.md).
    withTimeout(getDb(), null)
      .then(() => withTimeout(isOnboardingCompleted(), false))
      .then((completed) => setNeedsOnboarding(!completed))
      .finally(() => setReady(true));
    // §9.1 — load the persisted theme preference into the in-memory store
    // once at startup; Settings writes both the DB row and the store on
    // every change, so this is the only cold-start read needed.
    withTimeout(getThemePreference(), "system").then((preference) =>
      useThemeStore.getState().setThemePreference(preference)
    );
    // Same pattern for the 12h/24h time format preference.
    withTimeout(getTimeFormatPreference(), "12h").then((preference) =>
      useTimeFormatStore.getState().setTimeFormatPreference(preference)
    );
    // §10.5 — only initializes the provider when the stored preference is
    // already true (set during onboarding or a prior Settings visit); a
    // fresh install with the setting still at its default stays fully off.
    initCrashReportingIfEnabled().catch(() => {});
  }, []);

  useEffect(() => {
    // §7.3/§3 — the same moment a leave-by notification actually fires is
    // when RecommendationSnapshot gets frozen and recordWear() runs. This
    // only catches delivery while the app process is alive (foreground or
    // backgrounded) — Journey Detail's freezeIfDue() fallback (src/lib/leaveBy.ts)
    // covers the case where the app was fully killed and this listener
    // never ran (see DECISIONS.md).
    try {
      const subscription = Notifications.addNotificationReceivedListener((notification) => {
        const journeyId = notification.request.content.data?.journeyId;
        if (typeof journeyId === "string") {
          freezeJourneyByIdIfDue(journeyId).catch(() => {});
        }
      });
      return () => subscription.remove();
    } catch {
      // expo-notifications' listener APIs aren't supported on every
      // platform (e.g. web) — Journey Detail's freezeIfDue() fallback still
      // covers the freeze/recordWear path there.
      return undefined;
    }
  }, []);

  useEffect(() => {
    // §7.5.3/§5.2 — "run the check on app foreground." Runs once on mount
    // (covers cold start) and again on every background->active transition;
    // never blocks rendering, and each piece independently swallows its own
    // errors so one failing journey/check can't take down the others.
    async function runForegroundChecks() {
      runCalibrationDecayIfDue().catch(() => {});
      // docs/13-extended-features.md §13.7 — "pull remote changes on
      // foreground + a periodic background sync." Deliberately not
      // awaited: sync is a background reconciliation against SQLite, which
      // is already the source of truth for everything on screen, so
      // nothing here should ever delay a render. syncNow() is a no-op when
      // signed out or unconfigured, and de-duplicates overlapping runs
      // itself, so this is safe to call unconditionally.
      syncNow().catch(() => {});
      try {
        const upcoming = await listUpcomingJourneys(FOREGROUND_DRIFT_WINDOW_HOURS);
        for (const journey of upcoming) {
          await checkForecastDrift(journey).catch(() => {});
        }
      } catch {
        // no DB yet, or the query failed — next foreground transition retries
      }
    }

    runForegroundChecks();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") runForegroundChecks();
    });

    // The "periodic" half of §13.7. A timer rather than an OS background
    // task, matching the precedent already set for leave-by notifications
    // and forecast drift (DECISIONS.md, 2026-07-21): those deliberately
    // run foreground-only because the background-task work needs
    // expo-dev-client. This covers the real case — a device left open on
    // the Today tab while another device is being edited — without that
    // native investment. Revisit alongside whichever phase adds it.
    const timer = setInterval(() => {
      syncNow().catch(() => {});
    }, SYNC_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator needsOnboarding={needsOnboarding} />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

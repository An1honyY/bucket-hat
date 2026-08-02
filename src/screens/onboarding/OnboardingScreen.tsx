import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setDefaultLocation, setOnboardingCompleted } from "../../db/repositories/settings";
import { withTimeout } from "../../lib/withTimeout";
import type { RootStackParamList } from "../../navigation/types";
import Step0Welcome from "./steps/Step0Welcome";
import Step1Location from "./steps/Step1Location";

// First-run flow — docs/04-screens-navigation.md §4.1 (2026-07-21 minimal-
// onboarding rework, see DECISIONS.md). Previously a 6-step wizard
// (location permission, Home/Work, live demo, gear basics, crash
// reporting, notifications); the rework cut it to a single "where are
// you?" step so a user reaches a working app — real current-location
// weather and generic gear suggestions — with the absolute minimum
// friction. Everything else (Home/Work, real gear, notifications) lives on
// the postponable SetupChecklist on Today rather than blocking first
// launch.
//
// 2026-08-02 puts a welcome screen in front of that step. It asks for
// nothing and doesn't reopen the wizard question: the flow is still one
// required step, with an introduction that names the app and says what it
// does before the first request for anything. Signing in is offered here
// and nowhere else in onboarding, always as a side door — it returns
// straight back to this step, because an account restores gear and places
// (§13.7) but not a default location, which is device-local.
type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export default function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState<"welcome" | "location">("welcome");

  async function finish(location: { lat: number; lng: number; label: string } | undefined) {
    const jobs: Promise<unknown>[] = [setOnboardingCompleted()];
    if (location) jobs.push(setDefaultLocation(location));
    await withTimeout(Promise.all(jobs), []);
    // reset, not navigate — onboarding shouldn't be reachable via back-nav
    // once finished.
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }

  return (
    <SafeAreaView style={styles.container}>
      {step === "welcome" ? (
        <Step0Welcome
          onGetStarted={() => setStep("location")}
          onSignIn={() => navigation.navigate("Auth", { context: "onboarding", mode: "sign-in" })}
        />
      ) : (
        <Step1Location onDone={finish} onBack={() => setStep("welcome")} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { storeSession } from "../../db/repositories/syncState";
import { getServerCapabilities, isAuthConfigured, signIn, signUp } from "../../services/authService";
import { syncNow } from "../../lib/sync/runSyncNow";
import { showAlert } from "../../lib/crossPlatformAlert";
import { AUTH_ERROR_COPY } from "../../lib/auth/errorCopy";
import { confirmationProblem, emailProblem, passwordProblem, MIN_PASSWORD_LENGTH } from "../../lib/auth/credentials";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { RootStackParamList } from "../../navigation/types";
import { AuthField, AuthLayout, ErrorNote, getStyles as getSharedStyles, LinkButton, LocalFirstNote, PrimaryButton } from "./authUi";
import { selectedChipStyle, selectedChipLabelStyle } from "../../theme/commonStyles";

// docs/13-extended-features.md §13.7 — sign in / create account, promoted
// out of Settings → Sync & account (2026-08-02) into its own screen so
// onboarding can offer it too.
//
// The screen is written to be declinable at every point. An account here
// buys exactly one thing — the same data on a second device — and the copy
// says so plainly rather than implying the app needs one, because it
// doesn't: SQLite is the source of truth signed in or out
// (docs/13-extended-features.md §13.7, "local-first stays true").

type Mode = "sign-in" | "sign-up";
type Props = NativeStackScreenProps<RootStackParamList, "Auth">;

export default function AuthScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const shared = getSharedStyles(theme);
  const styles = getStyles(theme);
  // Set when the screen is reached from onboarding rather than Settings —
  // the only difference is the way out ("Not now" vs. the header's back).
  const fromOnboarding = route.params?.context === "onboarding";

  const [mode, setMode] = useState<Mode>(route.params?.mode === "sign-up" ? "sign-up" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // Optimistic: the link shows until the server says it can't send email.
  // A failed capability check leaves it visible, which is the pre-2026-08-02
  // behaviour and no worse — the request itself reports the truth.
  const [resetOffered, setResetOffered] = useState(true);

  useEffect(() => {
    let active = true;
    getServerCapabilities().then((result) => {
      if (active && "data" in result) setResetOffered(result.data.passwordReset);
    });
    return () => {
      active = false;
    };
  }, []);

  const signingUp = mode === "sign-up";
  // Problems are computed always but only rendered after a submit attempt:
  // marking a field invalid while someone is still typing their address the
  // first time is noise, not help.
  const problems = {
    email: emailProblem(email),
    password: signingUp ? passwordProblem(password) : password.length === 0 ? "Enter your password." : undefined,
    confirmation: signingUp ? confirmationProblem(password, confirmation) : undefined,
  };
  const blocked = Boolean(problems.email || problems.password || problems.confirmation);

  function switchMode(next: Mode) {
    setMode(next);
    setSubmitted(false);
    setError(undefined);
    setConfirmation("");
  }

  /** Back to wherever this was opened from, or Today if it opened cold. */
  function leave() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }

  async function handleSubmit() {
    setSubmitted(true);
    if (blocked) return;

    setBusy(true);
    setError(undefined);
    const trimmed = email.trim();
    const result = signingUp ? await signUp(trimmed, password) : await signIn(trimmed, password);

    if ("error" in result) {
      setError(AUTH_ERROR_COPY[result.error]);
      setBusy(false);
      return;
    }

    // §13.7's "migration for existing users": whatever is already on this
    // device gets pushed on the first sync, because the watermarks start
    // empty and collectLocalChanges() therefore offers up every row. It's
    // a merge rather than a blind upload if the account already holds data
    // from another device — last-write-wins settles any overlap.
    await storeSession({
      token: result.data.token,
      accountId: result.data.account.id,
      email: result.data.account.email,
    });
    setPassword("");
    setConfirmation("");

    const outcome = await syncNow();
    setBusy(false);
    if (outcome.status === "failed") {
      showAlert("Signed in", "Signed in, but the first sync didn't finish. It'll retry automatically.");
    }
    leave();
  }

  if (!isAuthConfigured()) {
    return (
      <AuthLayout
        title="Sync isn't set up in this build"
        subtitle="Nothing else changes — your gear, places and journeys are stored on this device and the app works exactly as it does with an account."
      >
        <Text style={styles.body}>
          Accounts need a sync server to talk to. Point the app at one with EXPO_PUBLIC_SYNC_API_URL — worker/SETUP.md
          has the steps.
        </Text>
        <PrimaryButton label={fromOnboarding ? "Keep going without one" : "Back"} onPress={leave} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={signingUp ? "Create an account" : "Welcome back"}
      subtitle={
        signingUp
          ? "One account keeps your gear, places and journeys in step across your phone and computer."
          : "Sign in to pick up your gear, places and journeys on this device."
      }
      footer={
        <View style={styles.footer}>
          {fromOnboarding ? <LinkButton label="Not now — keep going without an account" onPress={leave} /> : null}
          <LocalFirstNote>
            Bucket Hat works fully offline on this device. An account only adds syncing — it never becomes a
            requirement, and signing out leaves everything here.
          </LocalFirstNote>
        </View>
      }
    >
      <View style={styles.segmentRow}>
        {(["sign-in", "sign-up"] as const).map((option) => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => switchMode(option)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {option === "sign-in" ? "Sign in" : "Create account"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        problem={submitted ? problems.email : undefined}
      />

      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secure
        placeholder={signingUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : "Your password"}
        textContentType={signingUp ? "newPassword" : "password"}
        problem={submitted ? problems.password : undefined}
        hint={signingUp ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
      />

      {signingUp ? (
        <AuthField
          label="Confirm password"
          value={confirmation}
          onChangeText={setConfirmation}
          secure
          placeholder="Type it again"
          textContentType="newPassword"
          problem={submitted ? problems.confirmation : undefined}
        />
      ) : null}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <PrimaryButton
        label={signingUp ? "Create account" : "Sign in"}
        onPress={handleSubmit}
        busy={busy}
        disabled={submitted && blocked}
      />

      {!signingUp && resetOffered ? (
        <LinkButton label="Forgot your password?" onPress={() => navigation.navigate("ForgotPassword")} />
      ) : null}
      {!signingUp && !resetOffered ? (
        <Text style={shared.localFirst}>
          This server can&apos;t send reset emails, so there&apos;s no way to recover a lost password — keep it
          somewhere safe.
        </Text>
      ) : null}
    </AuthLayout>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    body: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 19 },
    footer: { marginTop: SPACING.md },
    segmentRow: { flexDirection: "row", gap: SPACING.sm },
    segment: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 10,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: selectedChipStyle(theme),
    segmentLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
    segmentLabelActive: selectedChipLabelStyle(theme),
  });
}

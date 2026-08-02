import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { resetPassword } from "../../services/authService";
import { clearResetTokenFromUrl } from "../../lib/auth/resetLink";
import { confirmationProblem, passwordProblem, MIN_PASSWORD_LENGTH } from "../../lib/auth/credentials";
import { AUTH_ERROR_COPY } from "../../lib/auth/errorCopy";
import { isOnboardingCompleted } from "../../db/repositories/settings";
import useTheme from "../../theme/useTheme";
import { SPACING, TYPE } from "../../theme/typography";
import type { RootStackParamList } from "../../navigation/types";
import { AuthField, AuthLayout, ErrorNote, LinkButton, LocalFirstNote, PrimaryButton } from "./authUi";

// Step two of account retrieval (2026-08-02). Reached three ways: the
// emailed link (web — RootNavigator hands the token straight in), the
// "I have a code" buttons on the forgot-password screen, and a cold open
// of that same link on a device where onboarding hasn't been finished.
//
// The token stays an editable field even when it arrived automatically.
// Someone reading the email on a laptop and fixing their phone is the
// normal case for a phone-first app, and a hidden param would leave them
// with no way through.
type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [token, setToken] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>(
    // The server redirects here with ?error= rather than a token when the
    // link is stale, so say that immediately instead of waiting for a
    // submit that was never going to work.
    route.params?.expired ? AUTH_ERROR_COPY["invalid-token"] : undefined
  );

  useEffect(() => {
    // The value is in state now; leaving it in the address bar only risks
    // it being refreshed, bookmarked or shoulder-read later.
    clearResetTokenFromUrl();
  }, []);

  const problems = {
    token: token.trim().length === 0 ? "Paste the code from the email." : undefined,
    password: passwordProblem(password),
    confirmation: confirmationProblem(password, confirmation),
  };
  const blocked = Boolean(problems.token || problems.password || problems.confirmation);

  async function handleSubmit() {
    setSubmitted(true);
    if (blocked) return;

    setBusy(true);
    setError(undefined);
    const result = await resetPassword(token.trim(), password);
    setBusy(false);
    if ("error" in result) {
      setError(AUTH_ERROR_COPY[result.error]);
      return;
    }
    setPassword("");
    setConfirmation("");
    setDone(true);
  }

  /**
   * Where "done" leads. Usually straight back to the sign-in screen that
   * sent us here; on a cold open of the emailed link there's no stack to
   * return to, so fall back to whichever screen this install would
   * normally have started on rather than dropping someone who hasn't
   * finished onboarding into the tabs.
   */
  async function goOn() {
    if (navigation.canGoBack()) {
      navigation.navigate("Auth", { context: "settings", mode: "sign-in" });
      return;
    }
    const completed = await isOnboardingCompleted().catch(() => true);
    navigation.reset({ index: 0, routes: [{ name: completed ? "Main" : "Onboarding" }] });
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="Sign in with your new password and syncing picks up where it left off.">
        <Text style={styles.body}>Any other devices stay signed in — this doesn&apos;t sign them out.</Text>
        <PrimaryButton label="Sign in" onPress={goOn} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Paste the code from the reset email, then pick something new."
      footer={
        <View style={styles.footer}>
          <LinkButton label="Back to sign in" onPress={goOn} />
          <LocalFirstNote>
            This only affects syncing. Everything already on this device is untouched either way.
          </LocalFirstNote>
        </View>
      }
    >
      <AuthField
        label="Reset code"
        value={token}
        onChangeText={setToken}
        placeholder="The code from your email"
        problem={submitted ? problems.token : undefined}
        hint={route.params?.token ? "Filled in from your reset link." : undefined}
      />
      <AuthField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secure
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        textContentType="newPassword"
        problem={submitted ? problems.password : undefined}
      />
      <AuthField
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        secure
        placeholder="Type it again"
        textContentType="newPassword"
        problem={submitted ? problems.confirmation : undefined}
      />
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <PrimaryButton label="Set new password" onPress={handleSubmit} busy={busy} disabled={submitted && blocked} />
    </AuthLayout>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    body: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 19 },
    footer: { marginTop: SPACING.md },
  });
}

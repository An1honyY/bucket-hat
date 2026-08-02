import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { requestPasswordReset } from "../../services/authService";
import { syncApiBase } from "../../services/syncApiBase";
import { resetRedirectUrl } from "../../lib/auth/resetLink";
import { emailProblem } from "../../lib/auth/credentials";
import { AUTH_ERROR_COPY } from "../../lib/auth/errorCopy";
import useTheme from "../../theme/useTheme";
import { SPACING, TYPE } from "../../theme/typography";
import type { RootStackParamList } from "../../navigation/types";
import { AuthField, AuthLayout, ErrorNote, LinkButton, LocalFirstNote, PrimaryButton } from "./authUi";

// Step one of account retrieval (2026-08-02): ask the server to mail a
// reset link. See worker/src/auth.ts for why this exists at all, given
// §13.7 originally chose a stack without it.
//
// The confirmation is deliberately non-committal about whether that email
// had an account — a form that answers "no such user" is a way to test
// which addresses are registered, and the honest phrasing costs nothing
// here.
type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const problem = emailProblem(email);

  async function handleSubmit() {
    setSubmitted(true);
    if (problem) return;

    setBusy(true);
    setError(undefined);
    const result = await requestPasswordReset(email.trim(), resetRedirectUrl(syncApiBase()));
    setBusy(false);
    if ("error" in result) {
      setError(AUTH_ERROR_COPY[result.error]);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`If there's an account for ${email.trim()}, a reset link is on its way.`}
      >
        <Text style={styles.body}>
          The link opens a page where you can set a new password. It also carries a code you can type in here instead,
          if you read the email on another device.
        </Text>
        <Text style={styles.body}>Both stop working in an hour.</Text>
        {/* The empty token is deliberate, not noise: on web the reset
            screen carries an `initialParams` token from the emailed link,
            and React Navigation merges those into every later push of the
            same route. Passing "" is what stops a spent token following
            the user back here. */}
        <PrimaryButton label="I have a code" onPress={() => navigation.navigate("ResetPassword", { token: "" })} />
        <LinkButton
          label="Send it again"
          onPress={() => {
            setSent(false);
            setSubmitted(false);
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Tell us the email on the account and we'll send a link to set a new password."
      footer={
        <View style={styles.footer}>
          <LinkButton label="Back to sign in" onPress={() => navigation.goBack()} />
          <LocalFirstNote>
            Nothing on this device depends on getting back in — your gear, places and journeys are all still here.
          </LocalFirstNote>
        </View>
      }
    >
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoFocus
        problem={submitted ? problem : undefined}
      />
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <PrimaryButton label="Send reset link" onPress={handleSubmit} busy={busy} disabled={submitted && Boolean(problem)} />
      <LinkButton label="I already have a code" onPress={() => navigation.navigate("ResetPassword", { token: "" })} />
    </AuthLayout>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    body: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 19 },
    footer: { marginTop: SPACING.md },
  });
}

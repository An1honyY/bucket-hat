// docs/13-extended-features.md §13.7 — the account and sync surface.
//
// Kept deliberately small. Sync is meant to be invisible when it's
// working (§13.7: "a background reconciliation"), so this screen exists to
// answer three questions and nothing more: am I signed in, did it work,
// and how do I stop. There's no conflict UI because last-write-wins never
// asks the user anything, and no "sync progress" beyond a last-synced
// stamp because a spinner on data that's already on-screen from SQLite
// would imply the app was waiting on the network, which it never is.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  clearSyncState,
  getLastSyncedAt,
  getStoredSession,
  storeSession,
  type StoredSession,
} from "../../db/repositories/syncState";
import { isAuthConfigured, signIn, signOut, signUp, type AuthError } from "../../services/authService";
import { syncNow } from "../../lib/sync/runSyncNow";
import { clearRemotePhotoCache } from "../../lib/sync/remotePhotoCache";
import { showAlert } from "../../lib/crossPlatformAlert";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

const AUTH_ERROR_COPY: Record<AuthError, string> = {
  network: "Couldn't reach the sync service. Your data is safe on this device — try again when you're back online.",
  unreachable: "The sync service didn't respond as expected. Try again in a moment.",
  "invalid-credentials": "That email and password don't match an account.",
  "email-taken": "There's already an account with that email. Try signing in instead.",
  "weak-password": "Pick a longer password — at least 8 characters.",
  "not-configured": "Sync isn't set up in this build. See worker/SETUP.md.",
};

function formatLastSynced(iso: string | undefined): string {
  if (!iso) return "Not synced yet";
  const then = new Date(iso).getTime();
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `Synced on ${new Date(iso).toLocaleDateString()}`;
}

export default function AccountScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [session, setSession] = useState<StoredSession | undefined>(undefined);
  const [lastSynced, setLastSynced] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(() => {
    let active = true;
    (async () => {
      const [stored, syncedAt] = await Promise.all([getStoredSession(), getLastSyncedAt()]);
      if (!active) return;
      setSession(stored);
      setLastSynced(syncedAt);
    })();
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(refresh);

  async function handleSubmit() {
    setBusy(true);
    setError(undefined);
    const result = mode === "sign-up" ? await signUp(email.trim(), password) : await signIn(email.trim(), password);

    if ("error" in result) {
      setError(AUTH_ERROR_COPY[result.error]);
      setBusy(false);
      return;
    }

    // §13.7's "migration for existing users": whatever is already on this
    // device gets pushed on the first sync, because the watermarks start
    // empty and collectLocalChanges() therefore offers up every row. It's
    // a merge rather than a blind upload if the account already holds
    // data from another device — last-write-wins settles any overlap.
    await storeSession({
      token: result.data.token,
      accountId: result.data.account.id,
      email: result.data.account.email,
    });
    setPassword("");

    const outcome = await syncNow();
    setBusy(false);
    refresh();

    if (outcome.status === "failed") {
      showAlert("Signed in", "Signed in, but the first sync didn't finish. It'll retry automatically.");
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    const outcome = await syncNow();
    setBusy(false);
    refresh();
    if (outcome.status === "failed") {
      showAlert("Sync failed", AUTH_ERROR_COPY[outcome.error === "unauthorized" ? "invalid-credentials" : "network"]);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    if (session) await signOut(session.token);
    // Cleared regardless of whether the server call succeeded — see the
    // note in authService.signOut().
    await clearSyncState();
    // Web keeps fetched gear photos as blob: URLs in memory; those belong
    // to the account that just signed out and must not stay renderable.
    clearRemotePhotoCache();
    setBusy(false);
    setSession(undefined);
    setLastSynced(undefined);
  }

  if (!isAuthConfigured()) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Sync</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.body}>
            Sync isn&apos;t configured in this build. Everything still works — your data is stored on this device.
          </Text>
          <Text style={styles.hint}>Set EXPO_PUBLIC_SYNC_API_URL to enable it. See worker/SETUP.md.</Text>
        </View>
      </ScrollView>
    );
  }

  if (session) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.email}>{session.email}</Text>
          <Text style={styles.body}>{formatLastSynced(lastSynced)}</Text>
          <Text style={styles.hint}>
            Your gear, places and journeys sync to your other devices. This device works normally offline — changes
            sync when you&apos;re back online.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              onPress={handleSyncNow}
              disabled={busy}
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator /> : <Text style={styles.buttonLabel}>Sync now</Text>}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleSignOut}
              disabled={busy}
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              <Text style={styles.buttonLabel}>Sign out</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Signing out leaves everything on this device — nothing is deleted.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Sync across devices</Text>
      <View style={styles.sectionCard}>
        <Text style={styles.body}>
          Sign in to keep your gear, places and journeys in step across your phone and computer. Everything keeps
          working on this device either way.
        </Text>

        <View style={styles.segmentRow}>
          {(["sign-in", "sign-up"] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => {
                setMode(option);
                setError(undefined);
              }}
              style={[styles.segment, mode === option && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, mode === option && styles.segmentLabelActive]}>
                {option === "sign-in" ? "Sign in" : "Create account"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType={mode === "sign-up" ? "newPassword" : "password"}
          placeholder="At least 8 characters"
          placeholderTextColor={theme.textSecondary}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleSubmit}
          disabled={busy || !email.trim() || !password}
          style={[styles.button, styles.primaryButton, (busy || !email.trim() || !password) && styles.buttonDisabled]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonLabel}>{mode === "sign-up" ? "Create account" : "Sign in"}</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          There&apos;s no password reset — if you lose it, create a new account and your existing data on this device
          uploads to it.
        </Text>
      </View>
    </ScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { padding: SPACING.xl, gap: 4, backgroundColor: theme.bg },
    sectionTitle: { ...TYPE.subtitle, fontSize: 15, marginBottom: SPACING.sm, color: theme.textPrimary },
    sectionCard: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      gap: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    email: { ...TYPE.subtitle, fontSize: 16, color: theme.textPrimary },
    body: { ...TYPE.caption, color: theme.textSecondary },
    hint: { ...TYPE.micro, fontSize: 12, color: theme.textSecondary },
    error: { ...TYPE.caption, color: theme.danger },
    label: { fontSize: 13, fontWeight: "600", marginTop: SPACING.md, color: theme.textPrimary },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.textPrimary,
      backgroundColor: theme.bg,
    },
    segmentRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
    },
    segmentActive: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk },
    segmentLabel: { fontSize: 13, color: theme.textPrimary },
    segmentLabelActive: { color: "#FFFFFF", fontWeight: "600" },
    buttonRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
    button: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 10,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButton: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk, marginTop: SPACING.md },
    primaryButtonLabel: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
    buttonDisabled: { opacity: 0.5 },
    buttonLabel: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
  });
}

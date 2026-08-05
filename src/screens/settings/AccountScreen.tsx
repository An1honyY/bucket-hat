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
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  clearSyncState,
  getLastSyncedAt,
  getStoredSession,
  type StoredSession,
} from "../../db/repositories/syncState";
import { isAuthConfigured, signOut } from "../../services/authService";
import { syncNow } from "../../lib/sync/runSyncNow";
import { clearRemotePhotoCache } from "../../lib/sync/remotePhotoCache";
import { showAlert } from "../../lib/crossPlatformAlert";
import { AUTH_ERROR_COPY } from "../../lib/auth/errorCopy";
import ScreenSurface from "../../components/ScreenSurface";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { RootStackParamList } from "../../navigation/types";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [session, setSession] = useState<StoredSession | undefined>(undefined);
  const [lastSynced, setLastSynced] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

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
      <ScreenSurface>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.sectionTitle}>Sync</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.body}>
              Sync isn&apos;t configured in this build. Everything still works — your data is stored on this device.
            </Text>
            <Text style={styles.hint}>Set EXPO_PUBLIC_SYNC_API_URL to enable it. See worker/SETUP.md.</Text>
          </View>
        </ScrollView>
      </ScreenSurface>
    );
  }

  if (session) {
    return (
      <ScreenSurface>
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
                style={[styles.button, styles.rowButton, busy && styles.buttonDisabled]}
              >
                {busy ? <ActivityIndicator /> : <Text style={styles.buttonLabel}>Sync now</Text>}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSignOut}
                disabled={busy}
                style={[styles.button, styles.rowButton, busy && styles.buttonDisabled]}
              >
                <Text style={styles.buttonLabel}>Sign out</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Signing out leaves everything on this device — nothing is deleted.</Text>
          </View>
        </ScrollView>
      </ScreenSurface>
    );
  }

  // The form itself lives in src/screens/auth/ (2026-08-02) — onboarding
  // offers signing in too, and two copies of the same fields is how the
  // two drift apart. What's left here is the part that's specific to
  // Settings: what an account is for, and the way in.
  return (
      <ScreenSurface>
        <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Sync across devices</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.body}>
            Sign in to keep your gear, places and journeys in step across your phone and computer. Everything keeps
            working on this device either way.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Auth", { context: "settings", mode: "sign-in" })}
            style={[styles.button, styles.primaryButton]}
          >
            <Text style={styles.primaryButtonLabel}>Sign in</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Auth", { context: "settings", mode: "sign-up" })}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Create an account</Text>
          </Pressable>

          <Text style={styles.hint}>
            Signing in merges what&apos;s on this device with whatever the account already holds — nothing here is
            overwritten or uploaded until you do.
          </Text>
        </View>
      </ScrollView>
      </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { padding: SPACING.xl, paddingBottom: SPACING.xxl * 2, gap: SPACING.xs, width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
    sectionTitle: { ...TYPE.subtitle, fontSize: 16, marginBottom: SPACING.sm, color: theme.textPrimary },
    sectionCard: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      gap: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    email: { ...TYPE.subtitle, fontSize: 16, color: theme.textPrimary },
    body: { ...TYPE.caption, color: theme.textSecondary },
    hint: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 18 },
    buttonRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
    button: {
      minHeight: 48,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    // Only the paired Sync now / Sign out controls share a row; the
    // signed-out buttons stack, and inheriting `flex: 1` there made each
    // one try to claim half the card's height.
    rowButton: { flex: 1 },
    primaryButton: { backgroundColor: theme.accentWalk, borderColor: theme.accentWalk, marginTop: SPACING.md },
    primaryButtonLabel: { ...TYPE.body, fontWeight: "700", color: "#FFFFFF" },
    buttonDisabled: { opacity: 0.5 },
    buttonLabel: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
  });
}

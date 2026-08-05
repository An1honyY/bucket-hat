import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LEAVE_BY_LEAD_MINUTES, requestNotificationPermission } from "../../lib/notifications";
import AppButton from "../../components/AppButton";
import ScreenSurface from "../../components/ScreenSurface";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";

// docs/07-recommendation-engine.md §7.3 — "request notification permission
// from the onboarding flow... not silently on app launch." Originally a
// forced onboarding step; now reached from the Today tab's SetupChecklist
// (2026-07-21 minimal-onboarding rework, see DECISIONS.md) — skip is still
// always an option, it just means "not now" rather than "not this step of
// onboarding."
interface Props {
  onDone: () => void;
}

export default function NotificationsSetup({ onDone }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [requesting, setRequesting] = useState(false);

  async function allow() {
    setRequesting(true);
    try {
      await requestNotificationPermission();
    } finally {
      setRequesting(false);
      onDone();
    }
  }

  return (
    <ScreenSurface edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Get a heads-up before you leave?</Text>
        <Text style={styles.body}>
          We&apos;ll send a reminder about {LEAVE_BY_LEAD_MINUTES} minutes before you need to leave, with a quick
          reminder of what to grab.
        </Text>
        <View style={styles.actions}>
          <AppButton label={requesting ? "Requesting…" : "Allow notifications"} onPress={allow} disabled={requesting} />
          <AppButton label="Not now" variant="ghost" size="sm" onPress={onDone} />
        </View>
      </View>
    </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: SPACING.xxl,
      gap: SPACING.md,
      width: "100%",
      maxWidth: CONTENT_MAX_WIDTH,
      alignSelf: "center",
    },
    title: { ...TYPE.title, color: theme.textPrimary },
    body: { ...TYPE.body, color: theme.textSecondary, lineHeight: 22 },
    actions: { marginTop: SPACING.xxl, gap: SPACING.xs },
  });
}

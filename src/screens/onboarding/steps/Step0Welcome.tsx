import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BrandMark from "../../../components/BrandMark";
import NavIcon, { type NavIconKind } from "../../../components/NavIcon";
import ScreenPattern from "../../../components/ScreenPattern";
import useTheme from "../../../theme/useTheme";
import { cardElevationStyle } from "../../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../../theme/typography";

// docs/04-screens-navigation.md §4.1 — the screen the app opens on, and
// for a lot of people the only one they'll judge it by.
//
// §4.1's single "where are you?" step is still the only thing onboarding
// asks for; this sits in front of it and asks for nothing. It exists
// because that step, reached cold, is a stranger requesting your location:
// the name and the point of the app have to land before the ask, not
// after. Everything here is one screenful, no carousel — three swipeable
// panels of marketing is the thing this deliberately isn't (§9.0:
// "glanceability wins").
//
// Voice per §9.0.1: plain, specific, no exclamation marks, and the
// promise the app actually keeps — your own gear by name, not "wear a
// coat."
interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const POINTS: { icon: NavIconKind; title: string; body: string }[] = [
  { icon: "plan", title: "Plan your trip", body: "Walk, drive, bus, train or bike." },
  { icon: "today", title: "Weather leg by leg", body: "Including the indoor stretches." },
  { icon: "gear", title: "Your own gear", body: "Your jacket, your shoes — by name." },
];

export default function Step0Welcome({ onGetStarted, onSignIn }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.screen}>
      <ScreenPattern />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <BrandMark size={72} />
          <Text style={styles.tagline}>Know what to wear before you head out.</Text>
        </View>

        <View style={styles.card}>
          {POINTS.map((point) => (
            <View key={point.title} style={styles.point}>
              <View style={styles.pointIcon}>
                <NavIcon kind={point.icon} size={20} color={theme.accentWalk} />
              </View>
              <View style={styles.pointText}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointBody}>{point.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onGetStarted} style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>Get started</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>I already have an account</Text>
          </Pressable>
          <Text style={styles.reassurance}>No account needed — sign in only to sync another device.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, padding: SPACING.xl, justifyContent: "center", gap: SPACING.xxl },
    hero: { alignItems: "center", gap: SPACING.lg },
    tagline: {
      ...TYPE.body,
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 23,
      maxWidth: 320,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      gap: SPACING.lg,
      ...cardElevationStyle(theme),
    },
    point: { flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" },
    pointIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.circle,
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.surfaceRaisedBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    pointText: { flex: 1, gap: 2 },
    pointTitle: { ...TYPE.subtitle, fontSize: 15, color: theme.textPrimary },
    pointBody: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 19 },
    actions: { gap: SPACING.xs },
    primaryButton: {
      minHeight: 50,
      borderRadius: RADIUS.pill,
      backgroundColor: theme.accentWalk,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryLabel: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
    secondaryButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
    secondaryLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    reassurance: {
      ...TYPE.micro,
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      marginTop: SPACING.xs,
    },
  });
}

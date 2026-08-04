import type { ReactNode } from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import BrandMark from "../../components/BrandMark";
import ScreenSurface from "../../components/ScreenSurface";
import useTheme from "../../theme/useTheme";
import { ACTION_MAX_WIDTH, CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { cardElevationStyle, type ThemeTokens } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";

// Shared furniture for the three auth screens (sign in / create account,
// forgot password, reset password), so they read as one flow rather than
// three forms that happen to be next to each other. Local to this folder on
// purpose: these are auth-shaped (a branded shell, labelled fields with an
// inline problem line, one full-width action), not general components the
// rest of the app should reach for.

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Sits below the card — secondary actions and the local-first reassurance. */
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: LayoutProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <ScreenSurface edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <BrandMark size={40} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.card}>{children}</View>
        {footer}
      </ScrollView>
    </ScreenSurface>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Shown under the field once the user has left it or tried to submit. */
  problem?: string;
  /** Extra guidance shown while the field is still fine. */
  hint?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  textContentType?: TextInputProps["textContentType"];
  autoFocus?: boolean;
  onBlur?: () => void;
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  problem,
  hint,
  secure = false,
  keyboardType,
  textContentType,
  autoFocus,
  onBlur,
}: FieldProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  // Reveal is a plain toggle rather than press-and-hold: on a phone in the
  // rain, a control you have to keep a thumb on is a control you can't use.
  const [revealed, setRevealed] = useState(false);
  // The border, not just the platform's own focus ring: on web that ring is
  // drawn on the inner input and reads as sitting on top of the field
  // rather than being it. Additive — the ring stays, since it's what
  // keyboard users actually track (§9.6).
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused ? styles.inputWrapFocused : undefined,
          problem ? styles.inputWrapProblem : undefined,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secure && !revealed}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoFocus={autoFocus}
          accessibilityLabel={label}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            style={styles.reveal}
          >
            <Text style={styles.revealLabel}>{revealed ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>
      {problem ? <Text style={styles.problem}>{problem}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, busy = false, disabled = false }: ButtonProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const inactive = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      onPress={onPress}
      disabled={inactive}
      style={[styles.primaryButton, inactive && styles.buttonDisabled]}
    >
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

export function LinkButton({ label, onPress, align = "center" }: { label: string; onPress: () => void; align?: "center" | "left" }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.linkButton, align === "left" && styles.linkLeft]}>
      <Text style={styles.linkLabel}>{label}</Text>
    </Pressable>
  );
}

/** A failure the user needs to read before trying again. */
export function ErrorNote({ children }: { children: string }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <View accessibilityLiveRegion="polite" style={styles.errorNote}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

/** The quiet line every auth screen carries: none of this is required. */
export function LocalFirstNote({ children }: { children: string }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return <Text style={styles.localFirst}>{children}</Text>;
}

export function getStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    scroll: {
      padding: SPACING.xl,
      paddingTop: SPACING.xxl,
      gap: SPACING.sm,
      flexGrow: 1,
      width: "100%",
      maxWidth: CONTENT_MAX_WIDTH,
      alignSelf: "center",
    },
    brand: { alignItems: "center", marginBottom: SPACING.lg },
    title: { ...TYPE.title, color: theme.textPrimary, textAlign: "center" },
    subtitle: { ...TYPE.body, color: theme.textSecondary, textAlign: "center", lineHeight: 21, marginBottom: SPACING.md },
    card: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      gap: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    field: { gap: 6, marginTop: SPACING.sm },
    label: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: RADIUS.pill,
      backgroundColor: theme.bg,
      paddingRight: SPACING.sm,
    },
    inputWrapFocused: { borderColor: theme.accentWalk },
    // Listed after the focus style so a field with a problem keeps saying
    // so while it's being corrected.
    inputWrapProblem: { borderColor: theme.danger },
    input: { flex: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, ...TYPE.body, color: theme.textPrimary, minHeight: 44 },
    reveal: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, minHeight: 44, justifyContent: "center" },
    revealLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    problem: { ...TYPE.caption, color: theme.danger },
    hint: { ...TYPE.micro, fontSize: 12, color: theme.textSecondary },
    primaryButton: {
      marginTop: SPACING.md,
      minHeight: 48,
      // §9.2 — an action stops reading as a button once it is wider than a
      // thumb's reach; see AppButton for the same cap everywhere else.
      width: "100%",
      maxWidth: ACTION_MAX_WIDTH,
      alignSelf: "center",
      borderRadius: RADIUS.pill,
      backgroundColor: theme.accentWalk,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryLabel: { ...TYPE.body, fontWeight: "700", color: "#FFFFFF" },
    buttonDisabled: { opacity: 0.5 },
    linkButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: SPACING.sm },
    linkLeft: { alignItems: "flex-start" },
    linkLabel: { ...TYPE.caption, fontWeight: "600", color: theme.accentWalk },
    errorNote: {
      marginTop: SPACING.sm,
      padding: SPACING.md,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.danger,
      backgroundColor: theme.bg,
    },
    errorText: { ...TYPE.caption, color: theme.danger, lineHeight: 19 },
    localFirst: {
      ...TYPE.micro,
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      marginTop: SPACING.sm,
    },
  });
}

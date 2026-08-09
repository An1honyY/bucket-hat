import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import useTheme from "../theme/useTheme";
import { onTonal, tonalFillAlpha, withAlpha } from "../theme/tokens";
import { ACTION_MAX_WIDTH } from "../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../theme/typography";

// docs/09-design-system.md §9.2/§9.6 — one button, four variants.
//
// Before this, roughly a dozen screens each declared their own
// `saveButton`/`cancelButton`/`deleteButton`/`addButton` styles. They had
// already drifted (12 vs 14px vertical padding, 8 vs 12px radius, some with
// a 44pt minimum and some without), and every one of them stretched to the
// full width of whatever it was rendered in — fine on a phone, a slab on a
// tablet or the web build. Consolidating them here fixes the width once
// (ACTION_MAX_WIDTH, centred) and guarantees §9.6's 44×44pt minimum
// everywhere rather than per-file.
//
// `layout="inline"` opts out of the block width cap for buttons that share a
// row (Cancel / Save), where the row itself is already constrained.
//
// `tonal` (2026-08-09) is the accent at lower volume — accent-coloured label
// on a wash of the same accent. It exists for the case where a screen has
// both a primary action *and* a headline fact rendered in the accent (Journey
// Detail: a pink departure time directly above a pink "Follow this journey").
// Two full-strength accents touching means neither is primary; giving the
// action the quieter of two weights restores the order without making it
// look disabled the way `secondary` would.
export type ButtonVariant = "primary" | "secondary" | "tonal" | "danger" | "ghost";

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** "block" (default) centres and caps the width; "inline" fills its flex slot. */
  layout?: "block" | "inline";
  size?: "md" | "sm";
  /** Rendered before the label — pass a sized/coloured icon element. */
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** The label colour a caller should tint an `icon` with, per variant. */
export function buttonIconColor(theme: ReturnType<typeof useTheme>, variant: ButtonVariant = "primary"): string {
  if (variant === "primary") return "#FFFFFF";
  if (variant === "danger") return theme.danger;
  if (variant === "tonal") return onTonal(theme.accentWalk, theme.isLight);
  if (variant === "ghost") return theme.accentWalk;
  return theme.textPrimary;
}

export default function AppButton({
  label,
  onPress,
  variant = "primary",
  layout = "block",
  size = "md",
  icon,
  disabled = false,
  accessibilityLabel,
  style,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sizeSm : styles.sizeMd,
        styles[variant],
        layout === "block" ? styles.block : styles.inline,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon}
        <Text style={[styles.label, size === "sm" && styles.labelSm, styles[`${variant}Label`]]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    base: {
      borderRadius: RADIUS.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
    },
    // §9.6 — 44×44pt minimum, on every variant, without exception.
    sizeMd: { minHeight: 48 },
    sizeSm: { minHeight: 44, paddingHorizontal: SPACING.md },
    block: { width: "100%", maxWidth: ACTION_MAX_WIDTH, alignSelf: "center" },
    inline: { flex: 1 },
    inner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm },
    label: { ...TYPE.body, fontWeight: "700" },
    labelSm: { ...TYPE.caption, fontWeight: "600" },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.45 },

    primary: { backgroundColor: theme.accentWalk },
    primaryLabel: { color: "#FFFFFF" },
    secondary: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
    secondaryLabel: { color: theme.textPrimary },
    tonal: { backgroundColor: withAlpha(theme.accentWalk, tonalFillAlpha(theme.isLight)) },
    // `onTonal`, not the raw accent — see its note in tokens.ts; the accent on
    // its own wash misses AA in both themes.
    tonalLabel: { color: onTonal(theme.accentWalk, theme.isLight) },
    danger: { borderWidth: 1, borderColor: theme.danger },
    dangerLabel: { color: theme.danger },
    ghost: { backgroundColor: "transparent" },
    ghostLabel: { color: theme.accentWalk },
  });
}

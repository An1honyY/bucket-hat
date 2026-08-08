import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import useTheme from "../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../theme/commonStyles";

// Custom header back control replacing React Navigation's platform default —
// a rounded accent-tinted chip with a chevron, matching the app's own
// NavIcon stroke style (24×24 viewBox, ~1.8 stroke) rather than the bare
// OS-native arrow. Wired as the stack navigator's default `headerLeft`
// (RootNavigator) so every pushed screen gets it consistently.
interface Props {
  onPress: () => void;
  label?: string;
}

// How far the back chip sits from the screen's left edge. On a phone the
// header is the chip's own row — nothing else is competing for that corner —
// and 20px of dead space before a 30px disc reads as a control that drifted
// inboard, so it hugs the edge the way every native header's arrow does. Only
// once the viewport is wide enough for the content column to be centred and
// capped does the larger inset earn its keep, keeping the chip clear of the
// window frame. Exported for the test that pins the two ends of the range.
export const BACK_INSET_NARROW = 6;
export const BACK_INSET_WIDE = 20;

export function backButtonInset(viewportWidth: number): number {
  return viewportWidth < CONTENT_MAX_WIDTH ? BACK_INSET_NARROW : BACK_INSET_WIDE;
}

export default function HeaderBackButton({ onPress, label = "Back" }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { width } = useWindowDimensions();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { paddingLeft: backButtonInset(width) }, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={theme.accentWalk}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // The left inset is the button's own, not the header's
    // `headerLeftContainerStyle`: that option isn't part of native-stack's
    // type at all, and the default container sits flush against the screen
    // edge on web/RNW (measured at x=0, chevron disc touching the frame).
    // It's applied inline from backButtonInset() rather than set here,
    // because it depends on the viewport width — see that function.
    button: { flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 12, paddingVertical: 4 },
    pressed: { opacity: 0.55 },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      // Was a hardcoded pink in light mode, picked back when `accentWalk` was
      // always pink. Now that the accent moves with the weather mood
      // (§9.1.3), a fixed tint stranded a pink chip on a cold-blue header —
      // so the wash is derived from the accent itself, as the tab bar's
      // active pill is.
      backgroundColor: theme.isLight ? `${theme.accentWalk}1F` : theme.surfaceRaised,
    },
    label: { fontSize: 16, color: theme.accentWalk, fontWeight: "500" },
  });
}

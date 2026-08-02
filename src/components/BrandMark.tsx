import { Image, StyleSheet, Text, View } from "react-native";
import useTheme from "../theme/useTheme";
import { cardElevationStyle } from "../theme/tokens";
import { SPACING } from "../theme/typography";

// The app's own name and mark, for the screens that have to introduce it —
// onboarding's first screen and the auth screens reached from it. Everywhere
// else the hat already sits in the header (MainTabs.tsx) and repeating the
// wordmark would be chrome for its own sake.
//
// Same cropped artwork the header uses (assets/header-logo.png); the mark's
// natural aspect is roughly 7:5, so height is derived rather than passed,
// which keeps every placement from having to get it right by hand.
const markSource = require("../../assets/header-logo.png");

interface Props {
  /** Mark width in px. The wordmark scales with it. */
  size?: number;
  /** Hides the "Bucket Hat" text, for places that only need the hat. */
  markOnly?: boolean;
}

export default function BrandMark({ size = 64, markOnly = false }: Props) {
  const theme = useTheme();
  const tileSize = size * 1.5;
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tile,
          {
            width: tileSize,
            height: tileSize,
            borderRadius: tileSize / 2,
            backgroundColor: theme.surface,
          },
          cardElevationStyle(theme),
        ]}
      >
        <Image source={markSource} style={{ width: size, height: size * 0.7 }} resizeMode="contain" />
      </View>
      {markOnly ? null : (
        <Text style={[styles.wordmark, { fontSize: size * 0.56, color: theme.textPrimary }]}>Bucket Hat</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: SPACING.md },
  tile: { alignItems: "center", justifyContent: "center" },
  // -0.5 tracking: the wordmark is set large enough that default spacing
  // reads loose next to the mark it sits under.
  wordmark: { fontWeight: "700", letterSpacing: -0.5 },
});

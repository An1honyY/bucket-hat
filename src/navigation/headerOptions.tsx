import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import HeaderBackButton from "./HeaderBackButton";
import type { ThemeTokens } from "../theme/tokens";

// §9.1/§9.2 — the header chrome every stack in the app shares: themed
// background and title, no shadow, and the app's own accent back chip in
// place of the bare OS-native arrow.
//
// One factory rather than a copy per navigator. There are three stacks now
// (the root one plus the Locations and Gear tab stacks), and a header that
// looks different depending on which one you happened to push from is the
// kind of drift that only shows up on a device.

export function themedHeaderOptions(theme: ThemeTokens): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: theme.headerBg },
    headerTitleStyle: { color: theme.textPrimary },
    headerTintColor: theme.accentWalk,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    // No headerLeftContainerStyle here: it isn't a native-stack option (it
    // belongs to the elements/bottom-tabs header), so the inset that keeps
    // the back chip off the screen edge lives in HeaderBackButton itself.
  };
}

/** The back control for a pushed screen; null at the root of a stack, where
 *  there is nothing to go back to and the navigator's own default (a logo, or
 *  nothing) should stand. */
export function backHeaderLeft(navigation: { canGoBack: () => boolean; goBack: () => void }, label?: string) {
  function HeaderLeft() {
    if (!navigation.canGoBack()) return null;
    return <HeaderBackButton onPress={() => navigation.goBack()} label={label} />;
  }
  return HeaderLeft;
}

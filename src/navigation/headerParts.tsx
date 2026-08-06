import { Image, Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ActionIcon from "../components/ActionIcon";
import NavIcon from "../components/NavIcon";
import useTheme from "../theme/useTheme";
import type { RootStackParamList } from "./types";

// The header furniture shared by the tab navigator and the two tab stacks
// (Locations, Gear). Its own module rather than living in MainTabs: the tab
// stacks need the logo and the Local knowledge button, MainTabs needs the
// stacks, and importing both ways is a cycle — which is exactly how this
// first showed up, as "LocationsStack is not defined" at startup.

// docs/09-design-system.md §9.1 (2026-07-22) — real iconography for the
// bottom tab bar and header buttons, closing the gap this file's own
// comment used to flag ("small text-button header icons stand in... until
// that pass lands," see DECISIONS.md). Header buttons went icon-only, were
// corrected to text-only the same day, then back to icon-only again once
// the "settings" glyph itself was fixed (sliders → an actual cog, per
// explicit request) — see DECISIONS.md for the full back-and-forth. Header
// buttons use theme.textPrimary (matching the header title's color, not
// the accent — accent stays reserved for the active tab / primary
// interactive emphasis elsewhere in the app).
const headerButtonRowStyle = { flexDirection: "row" as const, gap: 8, marginRight: 4 };

// A bare 22px stroke glyph on the header was easy to miss — thin lines on a
// large flat header read as decoration rather than something tappable, and
// there was nothing marking the 44px target. A tinted disc behind each icon
// gives the button an edge and lifts the glyph off the background without
// spending the accent colour, which stays reserved for the active tab and
// primary actions.
function headerButtonStyle(theme: ReturnType<typeof useTheme>) {
  return {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  };
}

export function TodayHeaderButtons() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={headerButtonRowStyle}>
      <Pressable
        onPress={() => navigation.navigate("Settings")}
        style={headerButtonStyle(theme)}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <NavIcon kind="settings" size={22} color={theme.textPrimary} />
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate("History")}
        style={headerButtonStyle(theme)}
        accessibilityRole="button"
        accessibilityLabel="History"
      >
        <NavIcon kind="history" size={22} color={theme.textPrimary} />
      </Pressable>
    </View>
  );
}

// §4.3 — the way in to the saved-journeys list. A bookmark, matching the
// "Save this journey" control on the Plan screen itself: the icon that
// files a trip away and the icon that opens the drawer are the same one.
export function SavedJourneysButton() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={headerButtonRowStyle}>
      <Pressable
        onPress={() => navigation.navigate("SavedJourneys")}
        style={headerButtonStyle(theme)}
        accessibilityRole="button"
        accessibilityLabel="Saved journeys"
      >
        <ActionIcon kind="bookmark" size={20} color={theme.textPrimary} />
      </Pressable>
    </View>
  );
}

export function LocalKnowledgeButton() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={headerButtonRowStyle}>
      <Pressable
        onPress={() => navigation.navigate("LocalKnowledge")}
        style={headerButtonStyle(theme)}
        accessibilityRole="button"
        accessibilityLabel="Local knowledge"
      >
        <NavIcon kind="localKnowledge" size={22} color={theme.textPrimary} />
      </Pressable>
    </View>
  );
}

// The app's bucket-hat mark (docs/09-design-system.md, 2026-07-21 redesign)
// only ever shipped as OS-level icon assets (app.json's icon/adaptive-icon/
// favicon) — never actually placed in the app's own UI. Cropped tight to
// the artwork's real bounding box within android-icon-foreground.png's
// transparent-background layer (that source has generous padding baked in
// for Android's adaptive-icon masking, which would otherwise render as a
// tiny hat lost in a mostly-empty box at header size) and saved as
// assets/header-logo.png — same source art, no re-drawing. Always shown at
// the left of the header, across all 4 main tabs, via screenOptions below
// rather than passed per-Tab.Screen.
const headerLogoSource = require("../../assets/header-logo.png");

export function HeaderLogo() {
  return <Image source={headerLogoSource} style={{ width: 34, height: 24, marginLeft: 12 }} resizeMode="contain" />;
}


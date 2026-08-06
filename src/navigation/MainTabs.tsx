import { useEffect, useRef, useState } from "react";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useLinkBuilder } from "@react-navigation/native";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TodayScreen from "../screens/today/TodayScreen";
import PlanScreen from "../screens/plan/PlanScreen";
import LocationsStack from "./LocationsStack";
import GearStack from "./GearStack";
import NavIcon, { type NavIconKind } from "../components/NavIcon";
import { HeaderLogo, SavedJourneysButton, TodayHeaderButtons } from "./headerParts";
import useTheme from "../theme/useTheme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

// §9.6 — "never convey status by color alone... the same rule applies to
// every other tinted element in this doc regardless of token family." The
// active tab was the one place still breaking it: `tabBarActiveTintColor`
// vs `tabBarInactiveTintColor` is a hue swap and nothing else, so which tab
// you're on was unreadable to anyone who can't separate the accent from
// `textSecondary`. The pill states it with shape as well as colour.
//
// Both the fill and the border come from `accentWalk` with an alpha suffix
// rather than a picked colour, so the indicator follows the weather mood
// (§9.1.3) automatically instead of stranding a pink pill on a cold-blue
// tab bar.
const ACTIVE_PILL_FILL_ALPHA = "26"; // ~15% — a tint, never a solid block behind the content
const ACTIVE_PILL_BORDER_ALPHA = "80"; // ~50% — enough edge to read as a shape at a glance
// A tab slot is a quarter of the screen, which on a desktop browser is ~320pt
// — an indicator that filled it read as a banner rather than as a marker. The
// cap keeps the shape constant from phone to desktop; below it (any phone)
// the slot is what constrains the width, so nothing changes there.
const INDICATOR_MAX_WIDTH = 104;
const INDICATOR_GUTTER = 6; // clear space either side of the indicator within its slot

const TAB_META: Record<keyof MainTabParamList, { icon: NavIconKind; label: string }> = {
  Today: { icon: "today", label: "Today" },
  Plan: { icon: "plan", label: "Plan" },
  Locations: { icon: "locations", label: "Locations" },
  Gear: { icon: "gear", label: "Gear" },
};

// The whole tab bar, not just the buttons — one indicator that travels
// between slots can't live inside a button, because a button only spans its
// own slot. This replaces React Navigation's default bar entirely (the
// `tabBar` prop below), which is also what makes §9.6's "never convey status
// by colour alone" hold here: the active tab is marked by a shape that moves,
// not only by an accent hue.
//
// Fill and border are `accentWalk` plus an alpha suffix, so the indicator
// tracks the weather mood (§9.1.3) rather than stranding a fixed pink on a
// cold-blue bar.
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { buildHref } = useLinkBuilder();
  const [barWidth, setBarWidth] = useState(0);
  const [translateX] = useState(() => new Animated.Value(0));
  // Distinguishes "first measurement" from "the user changed tab": the first
  // must place the indicator, not slide it in from the left edge. A ref, not
  // state — it's only ever read inside the effect, and nothing about it
  // should trigger a render.
  const placed = useRef(false);

  const slotWidth = barWidth / state.routes.length;
  const indicatorWidth = Math.min(INDICATOR_MAX_WIDTH, Math.max(0, slotWidth - INDICATOR_GUTTER * 2));
  const targetX = slotWidth * state.index + (slotWidth - indicatorWidth) / 2;

  useEffect(() => {
    if (barWidth === 0) return;
    if (!placed.current) {
      placed.current = true;
      translateX.setValue(targetX);
      return;
    }
    // A spring rather than a timed curve: the indicator should feel like it
    // carries momentum between tabs, settling into place, rather than running
    // a fixed-length fade. Damped just short of a visible overshoot — enough
    // to read as motion with weight, not as a bounce.
    // Tuned by measuring the travel rather than by feel. Damping 20 /
    // stiffness 190 overshot ~22pt and was still moving at 650ms; 24/300 was
    // no better (33pt, 510ms) because the overshoot scales with distance and
    // a desktop tab bar is a ~920pt trip. This is damped just under critical:
    // a few points of follow-through, settled inside ~300ms.
    Animated.spring(translateX, {
      toValue: targetX,
      damping: 28,
      stiffness: 320,
      mass: 0.85,
      // translateX qualifies for the native driver; RNW has none.
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [targetX, barWidth, translateX]);

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={[
        tabBarStyle,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: 8 + insets.bottom,
        },
      ]}
    >
      {barWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            indicatorStyle,
            {
              width: indicatorWidth,
              backgroundColor: `${theme.accentWalk}${ACTIVE_PILL_FILL_ALPHA}`,
              borderColor: `${theme.accentWalk}${ACTIVE_PILL_BORDER_ALPHA}`,
              bottom: 8 + insets.bottom,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const meta = TAB_META[route.name as keyof MainTabParamList];
        const focused = state.index === index;
        const color = focused ? theme.accentWalk : theme.textSecondary;
        // Keeps the tab a real `<a href>` on web (react-native-web renders one
        // for this prop), so right-click/open-in-new-tab and the link role
        // survive owning the bar. `preventDefault` below is what stops the
        // browser acting on it — without that the anchor does a full document
        // navigation and the app reboots onto its initial route.
        //
        // Spread rather than passed directly: `href` is a react-native-web
        // extension that RN's own PressableProps doesn't declare.
        const webLinkProps = { href: buildHref(route.name, route.params) } as object;

        return (
          <Pressable
            key={route.key}
            {...webLinkProps}
            role="tab"
            aria-selected={focused}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
            testID={options.tabBarButtonTestID}
            onPress={(event) => {
              (event as unknown as { preventDefault?: () => void }).preventDefault?.();
              const pressEvent = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !pressEvent.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={tabItemStyle}
          >
            <NavIcon kind={meta.icon} size={22} color={color} />
            {/* React Navigation's own label wrapper collapses to a fixed ~7px
                height with overflow:hidden on web (verified via computed
                styles — not something tabBarLabelStyle controls on this
                platform), clipping every label to a sliver. Rendering it here
                sidesteps that internal sizing entirely. */}
            <Text style={{ fontSize: 11, fontWeight: "600", color, marginTop: 2, lineHeight: 14 }}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabBarStyle = {
  flexDirection: "row" as const,
  borderTopWidth: 1,
  paddingTop: 6,
};

const tabItemStyle = {
  flex: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingVertical: 4,
};

// Positioned from the bar's left edge and moved with translateX, so one
// element travels the whole row instead of four fading in and out.
// Positioned from the bar's left edge and moved with translateX, so one
// element travels the whole row instead of four fading in and out.
const indicatorStyle = {
  position: "absolute" as const,
  left: 0,
  top: 6,
  borderRadius: 16,
  borderWidth: 1,
};

// Today and Plan are the initial routes; Locations and Gear lazy-load per
// docs/04-screens-navigation.md §4 (React Navigation's default for
// non-focused tab screens).
export default function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      initialRouteName="Today"
      // React Navigation's default here is `firstRoute`, which sends the
      // Android back gesture straight to the initial tab from wherever you
      // are — so every single back swipe landed on Today no matter how you
      // got where you were. `history` walks back through the tabs actually
      // visited, which is what a back gesture means everywhere else in the
      // app (and what the stack above already does for pushed screens).
      backBehavior="history"
      // TabBar renders the bar, its icons, its labels and the travelling
      // indicator, so the tabBar* style/tint options are all dead config —
      // it reads what it needs from the theme directly.
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerLeft: HeaderLogo,
        headerStyle: { backgroundColor: theme.headerBg },
        headerShadowVisible: false,
        headerTitleStyle: { color: theme.textPrimary },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          headerRight: TodayHeaderButtons,
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          headerRight: SavedJourneysButton,
        }}
      />
      {/* Locations and Gear are stacks, not single screens (types.ts) —
          their sub-views are real routes, so the header comes from the
          inner navigator and the tab must not draw a second one above it.
          The tab bar still shows: the stack is nested inside the tab. */}
      <Tab.Screen name="Locations" component={LocationsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Gear" component={GearStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

import { Header, getHeaderTitle } from "@react-navigation/elements";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";

// The one header the whole app draws.
//
// Before this there were two, and which one you got depended on which
// navigator a screen happened to live in: Today and Plan are direct children
// of the tab navigator, so they got `@react-navigation/bottom-tabs`' header;
// Locations, Gear and every pushed screen live in native stacks, so they got
// `@react-navigation/native-stack`'s. Both are "the default header", and they
// do not agree:
//
//   - `@react-navigation/elements`' getDefaultHeaderHeight returns **64** +
//     status bar on Android (that's the one bottom-tabs renders).
//   - native-stack hardcodes ANDROID_DEFAULT_HEADER_HEIGHT = **56** + status
//     bar (NativeStackView.native.js).
//
// So Today's header was 8dp taller than Gear's, and their left insets differed
// too: the elements header lays `headerLeft` out in its own padded container,
// while native-stack hands the view to the native toolbar, which adds the
// back-button slot's inset on top of whatever margin the element already has.
// That is why the logo and title sat further right on Locations and Gear.
//
// Rather than hand-tuning one to match the other — two implementations that
// drift again the next time either library changes a constant — every stack
// now renders this, which *is* the component bottom-tabs uses. One header,
// measured once, by definition identical everywhere.
//
// Passed via `themedHeaderOptions`, so all three stacks (root, Locations,
// Gear) pick it up together. Today and Plan need no change: they were already
// this component, reached through the tab navigator.
export default function appHeader({ options, route, back }: NativeStackHeaderProps) {
  return <Header {...options} back={back} title={getHeaderTitle(options, route.name)} />;
}

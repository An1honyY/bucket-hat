import { chromeAwareEdges } from "./ScreenSurface";

// The safe-area regression this guards against (DECISIONS.md 2026-08-05) is
// invisible on the web build — every inset is 0 there, so a rendered check
// passes whether the edge set is right or wrong. That's how the original bug
// shipped "verified". These assert the derivation directly instead.
describe("chromeAwareEdges", () => {
  // Today / Plan / Locations / Gear: MainTabs header above, tab bar below.
  // Both the top and bottom insets are already spent by that chrome.
  it("insets neither top nor bottom for a tab screen under a header", () => {
    const edges = chromeAwareEdges(true, 84);
    expect(edges).not.toContain("top");
    expect(edges).not.toContain("bottom");
  });

  // The specific bug: the header sets headerStatusBarHeight from insets.top,
  // so a screen that also insets "top" pushes its content down by the notch
  // twice — and because that padding is on the screen root, outside the
  // ScrollView, no amount of scrolling reclaims it.
  it("does not inset top whenever a header is shown", () => {
    expect(chromeAwareEdges(true, undefined)).not.toContain("top");
    expect(chromeAwareEdges(true, 84)).not.toContain("top");
  });

  // Pushed stack screens (Journey Detail, History, Settings…): header above,
  // no tab bar, so the screen itself still has to clear the home indicator.
  it("insets bottom but not top for a header'd screen with no tab bar", () => {
    const edges = chromeAwareEdges(true, undefined);
    expect(edges).toContain("bottom");
    expect(edges).not.toContain("top");
  });

  // Onboarding and friends: headerShown false, nothing drawn around them.
  it("insets every edge for a screen with no chrome at all", () => {
    const edges = chromeAwareEdges(false, undefined);
    expect(edges).toEqual(expect.arrayContaining(["top", "bottom", "left", "right"]));
  });

  // A tab bar height of 0 is a real value (tabBarPosition other than
  // "bottom"), not an absent one — `undefined` is the only signal that means
  // "no tab bar below this screen".
  it("treats a zero tab-bar height as a tab bar that is present", () => {
    expect(chromeAwareEdges(true, 0)).not.toContain("bottom");
  });

  it("always insets the horizontal edges", () => {
    for (const edges of [
      chromeAwareEdges(true, 84),
      chromeAwareEdges(true, undefined),
      chromeAwareEdges(false, undefined),
    ]) {
      expect(edges).toContain("left");
      expect(edges).toContain("right");
    }
  });
});

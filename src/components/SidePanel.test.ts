import { sidePanelWidth } from "./SidePanel";

// The width rule the panels share. Worth pinning because the bug it fixes is
// only visible at one end of the range — a flat 420px cap looked fine on the
// phone it was tuned for and read as a narrow ribbon on a desktop browser.
describe("sidePanelWidth", () => {
  it("takes most of a phone screen, leaving a strip of backdrop to tap", () => {
    const width = sidePanelWidth(375);
    expect(width).toBeGreaterThan(300);
    expect(width).toBeLessThan(375);
  });

  it("gives a desktop window substantially more than the old 420 cap", () => {
    expect(sidePanelWidth(1440)).toBeGreaterThan(420);
  });

  it("never exceeds the readable maximum", () => {
    expect(sidePanelWidth(3000)).toBeLessThanOrEqual(760);
  });

  // Monotonic across the breakpoint: a window one pixel wider must never
  // produce a narrower panel, which a naive fraction switch would do.
  it("never shrinks as the viewport grows", () => {
    let previous = 0;
    for (let w = 320; w <= 2000; w += 10) {
      const current = sidePanelWidth(w);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});

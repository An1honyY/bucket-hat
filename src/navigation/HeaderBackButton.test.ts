import { backButtonInset, BACK_INSET_NARROW, BACK_INSET_WIDE } from "./HeaderBackButton";

// The chip's left inset used to be a flat 20px, tuned to line up with the
// content margin below it. On a phone that left the back control visibly
// adrift from the edge, so it's viewport-dependent now — worth pinning,
// since the regression is only visible at one end of the range.
describe("backButtonInset", () => {
  it("hugs the edge on a phone", () => {
    expect(backButtonInset(375)).toBe(BACK_INSET_NARROW);
  });

  it("keeps the content-margin inset once the column is capped and centred", () => {
    expect(backButtonInset(1440)).toBe(BACK_INSET_WIDE);
  });

  it("never puts the chip further left as the viewport grows", () => {
    let previous = 0;
    for (let w = 320; w <= 2000; w += 10) {
      const current = backButtonInset(w);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});

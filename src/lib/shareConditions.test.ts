import { shareCardFileName } from "./shareConditions";

// docs/13-extended-features.md §13.2. The capture and the share sheet are
// platform plumbing, verified by running them (§11.2 asks for exactly that);
// the name the file lands under is the one part that is logic.

describe("shareCardFileName", () => {
  it("names the file for when it was true, sortable in a downloads folder", () => {
    expect(shareCardFileName(new Date(2026, 7, 18, 9, 5).getTime())).toBe("bucket-hat-2026-08-18-0905.png");
  });

  it("pads every field, so names sort as strings and not as numbers", () => {
    expect(shareCardFileName(new Date(2026, 0, 2, 0, 0).getTime())).toBe("bucket-hat-2026-01-02-0000.png");
  });
});

import { MASCOT_NEUTRAL, MASCOT_SWATCH_HEX, mascotSwatchHex } from "./mascotSwatches";
import type { MascotSwatch } from "../types";

// docs/13-extended-features.md §13.9 — the graceful fallback is called out as
// "required, not optional": `color` is a Phase 21 field, so almost every
// existing wardrobe item has none, and §9.7 says a bad value must fail
// silently to the placeholder rather than surface an error over what is a
// pure delight feature. Both are easy to regress by "tidying" the lookup into
// a plain index.
const ALL_SWATCHES: MascotSwatch[] = [
  "black", "white", "grey", "navy", "blue", "red",
  "orange", "yellow", "green", "purple", "pink", "brown",
];

describe("mascotSwatchHex", () => {
  it("resolves every swatch the type allows", () => {
    for (const swatch of ALL_SWATCHES) {
      expect(mascotSwatchHex(swatch)).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("covers the full swatch union with no gaps", () => {
    // Guards a swatch being added to the type without a hex beside it, which
    // would otherwise only show up as a grey garment at runtime.
    expect(Object.keys(MASCOT_SWATCH_HEX).sort()).toEqual([...ALL_SWATCHES].sort());
  });

  it("falls back to neutral for an untagged item", () => {
    expect(mascotSwatchHex(undefined)).toBe(MASCOT_NEUTRAL);
  });

  it("falls back to neutral for a value that isn't a swatch at all", () => {
    // A row written by a newer version, or a corrupt one. §9.7: fail silently
    // to the placeholder, never throw.
    expect(mascotSwatchHex("chartreuse" as MascotSwatch)).toBe(MASCOT_NEUTRAL);
  });

  it("gives every swatch a distinct colour", () => {
    const hexes = Object.values(MASCOT_SWATCH_HEX).map((h) => h.toLowerCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("keeps every swatch distinguishable from the neutral placeholder", () => {
    // Otherwise "untagged" and "actually grey" would look identical, and the
    // user would have no way to tell the mascot didn't know.
    for (const [name, hex] of Object.entries(MASCOT_SWATCH_HEX)) {
      expect(`${name}:${hex.toLowerCase()}`).not.toBe(`${name}:${MASCOT_NEUTRAL.toLowerCase()}`);
    }
  });
});

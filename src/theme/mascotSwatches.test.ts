import { MASCOT_DEFAULT_GARMENT, MASCOT_SWATCH_HEX, mascotSwatchHex } from "./mascotSwatches";
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

  it("falls back to the default garment colour for an untagged item", () => {
    expect(mascotSwatchHex(undefined)).toBe(MASCOT_DEFAULT_GARMENT);
  });

  it("falls back to neutral for a value that isn't a swatch at all", () => {
    // A row written by a newer version, or a corrupt one. §9.7: fail silently
    // to the placeholder, never throw.
    expect(mascotSwatchHex("chartreuse" as MascotSwatch)).toBe(MASCOT_DEFAULT_GARMENT);
  });

  it("gives every swatch a distinct colour", () => {
    const hexes = Object.values(MASCOT_SWATCH_HEX).map((h) => h.toLowerCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("the default garment colour is one of the real swatches", () => {
    // This used to assert the opposite — that the fallback was distinct from
    // every swatch, so "untagged" could never be mistaken for a real colour.
    // That was traded away deliberately (see MASCOT_DEFAULT_GARMENT): almost
    // every garment is untagged, so the fallback is the mascot's usual look
    // and needs to be a colour rather than a placeholder. Pinned so nobody
    // "restores" a grey without reading why it went.
    expect(Object.values(MASCOT_SWATCH_HEX)).toContain(MASCOT_DEFAULT_GARMENT);
  });
});

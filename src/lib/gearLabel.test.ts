import { displayGearLabel, displayItemName, titleCaseGearPhrase } from "./gearLabel";

describe("displayGearLabel", () => {
  it("title-cases the app's own noun phrases", () => {
    expect(displayGearLabel("Warm jacket")).toBe("Warm Jacket");
    expect(displayGearLabel("Jacket")).toBe("Jacket");
    expect(displayGearLabel("Midlayer")).toBe("Midlayer");
  });

  it("keeps minor words lowercase inside the phrase", () => {
    expect(displayGearLabel("Gloves and a hat")).toBe("Gloves and a Hat");
    expect(displayGearLabel("Sunglasses or a hat")).toBe("Sunglasses or a Hat");
  });

  it("leaves the explanation clause after an em dash as written", () => {
    // The whole reason this isn't a blanket title-case: these are sentences.
    expect(displayGearLabel("Waterproof shoes — mind the puddles")).toBe("Waterproof Shoes — mind the puddles");
    expect(displayGearLabel("Single layer — it's hot")).toBe("Single Layer — it's hot");
    expect(displayGearLabel("Bottoms — none available, wear what you have")).toBe(
      "Bottoms — none available, wear what you have"
    );
  });

  it("handles a multi-clause label without eating the later dashes", () => {
    expect(displayGearLabel("No suitable umbrella — a hood — or a doorway")).toBe(
      "No Suitable Umbrella — a hood — or a doorway"
    );
  });

  it("preserves words that already carry deliberate capitals or digits", () => {
    // Per word: "3-in-1" and "REI" are left exactly as written, while the
    // ordinary words around them still title-case normally. This only ever
    // sees app-authored labels, but the guard means it stays safe if it is
    // ever pointed at something else.
    expect(titleCaseGearPhrase("rain shell 3-in-1")).toBe("Rain Shell 3-in-1");
    expect(titleCaseGearPhrase("a REI shell")).toBe("A REI Shell");
  });
});

describe("displayItemName", () => {
  it("raises only the first character", () => {
    expect(displayItemName("blue rain shell")).toBe("Blue rain shell");
  });

  it("leaves a name the user capitalised themselves alone", () => {
    // §9.0 — gear keeps the user's own names. Title-casing these would
    // rewrite what someone actually typed.
    expect(displayItemName("REI down jacket")).toBe("REI down jacket");
    expect(displayItemName("M's Nano Puff")).toBe("M's Nano Puff");
  });

  it("survives an empty name", () => {
    expect(displayItemName("")).toBe("");
  });
});

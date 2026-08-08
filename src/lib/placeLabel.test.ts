import { defaultRouteLabel, resolveLocationLabel, shortAddressLabel } from "./placeLabel";

const FULL = "12 Queen Street, Auckland CBD, Auckland 1010, New Zealand";

describe("shortAddressLabel", () => {
  it("takes the most specific component of a formatted address", () => {
    expect(shortAddressLabel(FULL)).toBe("12 Queen Street");
  });

  it("passes a bare place name through", () => {
    expect(shortAddressLabel("Cornwall Park")).toBe("Cornwall Park");
  });

  it("falls back to the whole string when the first component is empty", () => {
    expect(shortAddressLabel(", Auckland")).toBe(", Auckland");
  });

  it("returns nothing for nothing, so callers can detect 'still unnamed'", () => {
    expect(shortAddressLabel("")).toBe("");
    expect(shortAddressLabel("   ")).toBe("");
  });
});

describe("resolveLocationLabel", () => {
  // The point of the whole change: saving without typing a name has to
  // produce a real label, because everything downstream still requires one.
  it("names an unlabelled location after its address", () => {
    expect(resolveLocationLabel("", FULL)).toBe("12 Queen Street");
    expect(resolveLocationLabel("   ", FULL)).toBe("12 Queen Street");
  });

  it("keeps a name the user actually typed", () => {
    expect(resolveLocationLabel("  Home  ", FULL)).toBe("Home");
  });
});

describe("defaultRouteLabel", () => {
  it("names a journey after its two ends", () => {
    expect(defaultRouteLabel("Home", "Work")).toBe("Home → Work");
  });
});

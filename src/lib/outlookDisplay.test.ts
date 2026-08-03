import { iconKindFor } from "./outlookDisplay";

// §9.5 — the glyph and the millimetres under it describe the same hour, so
// they have to agree. Open-Meteo's weather code reports the dominant *sky*
// condition, which routinely disagrees with that hour's precipitation.
describe("iconKindFor", () => {
  const base = { isDaylight: true, windKph: 5 };

  it("keeps the code's glyph when no bucket is supplied (the compact Plan rows)", () => {
    expect(iconKindFor({ ...base, weatherCode: 61 })).toBe("rain");
    expect(iconKindFor({ ...base, weatherCode: 3 })).toBe("cloud");
  });

  it("downgrades a rain glyph on an hour with no measurable rain", () => {
    expect(iconKindFor({ ...base, weatherCode: 61, rainIntensity: "none" })).toBe("cloud");
    expect(iconKindFor({ ...base, weatherCode: 51, rainIntensity: "none" })).toBe("cloud");
  });

  it("puts a wet glyph on a dry-coded hour that is actually raining", () => {
    expect(iconKindFor({ ...base, weatherCode: 3, rainIntensity: "low" })).toBe("drizzle");
    expect(iconKindFor({ ...base, weatherCode: 3, rainIntensity: "med" })).toBe("rain");
    expect(iconKindFor({ ...base, weatherCode: 0, rainIntensity: "high" })).toBe("rain");
  });

  it("leaves a matching pair alone", () => {
    expect(iconKindFor({ ...base, weatherCode: 61, rainIntensity: "med" })).toBe("rain");
    expect(iconKindFor({ ...base, weatherCode: 51, rainIntensity: "low" })).toBe("drizzle");
  });

  it("never rewrites snow or storm, whose glyphs mean more than 'wet'", () => {
    expect(iconKindFor({ ...base, weatherCode: 73, rainIntensity: "none" })).toBe("snow");
    expect(iconKindFor({ ...base, weatherCode: 95, rainIntensity: "none" })).toBe("storm");
    expect(iconKindFor({ ...base, weatherCode: 73, rainIntensity: "high" })).toBe("snow");
  });

  it("leaves the dry sky distinctions to the code", () => {
    expect(iconKindFor({ ...base, weatherCode: 0, rainIntensity: "none" })).toBe("sun");
    expect(iconKindFor({ ...base, weatherCode: 0, isDaylight: false, rainIntensity: "none" })).toBe("moon");
    expect(iconKindFor({ ...base, weatherCode: 45, rainIntensity: "none" })).toBe("fog");
  });
});

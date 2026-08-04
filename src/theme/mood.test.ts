import { applyWeatherMood } from "./mood";
import { darkTheme, lightTheme } from "./tokens";
import type { WeatherSnapshot } from "../types";

// §9.1.3 — the six palettes the app can be in (3 moods × light/dark) and the
// rules that pick between them. Worth pinning down in a test rather than by
// eye: since 2026-08-05 this drives *every* screen's colours, so a wrong
// merge is an app-wide regression, and the mild → base-identity case is what
// keeps `useMemo(..., [theme])` from re-running on every render.

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    time: "2026-08-05T08:00:00.000Z",
    weatherCode: 1, // clear-ish, severity 1
    precipMm: 0,
    precipProbability: 10,
    tempC: 15,
    apparentTempC: 15,
    windKph: 10,
    windGustKph: 15,
    relativeHumidityPct: 60,
    uvIndex: 2,
    isDaylight: true,
    forecastConfidence: "high",
    ...overrides,
  };
}

describe("applyWeatherMood", () => {
  it("returns the base palette unchanged when there is no reading", () => {
    expect(applyWeatherMood(darkTheme, null)).toBe(darkTheme);
    expect(applyWeatherMood(lightTheme, undefined)).toBe(lightTheme);
  });

  it("returns the base palette itself for mild weather, not a copy", () => {
    // Identity, not just equality: every screen's getStyles(theme) and
    // commonStyles' useMemo key off this object.
    expect(applyWeatherMood(darkTheme, weather({ apparentTempC: 15 }))).toBe(darkTheme);
    expect(applyWeatherMood(lightTheme, weather({ apparentTempC: 15 }))).toBe(lightTheme);
  });

  it("tints cold in both base themes", () => {
    const cold = weather({ apparentTempC: 6 });
    expect(applyWeatherMood(darkTheme, cold)).toMatchObject({
      bg: "#10192E",
      surface: "#16233E",
      accentWalk: "#2FB8E8",
      patternTint: "#2FB8E8",
      isLight: false,
    });
    expect(applyWeatherMood(lightTheme, cold)).toMatchObject({
      bg: "#EFF6FB",
      accentWalk: "#0E86B0",
      patternTint: "#0E86B0",
      isLight: true,
    });
  });

  it("tints warm only when it is genuinely warm and clear", () => {
    expect(applyWeatherMood(darkTheme, weather({ apparentTempC: 24 }))).toMatchObject({
      bg: "#241A12",
      accentWalk: "#FFD23F",
      patternTint: "#FFD23F",
    });
    // Warm but raining (severity 2) stays mild — the gold tint means "warm
    // and sunny" specifically.
    expect(applyWeatherMood(darkTheme, weather({ apparentTempC: 24, weatherCode: 61, precipMm: 2 }))).toBe(darkTheme);
  });

  it("treats a warm storm as cold, matching severity's dominance", () => {
    const stormy = weather({ apparentTempC: 24, weatherCode: 95, precipMm: 8 });
    expect(applyWeatherMood(darkTheme, stormy).bg).toBe("#10192E");
  });

  it("moves the header wash with the mood, so chrome never strands against the screen", () => {
    // Regression: headerBg was left on the base palette when the mood went
    // app-wide, leaving a violet-navy header above a cold-blue screen.
    const cold = weather({ apparentTempC: 6 });
    const warm = weather({ apparentTempC: 24 });
    expect(applyWeatherMood(darkTheme, cold).headerBg).toBe("#142138");
    expect(applyWeatherMood(darkTheme, warm).headerBg).toBe("#2C1F16");
    expect(applyWeatherMood(lightTheme, cold).headerBg).toBe("#E2EFF8");
    expect(applyWeatherMood(lightTheme, warm).headerBg).toBe("#F7E6D0");
    // The light theme's raised-card outline is violet-tinted for the same
    // reason and shares an edge with mood-tinted surfaces.
    expect(applyWeatherMood(lightTheme, cold).surfaceRaisedBorder).toBe("#D3E4F0");
    // Dark mode's outline is "transparent" in every mood — nothing to tint.
    expect(applyWeatherMood(darkTheme, cold).surfaceRaisedBorder).toBe("transparent");
  });

  it("leaves condition and badge tokens alone, so leg dots keep their meaning", () => {
    const merged = applyWeatherMood(darkTheme, weather({ apparentTempC: 6 }));
    expect(merged.conditionStorm).toBe(darkTheme.conditionStorm);
    expect(merged.conditionRain).toBe(darkTheme.conditionRain);
    expect(merged.uvBadge).toBe(darkTheme.uvBadge);
    expect(merged.accentTransit).toBe(darkTheme.accentTransit);
  });

  it("hands back the same object for the same base and mood", () => {
    const first = applyWeatherMood(darkTheme, weather({ apparentTempC: 4 }));
    const second = applyWeatherMood(darkTheme, weather({ apparentTempC: 7, windKph: 22 }));
    expect(second).toBe(first);
  });
});

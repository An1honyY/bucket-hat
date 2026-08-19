import { shareableWindows, snapshotFromHour, summarizeWindow } from "./forecastWindows";
import type { HourlyReading } from "../services/weatherService";
import { rainIntensityBucket } from "./weather";

// docs/13-extended-features.md §13.2, extended past "right now". All of this
// is boundary arithmetic over a strip of hours — the kind of thing that works
// every afternoon and then names tomorrow's rain "today" at 11pm.

const NOON = new Date(2026, 7, 19, 12, 5).getTime(); // Wed 19 Aug 2026, 12:05pm

/** An hour at `hoursFromNoon`, dry and mild unless overridden. */
function hour(hoursFromNoon: number, overrides: Partial<HourlyReading> = {}): HourlyReading {
  const time = new Date(new Date(2026, 7, 19, 12, 0).getTime() + hoursFromNoon * 3_600_000);
  const precipMm = overrides.precipMm ?? 0;
  return {
    time: time.toISOString(),
    tempC: 16,
    weatherCode: 1,
    windKph: 10,
    isDaylight: true,
    apparentTempC: 15,
    precipProbability: 5,
    windGustKph: 18,
    relativeHumidityPct: 60,
    uvIndex: 3,
    ...overrides,
    precipMm,
    // Derived from precipMm rather than passed, which is what the service
    // does — a test that set one without the other would be describing an
    // hour the app can never produce.
    rainIntensity: rainIntensityBucket(precipMm),
  };
}

const RAINY = { weatherCode: 61, precipMm: 2.2 };
const HOT = { tempC: 27, apparentTempC: 26 };
const GUSTY = { windKph: 32, windGustKph: 46 };

describe("shareableWindows — named runs", () => {
  it("names a run of rain by when it starts and stops", () => {
    const hours = [hour(0), hour(1), hour(2, RAINY), hour(3, RAINY), hour(4, RAINY), hour(5)];
    const [first] = shareableWindows(hours, NOON, true);
    expect(first.title).toBe("Rain 2–5pm");
    expect(first.kind).toBe("notable");
    // 2pm through the *end* of the 4pm hour: a reading stamped 4pm describes
    // 4–5pm, so the window a card promises has to run to 5.
    expect(first.hours).toHaveLength(3);
  });

  it("ignores a single flagged hour — that's the shoulder of something, not a spell", () => {
    const hours = [hour(0), hour(1, RAINY), hour(2), hour(3)];
    expect(shareableWindows(hours, NOON, true).filter((w) => w.kind === "notable")).toHaveLength(0);
  });

  it("says which day a run is on once it isn't today", () => {
    const hours = [hour(0), hour(20, RAINY), hour(21, RAINY), hour(22)];
    const [first] = shareableWindows(hours, NOON, true);
    expect(first.title).toBe("Rain tomorrow 8–10am");
  });

  it("names heat and wind from the engine's own thresholds", () => {
    const hot = [hour(0), hour(1, HOT), hour(2, HOT), hour(3)];
    expect(shareableWindows(hot, NOON, true)[0].title).toBe("Hot 1–3pm");
    const windy = [hour(0), hour(1, GUSTY), hour(2, GUSTY), hour(3)];
    expect(shareableWindows(windy, NOON, true)[0].title).toBe("Windy 1–3pm");
  });

  it("puts the earliest run first and keeps the list short", () => {
    const hours = [
      hour(0),
      hour(1, RAINY), hour(2, RAINY),
      hour(3),
      hour(4, HOT), hour(5, HOT),
      hour(6),
      hour(7, GUSTY), hour(8, GUSTY),
      hour(9),
      hour(10, RAINY), hour(11, RAINY),
    ];
    const named = shareableWindows(hours, NOON, true).filter((w) => w.kind === "notable");
    expect(named).toHaveLength(3);
    expect(named.map((w) => w.title)).toEqual(["Rain 1–3pm", "Hot 4–6pm", "Windy 7–9pm"]);
  });

  it("names a stretch of weather once, under the reason worth sending", () => {
    // Rain with gusts behind it is one afternoon, not two things to share;
    // the wind run is suppressed because it covers hours rain already claimed.
    const hours = [hour(0), hour(1, { ...RAINY, ...GUSTY }), hour(2, { ...RAINY, ...GUSTY }), hour(3)];
    const named = shareableWindows(hours, NOON, true).filter((w) => w.kind === "notable");
    expect(named.map((w) => w.title)).toEqual(["Rain 1–3pm"]);
  });

  it("still names a run that only partly misses an earlier one", () => {
    // Wind that starts after the rain has stopped is its own event.
    const hours = [hour(0), hour(1, RAINY), hour(2, RAINY), hour(3), hour(4, GUSTY), hour(5, GUSTY), hour(6)];
    const named = shareableWindows(hours, NOON, true).filter((w) => w.kind === "notable");
    expect(named.map((w) => w.title)).toEqual(["Rain 1–3pm", "Windy 4–6pm"]);
  });

  it("uses 24h labels when that's the user's setting", () => {
    const hours = [hour(0), hour(2, RAINY), hour(3, RAINY), hour(4)];
    expect(shareableWindows(hours, NOON, false)[0].title).toBe("Rain 14:00–16:00");
  });
});

describe("shareableWindows — plain spans", () => {
  it("offers the rest of today, tonight and tomorrow", () => {
    const hours = Array.from({ length: 30 }, (_, i) => hour(i));
    const titles = shareableWindows(hours, NOON, true).map((w) => w.title);
    expect(titles).toEqual(["Rest of today", "Tonight", "Tomorrow"]);
  });

  it("drops a span the day has already run out of", () => {
    // 7pm: the daytime part of today is behind us, so only tonight is left of
    // it — offering "Rest of today" over one dark hour would be a lie.
    const evening = new Date(2026, 7, 19, 19, 5).getTime();
    const hours = Array.from({ length: 8 }, (_, i) => hour(i + 7));
    expect(shareableWindows(hours, evening, true).map((w) => w.title)).toEqual(["Tonight"]);
  });

  it("has nothing to offer without a forecast", () => {
    expect(shareableWindows([], NOON, true)).toEqual([]);
  });

  it("won't reach past the horizon the forecast can support", () => {
    const hours = [hour(40, RAINY), hour(41, RAINY), hour(42, RAINY)];
    expect(shareableWindows(hours, NOON, true)).toEqual([]);
  });
});

describe("summarizeWindow", () => {
  it("takes its peak from the worst weather, not the middle of the run", () => {
    const window = shareableWindows([hour(0), hour(1, RAINY), hour(2, { ...RAINY, precipMm: 6, tempC: 12 }), hour(3, RAINY), hour(4)], NOON, true)[0];
    const summary = summarizeWindow(window);
    expect(summary.peak.precipMm).toBe(6);
    expect(summary.minTempC).toBe(12);
    expect(summary.maxTempC).toBe(16);
    expect(summary.totalPrecipMm).toBeCloseTo(10.4);
  });

  it("calls a window night when most of it is dark, whatever its peak hour is", () => {
    // "Tonight" starts in the light and ends in the dark; drawn from the peak
    // hour's own flag it put a sun on a card about 11pm.
    const evening = [hour(6, { isDaylight: true }), hour(7, { isDaylight: true }), hour(8, { isDaylight: false }), hour(9, { isDaylight: false }), hour(10, { isDaylight: false })];
    const window = shareableWindows(evening, NOON, true).find((w) => w.id === "tonight")!;
    expect(summarizeWindow(window).mostlyDaylight).toBe(false);
  });

  it("breaks a tie on temperature, so a hot window peaks at its hottest hour", () => {
    const window = shareableWindows([hour(0), hour(1, HOT), hour(2, { ...HOT, tempC: 31, apparentTempC: 30 }), hour(3)], NOON, true)[0];
    expect(summarizeWindow(window).peak.tempC).toBe(31);
  });
});

describe("snapshotFromHour", () => {
  it("stamps confidence from the lead time", () => {
    // Everything inside the 36h horizon is "high" by §5.3's own thresholds
    // (which only step down past 48h) — that is precisely why the horizon
    // stops where it does, rather than the card needing a hedge of its own.
    expect(snapshotFromHour(hour(1), new Date(NOON).toISOString()).forecastConfidence).toBe("high");
    expect(snapshotFromHour(hour(30), new Date(NOON).toISOString()).forecastConfidence).toBe("high");
    expect(snapshotFromHour(hour(200), new Date(NOON).toISOString()).forecastConfidence).toBe("low");
  });

  it("carries the fields the engine actually reads", () => {
    const snapshot = snapshotFromHour(hour(2, { ...HOT, ...GUSTY, uvIndex: 9 }), new Date(NOON).toISOString());
    expect(snapshot.apparentTempC).toBe(26);
    expect(snapshot.windGustKph).toBe(46);
    expect(snapshot.uvIndex).toBe(9);
  });
});

import { mascotStateFor } from "./mascot";
import { recommendGear, type Inventory } from "./recommend";
import type { ClothingItem, Journey, JourneyLeg, ShoeItem, UmbrellaItem, WarmthCalibration, WeatherSnapshot } from "../types";

// docs/13-extended-features.md §13.9 — the selector's tests go *through*
// recommendGear() rather than hand-building a `signals` object. That is the
// spec's own instruction and the point of it: the fixture values below are
// lifted from recommend.test.ts's equivalent cases (0°C for a genuine cold
// snap, 24°C for HOT_C's boundary, uvIndex 7 for high UV, an amplified leg at
// windKph 10 for the wind tunnel), so if anyone retunes what the engine calls
// cold or hot, these move with it instead of quietly disagreeing.

const HOME = { id: "home", label: "Home", address: "1 Home St", lat: -36.8485, lng: 174.7633 };
const WORK = { id: "work", label: "Work", address: "2 Work St", lat: -36.86, lng: 174.77 };
const NO_CALIBRATION: WarmthCalibration = { offsetLevels: 0, sampleCount: 0 };

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    time: "2026-07-20T08:00:00.000Z",
    weatherCode: 1,
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

function walkLeg(overrides: Partial<JourneyLeg> = {}): JourneyLeg {
  return {
    id: "leg-1",
    mode: "walk",
    label: "Walk to Work",
    durationMin: 10,
    startTime: "2026-07-20T08:00:00.000Z",
    outdoor: true,
    weather: weather(),
    ...overrides,
  };
}

function journeyWithLegs(legs: JourneyLeg[]): Journey {
  return { id: "journey-1", origin: HOME, destination: WORK, departTime: "2026-07-20T08:00:00.000Z", legs };
}

const SHOE: ShoeItem = { id: "shoe-1", name: "Sneakers", type: "sneaker", waterproof: false, grip: "med" };
const UMBRELLA: UmbrellaItem = { id: "umbrella-1", name: "Compact umbrella", type: "compact", windRating: "med" };

function inventory(overrides: Partial<Inventory> = {}): Inventory {
  return { clothing: [], shoes: [SHOE], umbrellas: [UMBRELLA], ...overrides };
}

/** Run the real engine, then the selector — never one without the other. */
function stateFor(legs: JourneyLeg[], inv: Inventory = inventory()) {
  return mascotStateFor(recommendGear(journeyWithLegs(legs), inv, NO_CALIBRATION, "no-preference").signals);
}

describe("mascotStateFor — each state's trigger boundary (§13.9)", () => {
  it("idle on an unremarkable day", () => {
    expect(stateFor([walkLeg()])).toEqual({ primary: "idle", shivering: false });
  });

  it("shiver at a genuine cold snap, and not one level below it", () => {
    // 0°C is recommend.test.ts's own "genuine cold snap (level 4)" fixture.
    expect(stateFor([walkLeg({ weather: weather({ apparentTempC: 0 }) })]).shivering).toBe(true);
    // 5°C is level 3 — cold enough for a midlayer and a jacket, not for the shiver.
    expect(stateFor([walkLeg({ weather: weather({ apparentTempC: 5 }) })]).shivering).toBe(false);
  });

  it("sun-squint at HIGH_UV_INDEX, idle below it", () => {
    expect(stateFor([walkLeg({ weather: weather({ uvIndex: 7 }) })]).primary).toBe("sunSquint");
    expect(stateFor([walkLeg({ weather: weather({ uvIndex: 6 }) })]).primary).toBe("sunSquint");
    expect(stateFor([walkLeg({ weather: weather({ uvIndex: 5 }) })]).primary).toBe("idle");
  });

  it("a high-reflection leg reaches sun-squint one UV point earlier (§7.8)", () => {
    expect(stateFor([walkLeg({ highReflection: true, weather: weather({ uvIndex: 5 }) })]).primary).toBe("sunSquint");
  });

  it("wind-blown only once an amplified leg's felt wind clears WIND_CHILL_KPH", () => {
    // 10 × 1.5 = 15, exactly the threshold; 9 × 1.5 = 13.5 is under it.
    expect(stateFor([walkLeg({ windEffect: "amplified", weather: weather({ windKph: 10 }) })]).primary).toBe("windBlown");
    expect(stateFor([walkLeg({ windEffect: "amplified", weather: weather({ windKph: 9 }) })]).primary).toBe("idle");
  });

  it("an unannotated leg is never wind-blown, however hard it is blowing", () => {
    expect(stateFor([walkLeg({ weather: weather({ windKph: 40 }) })]).primary).toBe("idle");
    expect(stateFor([walkLeg({ windEffect: "sheltered", weather: weather({ windKph: 40 }) })]).primary).toBe("idle");
  });

  it("wind-blown still fires on a formal journey, where the engine skips the warmth bump (§7.10)", () => {
    const journey = { ...journeyWithLegs([walkLeg({ windEffect: "amplified", weather: weather({ windKph: 10 }) })]), formal: true };
    const result = mascotStateFor(recommendGear(journey, inventory(), NO_CALIBRATION, "no-preference").signals);
    expect(result.primary).toBe("windBlown");
  });

  it("fanning at HOT_C, idle at the warm-but-not-hot fixture below it", () => {
    expect(stateFor([walkLeg({ weather: weather({ apparentTempC: 24 }) })]).primary).toBe("fanning");
    expect(stateFor([walkLeg({ weather: weather({ apparentTempC: 20 }) })]).primary).toBe("idle");
  });

  it("umbrella-huddle when the engine resolved an owned umbrella", () => {
    const rainy = weather({ weatherCode: 61, precipMm: 2 });
    expect(stateFor([walkLeg({ weather: rainy })]).primary).toBe("umbrellaHuddle");
  });

  it("a text-only umbrella fallback is not an umbrella — no huddle", () => {
    const rainy = weather({ weatherCode: 61, precipMm: 2 });
    const state = stateFor([walkLeg({ weather: rainy })], inventory({ umbrellas: [] }));
    expect(state.primary).toBe("idle");
  });
});

describe("mascotStateFor — composition and priority (§13.9)", () => {
  it("shiver and wind-blown compose", () => {
    const state = stateFor([
      walkLeg({ windEffect: "amplified", weather: weather({ apparentTempC: 0, windKph: 10 }) }),
    ]);
    expect(state).toEqual({ primary: "windBlown", shivering: true });
  });

  it("shiver composes with every primary, including the huddle", () => {
    const state = stateFor([walkLeg({ weather: weather({ apparentTempC: 0, weatherCode: 61, precipMm: 2 }) })]);
    expect(state).toEqual({ primary: "umbrellaHuddle", shivering: true });
  });

  it("cold wins over hot if a journey ever manages both", () => {
    // Not reachable from Auckland weather — warmthLevel follows the coldest
    // leg and isHot the hottest — but the selector must still resolve it.
    const state = stateFor([
      walkLeg({ id: "leg-1", weather: weather({ apparentTempC: 0 }) }),
      walkLeg({ id: "leg-2", weather: weather({ apparentTempC: 26 }) }),
    ]);
    expect(state).toEqual({ primary: "idle", shivering: true });
  });

  it("rain outranks wind, which outranks sun, which outranks heat", () => {
    const everything = {
      windEffect: "amplified" as const,
      weather: weather({ weatherCode: 61, precipMm: 2, windKph: 10, uvIndex: 7, apparentTempC: 26 }),
    };
    expect(stateFor([walkLeg(everything)]).primary).toBe("umbrellaHuddle");

    // Same day without the rain: the wind takes it.
    const dry = { ...everything, weather: weather({ windKph: 10, uvIndex: 7, apparentTempC: 26 }) };
    expect(stateFor([walkLeg(dry)]).primary).toBe("windBlown");

    // ...and without the wind annotation, the sun.
    expect(stateFor([walkLeg({ weather: dry.weather })]).primary).toBe("sunSquint");

    // ...and without the UV, the heat.
    expect(stateFor([walkLeg({ weather: weather({ apparentTempC: 26 }) })]).primary).toBe("fanning");
  });
});

describe("mascotStateFor — reads the recommendation it is illustrating", () => {
  it("the same weather with a warmth calibration offset shivers when the engine says it is cold", () => {
    const legs = [walkLeg({ weather: weather({ apparentTempC: 5 }) })]; // level 3 uncalibrated
    const journey = journeyWithLegs(legs);
    const runsCold: WarmthCalibration = { offsetLevels: 1, sampleCount: 5 };

    expect(mascotStateFor(recommendGear(journey, inventory(), NO_CALIBRATION, "no-preference").signals).shivering).toBe(false);
    expect(mascotStateFor(recommendGear(journey, inventory(), runsCold, "no-preference").signals).shivering).toBe(true);
  });
});

describe("mascotStateFor — degenerate inputs", () => {
  it("a fully indoor journey has no outdoor legs to react to and stays idle", () => {
    const indoorLeg: JourneyLeg = { ...walkLeg({ mode: "bus", label: "Bus to Work" }), outdoor: false };
    const clothing: ClothingItem[] = [];
    expect(stateFor([indoorLeg], inventory({ clothing }))).toEqual({ primary: "idle", shivering: false });
  });
});

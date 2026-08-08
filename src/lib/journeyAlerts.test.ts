import {
  ALERT_HORIZON_MIN,
  annotationAlerts,
  gearTimingAlerts,
  topAlert,
  weatherAheadAlerts,
} from "./journeyAlerts";
import { WARM_OUTDOOR_C } from "./recommend";
import type { JourneyProgress } from "./journeyProgress";
import type { EnvironmentAnnotation, JourneyLeg, WeatherSnapshot } from "../types";

const START_ISO = "2026-07-30T08:00:00.000Z";

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    time: START_ISO,
    weatherCode: 0, // Dry, severity 0
    precipMm: 0,
    precipProbability: 0,
    tempC: 15,
    apparentTempC: 15,
    windKph: 8,
    windGustKph: 12,
    relativeHumidityPct: 70,
    uvIndex: 2,
    isDaylight: true,
    forecastConfidence: "high",
    ...overrides,
  };
}

function leg(overrides: Partial<JourneyLeg> & { id: string }): JourneyLeg {
  return {
    mode: "walk",
    label: "Walk to Kingsland Station",
    durationMin: 10,
    startTime: START_ISO,
    outdoor: true,
    weather: weather(),
    ...overrides,
  };
}

function progress(overrides: Partial<JourneyProgress> = {}): JourneyProgress {
  return {
    distanceAlongM: 100,
    distanceRemainingM: 900,
    fractionComplete: 0.1,
    currentLegIndex: 0,
    currentLegFraction: 0.5,
    completedLegIds: [],
    offRouteM: 5,
    isOffRoute: false,
    remainingMin: 20,
    etaMs: 0,
    ...overrides,
  };
}

// weatherCode 61 with precipMm <= 4 classifies as "Rain", severity 2.
const RAINY = weather({ weatherCode: 61, precipMm: 2 });

describe("weatherAheadAlerts", () => {
  it("warns about rain on a leg coming up", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", label: "Walk to Queen St", weather: RAINY })];
    const [alert] = weatherAheadAlerts(legs, progress());
    expect(alert).toBeDefined();
    expect(alert.message).toContain("rain");
    expect(alert.message).toContain("Queen St");
    expect(alert.legId).toBe("b");
  });

  it("stays quiet when conditions ahead are no worse", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b" })];
    expect(weatherAheadAlerts(legs, progress())).toEqual([]);
  });

  it("stays quiet when conditions ahead are better", () => {
    const legs = [leg({ id: "a", weather: RAINY }), leg({ id: "b" })];
    expect(weatherAheadAlerts(legs, progress())).toEqual([]);
  });

  it("ignores a change beyond the alert horizon", () => {
    const legs = [
      leg({ id: "a" }),
      leg({ id: "filler", durationMin: ALERT_HORIZON_MIN + 10 }),
      leg({ id: "far", weather: RAINY }),
    ];
    expect(weatherAheadAlerts(legs, progress())).toEqual([]);
  });

  it("reports only the first change, not every leg after it", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", weather: RAINY }), leg({ id: "c", weather: RAINY })];
    expect(weatherAheadAlerts(legs, progress())).toHaveLength(1);
  });

  it("skips indoor legs, which have no conditions of their own", () => {
    const legs = [leg({ id: "a" }), leg({ id: "indoor", mode: "indoor", outdoor: false, weather: undefined })];
    expect(weatherAheadAlerts(legs, progress())).toEqual([]);
  });
});

describe("gearTimingAlerts", () => {
  it("says when to get the umbrella out", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", label: "Walk to Queen St", weather: RAINY })];
    const alerts = gearTimingAlerts(legs, progress());
    expect(alerts.some((a) => a.message.startsWith("Umbrella out"))).toBe(true);
  });

  it("does not call for an umbrella on a covered stretch", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", weather: RAINY, rainCovered: true })];
    expect(gearTimingAlerts(legs, progress()).some((a) => a.id.startsWith("gear-umbrella"))).toBe(false);
  });

  it("tells you to put the umbrella away once you're under cover", () => {
    const legs = [leg({ id: "a", weather: RAINY, rainCovered: true })];
    const alerts = gearTimingAlerts(legs, progress());
    expect(alerts.some((a) => a.message === "Covered along here — umbrella down")).toBe(true);
  });

  it("warns about air conditioning when it's warm enough outside to have shed a layer", () => {
    const legs = [
      leg({ id: "a", weather: weather({ apparentTempC: WARM_OUTDOOR_C + 4 }) }),
      leg({ id: "bus", label: "Bus to Britomart", mode: "bus", outdoor: false, climate: "ac", weather: undefined }),
    ];
    const alerts = gearTimingAlerts(legs, progress());
    expect(alerts.some((a) => a.message.includes("air-conditioned"))).toBe(true);
  });

  it("stays quiet about air conditioning on a cold day", () => {
    const legs = [
      leg({ id: "a", weather: weather({ apparentTempC: WARM_OUTDOOR_C - 8 }) }),
      leg({ id: "bus", mode: "bus", outdoor: false, climate: "ac", weather: undefined }),
    ];
    expect(gearTimingAlerts(legs, progress()).some((a) => a.id.startsWith("gear-ac"))).toBe(false);
  });

  it("flags a stretch marked as a wind tunnel", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", windEffect: "amplified" })];
    expect(gearTimingAlerts(legs, progress()).some((a) => a.message.startsWith("Windy stretch"))).toBe(true);
  });

  it("flags a windy leg on the forecast alone", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", weather: weather({ windKph: 45 }) })];
    expect(gearTimingAlerts(legs, progress()).some((a) => a.id.startsWith("gear-wind"))).toBe(true);
  });

  it("reads the destination out of the leg label rather than the whole sentence", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", label: "Walk to Kingsland Station", weather: RAINY })];
    const [alert] = gearTimingAlerts(legs, progress());
    expect(alert.message).toContain("Kingsland Station");
    expect(alert.message).not.toContain("Walk to Kingsland Station");
  });

  it("says 'now' rather than 'in 1 min' for something immediate", () => {
    const legs = [leg({ id: "a", durationMin: 1 }), leg({ id: "b", weather: RAINY })];
    const [alert] = gearTimingAlerts(legs, progress({ currentLegFraction: 0.9 }));
    expect(alert.message).toContain("now");
  });
});

describe("annotationAlerts", () => {
  const spot: EnvironmentAnnotation = {
    id: "s1",
    label: "Queen St underpass",
    effect: "rain-cover",
    lat: -36.8485,
    lng: 174.7633,
    radiusM: 100,
    createdAt: START_ISO,
  };

  it("fires when the user is inside a saved spot", () => {
    const [alert] = annotationAlerts({ lat: spot.lat, lng: spot.lng }, [spot], new Set());
    expect(alert.message).toContain("Queen St underpass");
    expect(alert.message).toContain("covered");
  });

  it("stays quiet outside the radius", () => {
    expect(annotationAlerts({ lat: spot.lat + 0.01, lng: spot.lng }, [spot], new Set())).toEqual([]);
  });

  it("does not fire twice for the same spot", () => {
    expect(annotationAlerts({ lat: spot.lat, lng: spot.lng }, [spot], new Set(["s1"]))).toEqual([]);
  });
});

describe("topAlert", () => {
  it("prefers a weather change over gear timing and ambient notes", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", weather: RAINY, windEffect: "amplified" })];
    const p = progress();
    const chosen = topAlert([...weatherAheadAlerts(legs, p), ...gearTimingAlerts(legs, p)]);
    expect(chosen?.kind).toBe("weather");
  });

  it("returns null when there is nothing to say", () => {
    expect(topAlert([])).toBeNull();
  });

  it("does not mutate the array it was given", () => {
    const alerts = [
      { id: "b", kind: "gear" as const, message: "b", priority: 5 },
      { id: "a", kind: "weather" as const, message: "a", priority: 0 },
    ];
    topAlert(alerts);
    expect(alerts[0].id).toBe("b");
  });
});

describe("leg fragments in alert copy", () => {
  // "Waiting for the 15" produced "rain on the the 15 leg" — the label's own
  // article colliding with the one the sentence supplies.
  it("does not stutter the article", () => {
    const legs = [
      leg({ id: "a" }),
      leg({ id: "b", label: "Waiting for the 15", mode: "bus", isStationary: true, weather: weather({ precipMm: 2 }) }),
    ];
    const alerts = gearTimingAlerts(legs, progress({ currentLegIndex: 0, currentLegFraction: 0.5 }));
    const umbrella = alerts.find((a) => a.id.startsWith("gear-umbrella"));
    expect(umbrella?.message).toContain("on the 15 leg");
    expect(umbrella?.message).not.toContain("the the");
  });

  it("still names a leg that has no article of its own", () => {
    const legs = [leg({ id: "a" }), leg({ id: "b", label: "Walk to Queen St", weather: weather({ precipMm: 2 }) })];
    const alerts = gearTimingAlerts(legs, progress({ currentLegIndex: 0, currentLegFraction: 0.5 }));
    expect(alerts.find((a) => a.id.startsWith("gear-umbrella"))?.message).toContain("on the Queen St leg");
  });
});

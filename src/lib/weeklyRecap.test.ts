import {
  buildRecapLine,
  hasEnoughHistory,
  previousWeekWindow,
  weatherWord,
  weekKey,
  MIN_HISTORY_DAYS,
} from "./weeklyRecap";
import type { Journey, JourneyLeg, RecommendationSnapshot, WeatherSnapshot } from "../types";

// docs/13-extended-features.md §13.1. Everything here is judged on a fixed
// clock: the week boundaries are local-time arithmetic, which is exactly the
// kind of thing that works all week and then breaks on a Sunday.

const MONDAY = new Date(2026, 7, 17, 9, 0).getTime(); // Mon 17 Aug 2026, 9am
const SUNDAY = new Date(2026, 7, 23, 23, 30).getTime(); // the Sunday after

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    time: "2026-08-12T08:00:00.000Z",
    weatherCode: 0,
    precipMm: 0,
    precipProbability: 0,
    tempC: 15,
    apparentTempC: 14,
    windKph: 8,
    windGustKph: 14,
    relativeHumidityPct: 60,
    uvIndex: 2,
    isDaylight: true,
    forecastConfidence: "high",
    ...overrides,
  };
}

function leg(overrides: Partial<JourneyLeg> = {}): JourneyLeg {
  return {
    id: "leg",
    mode: "walk",
    label: "Walk",
    durationMin: 12,
    startTime: "2026-08-12T08:00:00.000Z",
    outdoor: true,
    weather: weather(),
    ...overrides,
  };
}

function journey(overrides: Partial<Journey> = {}): Journey {
  const place = { id: "p", label: "Home", address: "", lat: -36.8, lng: 174.7 };
  return {
    id: Math.random().toString(36).slice(2),
    origin: place,
    destination: { ...place, id: "q", label: "Work" },
    departTime: "2026-08-12T08:00:00.000Z",
    legs: [leg()],
    ...overrides,
  } as Journey;
}

function snapshot(overrides: Partial<RecommendationSnapshot> = {}): RecommendationSnapshot {
  return {
    layerNames: [],
    accessoryNames: [],
    shoeName: null,
    umbrellaName: null,
    notes: [],
    snapshotAt: "2026-08-12T08:00:00.000Z",
    ...overrides,
  };
}

describe("week boundaries", () => {
  it("files a recap under the Monday of the week it is shown in", () => {
    expect(weekKey(MONDAY)).toBe("2026-08-17");
    expect(weekKey(SUNDAY)).toBe("2026-08-17");
    // The following Monday is a different week, which is what makes the card
    // regenerate rather than sit there for a fortnight.
    expect(weekKey(SUNDAY + 3_600_000)).toBe("2026-08-24");
  });

  it("reports on the Mon–Sun that just finished, whichever day you open it", () => {
    const fromMonday = previousWeekWindow(MONDAY);
    expect(fromMonday.startIso).toBe(new Date(2026, 7, 10).toISOString());
    expect(fromMonday.endIso).toBe(new Date(2026, 7, 17).toISOString());
    expect(previousWeekWindow(SUNDAY)).toEqual(fromMonday);
  });
});

describe("hasEnoughHistory", () => {
  it("waits for two weeks of journeys before claiming to see a pattern", () => {
    const tooNew = new Date(MONDAY - (MIN_HISTORY_DAYS - 1) * 86_400_000).toISOString();
    const oldEnough = new Date(MONDAY - MIN_HISTORY_DAYS * 86_400_000).toISOString();
    expect(hasEnoughHistory(tooNew, MONDAY)).toBe(false);
    expect(hasEnoughHistory(oldEnough, MONDAY)).toBe(true);
  });

  it("says no when there are no journeys at all", () => {
    expect(hasEnoughHistory(undefined, MONDAY)).toBe(false);
  });
});

describe("weatherWord", () => {
  it("collapses the three rain labels into one word", () => {
    const light = journey({ legs: [leg({ weather: weather({ weatherCode: 51, precipMm: 0.2 }) })] });
    const heavy = journey({ legs: [leg({ weather: weather({ weatherCode: 65, precipMm: 9 }) })] });
    expect(weatherWord(light)).toBe("rainy");
    expect(weatherWord(heavy)).toBe("rainy");
  });

  it("reads the first outdoor leg, not the indoor one it starts with", () => {
    const j = journey({
      legs: [
        leg({ id: "a", mode: "indoor", outdoor: false, climate: "heated", weather: undefined }),
        leg({ id: "b", weather: weather({ weatherCode: 3 }) }),
      ],
    });
    expect(weatherWord(j)).toBe("overcast");
  });

  it("has nothing to say about a journey that never went outside", () => {
    const j = journey({ legs: [leg({ mode: "indoor", outdoor: false, climate: "ac", weather: undefined })] });
    expect(weatherWord(j)).toBeUndefined();
  });
});

describe("buildRecapLine", () => {
  it("stays quiet about a week that was barely a week", () => {
    expect(buildRecapLine([])).toBeNull();
    expect(buildRecapLine([journey()])).toBeNull();
  });

  it("names the weather most of the week had, and the gear it kept reaching for", () => {
    const rainy = () =>
      journey({
        legs: [leg({ weather: weather({ weatherCode: 61, precipMm: 2 }) })],
        recommendationSnapshot: snapshot({ layerNames: ["rain shell"], shoeName: "boots" }),
      });
    expect(buildRecapLine([rainy(), rainy(), rainy()])).toBe("Your week: 3 rainy trips, your rain shell got 3 uses.");
  });

  it("drops the gear clause rather than reporting a single outing", () => {
    const once = journey({ recommendationSnapshot: snapshot({ layerNames: ["fleece"] }) });
    const bare = journey();
    expect(buildRecapLine([once, bare])).toBe("Your week: 2 dry trips.");
  });

  it("breaks a weather tie towards the week you'd actually remember", () => {
    const dry = journey();
    const wet = journey({ legs: [leg({ weather: weather({ weatherCode: 61, precipMm: 2 }) })] });
    expect(buildRecapLine([dry, wet])).toBe("Your week: 1 rainy trip.");
  });

  it("still counts the trips when none of them had weather to speak of", () => {
    const indoors = () => journey({ legs: [leg({ mode: "indoor", outdoor: false, climate: "ac", weather: undefined })] });
    expect(buildRecapLine([indoors(), indoors()])).toBe("Your week: 2 trips.");
  });

  it("counts a journey once per item, however many slots named it", () => {
    // A jacket recommended as a layer and again as the spare is one outing
    // for that jacket, not two.
    const both = () =>
      journey({
        recommendationSnapshot: snapshot({ layerNames: ["parka", "parka"], accessoryNames: ["parka"] }),
      });
    expect(buildRecapLine([both(), both()])).toBe("Your week: 2 dry trips, your parka got 2 uses.");
  });
});

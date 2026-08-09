import { departureMode, dominantMode } from "./journeyMode";
import type { JourneyLeg } from "../types";

// docs/11-testing-strategy.md §11.1 — pure function with real branching
// logic (a fixed priority order), previously only exercised indirectly via
// JourneyDetailScreen's map accent and materializeToday.ts's re-plan mode.
function leg(mode: JourneyLeg["mode"]): JourneyLeg {
  return { id: mode, mode, label: mode, durationMin: 5, startTime: "2026-07-20T08:00:00.000Z", outdoor: mode !== "indoor" };
}

describe("dominantMode", () => {
  it("bus outranks drive/cycle/walk", () => {
    expect(dominantMode([leg("walk"), leg("cycle"), leg("drive"), leg("bus")])).toBe("bus");
  });

  it("train outranks drive/cycle/walk", () => {
    expect(dominantMode([leg("walk"), leg("drive"), leg("train")])).toBe("train");
  });

  it("drive outranks cycle/walk when no transit leg is present", () => {
    expect(dominantMode([leg("walk"), leg("cycle"), leg("drive")])).toBe("drive");
  });

  it("cycle outranks walk", () => {
    expect(dominantMode([leg("walk"), leg("cycle")])).toBe("cycle");
  });

  it("a short walk-to-stop connector doesn't make a bus trip read as walking", () => {
    expect(dominantMode([leg("walk"), leg("bus"), leg("walk")])).toBe("bus");
  });

  it("no legs (or no recognized mode) defaults to walk", () => {
    expect(dominantMode([])).toBe("walk");
    expect(dominantMode([leg("indoor")])).toBe("walk");
  });
});

describe("departureMode", () => {
  it("is the walk to the stop, not the bus the trip is mostly about", () => {
    // The case that prompted it: the origin marker sat on the footpath where
    // you're standing, wearing a bus glyph.
    expect(departureMode([leg("walk"), leg("bus"), leg("walk")])).toBe("walk");
    expect(dominantMode([leg("walk"), leg("bus"), leg("walk")])).toBe("bus");
  });

  it("skips indoor dwell legs", () => {
    expect(departureMode([leg("indoor"), leg("walk"), leg("train")])).toBe("walk");
  });

  it("skips a stationary wait before the ride", () => {
    const wait: JourneyLeg = { ...leg("bus"), id: "wait", isStationary: true };
    expect(departureMode([wait, leg("walk"), leg("bus")])).toBe("walk");
  });

  it("is the ride itself when a trip starts on it", () => {
    expect(departureMode([leg("drive")])).toBe("drive");
  });

  it("falls back to the dominant mode when nothing is travelled outdoors", () => {
    expect(departureMode([leg("indoor")])).toBe("walk");
    expect(departureMode([])).toBe("walk");
  });
});

import { formatDuration, spokenDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("keeps a sub-hour duration in minutes", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("splits an hour or more into hours and minutes", () => {
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(85)).toBe("1 h 25 min");
    expect(formatDuration(125)).toBe("2 h 5 min");
  });

  it("drops the minutes part on a whole number of hours", () => {
    expect(formatDuration(120)).toBe("2 h");
  });

  it("rounds to whole minutes", () => {
    expect(formatDuration(44.6)).toBe("45 min");
  });

  // A leg that claims to take no time at all reads as a bug, not as speed.
  it("never returns zero", () => {
    expect(formatDuration(0)).toBe("1 min");
    expect(formatDuration(0.2)).toBe("1 min");
    expect(formatDuration(-5)).toBe("1 min");
  });
});

describe("spokenDuration", () => {
  it("says the units out loud, for screen readers", () => {
    expect(spokenDuration(85)).toBe("1 hour 25 minutes");
    expect(spokenDuration(45)).toBe("45 minutes");
    expect(spokenDuration(120)).toBe("2 hours");
    expect(spokenDuration(61)).toBe("1 hour 1 minute");
  });
});

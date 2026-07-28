// The bounded-GPS behaviour behind the "Pick on map does nothing" bug.
//
// `getCurrentPositionAsync` resolves only when the device gets a real fix
// and has no timeout of its own, so indoors it can hang indefinitely. Every
// caller blocks a piece of UI on it, which turns slow hardware into what
// looks like a dead button. These tests pin the timeout and the
// last-known-first ordering, because both are invisible when they work and
// the failure they prevent is silent.
import { AUCKLAND, getPositionWithinTimeout, isNullIsland, resolveApproximateLocation } from "./approximateLocation";

const mockGetLastKnown = jest.fn();
const mockGetCurrent = jest.fn();
const mockGetPermissions = jest.fn();

jest.mock("expo-location", () => ({
  getLastKnownPositionAsync: (...a: unknown[]) => mockGetLastKnown(...a),
  getCurrentPositionAsync: (...a: unknown[]) => mockGetCurrent(...a),
  getForegroundPermissionsAsync: (...a: unknown[]) => mockGetPermissions(...a),
  Accuracy: { Balanced: 3 },
}));

jest.mock("../db/repositories/settings", () => ({
  getDefaultLocation: async () => undefined,
}));

const coords = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng } });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLastKnown.mockResolvedValue(null);
  mockGetCurrent.mockResolvedValue(coords(-36.85, 174.76));
  mockGetPermissions.mockResolvedValue({ granted: true });
});

describe("getPositionWithinTimeout", () => {
  it("uses the cached fix without asking for a fresh one", async () => {
    mockGetLastKnown.mockResolvedValue(coords(-36.9, 174.8));

    expect(await getPositionWithinTimeout()).toEqual({ lat: -36.9, lng: 174.8 });
    // The whole point of trying last-known first: it returns instantly,
    // where a fresh fix may not return at all.
    expect(mockGetCurrent).not.toHaveBeenCalled();
  });

  it("falls back to a fresh fix when nothing is cached", async () => {
    expect(await getPositionWithinTimeout()).toEqual({ lat: -36.85, lng: 174.76 });
    expect(mockGetCurrent).toHaveBeenCalled();
  });

  it("gives up rather than hanging when no fix ever arrives", async () => {
    // The actual bug: a promise that never settles. Before the timeout this
    // left the map picker on its spinner forever.
    mockGetCurrent.mockReturnValue(new Promise(() => {}));

    jest.useFakeTimers();
    const pending = getPositionWithinTimeout(8000);
    await jest.advanceTimersByTimeAsync(8000);
    const result = await pending;
    jest.useRealTimers();

    expect(result).toBeNull();
  });

  it("rejects a (0,0) fix from either source", async () => {
    mockGetLastKnown.mockResolvedValue(coords(0, 0));
    mockGetCurrent.mockResolvedValue(coords(0, 0));
    expect(await getPositionWithinTimeout()).toBeNull();
  });

  it("survives the cached lookup throwing", async () => {
    mockGetLastKnown.mockRejectedValue(new Error("no provider"));
    expect(await getPositionWithinTimeout()).toEqual({ lat: -36.85, lng: 174.76 });
  });
});

describe("resolveApproximateLocation", () => {
  it("never prompts, and falls back to Auckland without permission", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false });

    const result = await resolveApproximateLocation();

    expect(result).toEqual({ ...AUCKLAND, isFallback: true });
    expect(mockGetCurrent).not.toHaveBeenCalled();
    expect(mockGetLastKnown).not.toHaveBeenCalled();
  });

  it("falls back to Auckland when the fix times out", async () => {
    // The seeding path must always produce something: the picker renders a
    // spinner until it does.
    mockGetCurrent.mockReturnValue(new Promise(() => {}));

    jest.useFakeTimers();
    const pending = resolveApproximateLocation();
    await jest.advanceTimersByTimeAsync(10_000);
    const result = await pending;
    jest.useRealTimers();

    expect(result).toEqual({ ...AUCKLAND, isFallback: true });
  });

  it("reports a real fix as not a fallback", async () => {
    mockGetLastKnown.mockResolvedValue(coords(-41.29, 174.78));
    expect(await resolveApproximateLocation()).toEqual({ lat: -41.29, lng: 174.78, isFallback: false });
  });
});

describe("isNullIsland", () => {
  it("only matches exactly (0, 0)", () => {
    expect(isNullIsland(0, 0)).toBe(true);
    expect(isNullIsland(0, 0.0001)).toBe(false);
    expect(isNullIsland(-36.85, 174.76)).toBe(false);
  });
});

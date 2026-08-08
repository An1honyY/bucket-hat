import {
  deferToFirstService,
  longTransferWaitMin,
  LONG_WAIT_MIN,
  PLATFORM_BUFFER_MIN,
  type DeferrableLeg,
} from "./deferDeparture";

const MIDNIGHT = "2026-08-09T12:08:00.000Z";

function leg(mode: string, durationMin: number, isStationary = false): DeferrableLeg {
  return { mode, durationMin, isStationary };
}

// The real trip that prompted this: ask for a bus at 12:08 am from Titirangi
// and the first 195 is at 5:52 am.
const OVERNIGHT = [leg("walk", 23), leg("bus", 321, true), leg("bus", 40), leg("walk", 10)];

describe("deferToFirstService", () => {
  it("moves the departure to meet the first service", () => {
    const result = deferToFirstService(OVERNIGHT, MIDNIGHT);
    expect(result.deferredFrom).toBe(MIDNIGHT);
    expect(result.deferredByMin).toBe(321 - PLATFORM_BUFFER_MIN);
    // 12:08 am + 5h16m = 5:24 am, so the 23-minute walk lands at 5:47 and the
    // 5-minute buffer runs out exactly at the 5:52 service.
    expect(result.departTime).toBe("2026-08-09T17:24:00.000Z");
  });

  it("leaves the service where it was — the ride must not move", () => {
    const result = deferToFirstService(OVERNIGHT, MIDNIGHT);
    const before = new Date(MIDNIGHT).getTime() + (23 + 321) * 60_000;
    const after =
      new Date(result.departTime).getTime() + (23 + PLATFORM_BUFFER_MIN) * 60_000;
    expect(after).toBe(before);
  });

  it("keeps a margin at the stop rather than arriving on the dot", () => {
    const result = deferToFirstService(OVERNIGHT, MIDNIGHT);
    expect(result.legs[1].durationMin).toBe(PLATFORM_BUFFER_MIN);
  });

  it("leaves an ordinary wait alone — waiting 20 minutes for a bus is a real thing people do", () => {
    const normal = [leg("walk", 8), leg("bus", 20, true), leg("bus", 25)];
    const result = deferToFirstService(normal, MIDNIGHT);
    expect(result.departTime).toBe(MIDNIGHT);
    expect(result.deferredFrom).toBeUndefined();
    expect(result.legs).toBe(normal);
  });

  it("does not move a transfer — that bus has already been caught", () => {
    const transfer = [leg("walk", 8), leg("bus", 30), leg("train", 200, true), leg("train", 25)];
    const result = deferToFirstService(transfer, MIDNIGHT);
    expect(result.departTime).toBe(MIDNIGHT);
    expect(result.deferredFrom).toBeUndefined();
  });

  it("defers when the wait comes first, with no walk in front of it", () => {
    const result = deferToFirstService([leg("bus", 90, true), leg("bus", 20)], MIDNIGHT);
    expect(result.deferredByMin).toBe(90 - PLATFORM_BUFFER_MIN);
  });

  it("does nothing to a journey with no waits at all", () => {
    const walking = [leg("walk", 52)];
    expect(deferToFirstService(walking, MIDNIGHT).departTime).toBe(MIDNIGHT);
  });

  it("sits exactly on the threshold without deferring", () => {
    const atThreshold = [leg("walk", 5), leg("bus", LONG_WAIT_MIN - 1, true), leg("bus", 10)];
    expect(deferToFirstService(atThreshold, MIDNIGHT).deferredFrom).toBeUndefined();
    const overThreshold = [leg("walk", 5), leg("bus", LONG_WAIT_MIN, true), leg("bus", 10)];
    expect(deferToFirstService(overThreshold, MIDNIGHT).deferredFrom).toBe(MIDNIGHT);
  });

  it("refuses an unparseable departure rather than producing an Invalid Date", () => {
    const result = deferToFirstService(OVERNIGHT, "not a date");
    expect(result.departTime).toBe("not a date");
    expect(result.deferredFrom).toBeUndefined();
  });

  it("does not mutate the legs it was given", () => {
    const legs = [leg("walk", 23), leg("bus", 321, true)];
    deferToFirstService(legs, MIDNIGHT);
    expect(legs[1].durationMin).toBe(321);
  });
});

describe("longTransferWaitMin", () => {
  it("finds a long wait that follows a ride", () => {
    const transfer = [leg("walk", 8), leg("bus", 30), leg("train", 95, true), leg("train", 25)];
    expect(longTransferWaitMin(transfer)).toBe(95);
  });

  it("ignores the leading wait, which the deferral already handled", () => {
    expect(longTransferWaitMin(OVERNIGHT)).toBeUndefined();
  });

  it("ignores a short transfer wait", () => {
    const transfer = [leg("bus", 30), leg("train", 12, true), leg("train", 25)];
    expect(longTransferWaitMin(transfer)).toBeUndefined();
  });
});

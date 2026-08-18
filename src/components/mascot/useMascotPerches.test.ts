import { choosePerch, perchOffsetX, type PerchCandidate } from "./useMascotPerches";
import { mascotClearance, mascotFeetOffset } from "./MascotBase";

// The perch choice is the one piece of the mascot's placement that is logic
// rather than judged-by-eye pose data, and since his room moves with him it is
// also the piece that can strand him or lurch the page. The numbers below are
// Today's real layout at 96pt: he needs 75px bare, and the top card buys him
// all of it while the hourly card buys only the 24 its own empty corner
// doesn't already cover.

const CLEARANCE = mascotClearance(96, false);

/** Today's stack, as measured with `active` standing on it. */
function todayPerches(active: number): PerchCandidate[] {
  const rooms = [CLEARANCE, 24, 0];
  // Where each card sits with nobody on the screen at all.
  const bases = [0, 420, 900];
  return bases.map((base, index) => ({
    index,
    y: base + (index >= active ? rooms[active] : 0),
    room: rooms[index],
  }));
}

describe("mascotClearance", () => {
  it("reserves the character, not his box, when he has no umbrella", () => {
    // The box carries the umbrella's headroom whether or not he is holding
    // one — reserving it is what made Today's cards pay for rain in the sun.
    expect(mascotClearance(96, false)).toBe(75);
    expect(mascotClearance(96, false)).toBeLessThan(mascotFeetOffset(96));
  });

  it("reserves the whole box once he is holding one, since the canopy fills it", () => {
    expect(mascotClearance(96, true)).toBe(mascotFeetOffset(96));
  });

  it("scales with the rendered size", () => {
    // §9.7's secondary placement, on Journey Detail.
    expect(mascotClearance(64, false)).toBe(50);
  });
});

describe("choosePerch", () => {
  it("keeps him on the top card while its own room is still on screen", () => {
    const choice = choosePerch(todayPerches(0), 0, CLEARANCE, 40, false);
    expect(choice).toMatchObject({ index: 0 });
  });

  it("hands back the room that is already scrolled past, so the page can be held still", () => {
    const choice = choosePerch(todayPerches(0), 0, CLEARANCE, 300, false);
    // He leaves the top card, and its 75px of room goes with it — all of it
    // above the viewport, so the offset has to come down by the same 75.
    expect(choice).toEqual({ index: 1, roomAboveViewport: 75, scrollBase: 225 });
  });

  it("comes back to the top card at the top, though its room isn't in the layout yet", () => {
    // The regression this guards: judged without the room it would gain, the
    // top card can never clear its own height again and he never returns.
    expect(choosePerch(todayPerches(1), 1, CLEARANCE, 0, false)).toMatchObject({ index: 0 });
  });

  it("doesn't disturb the offset when the room he is leaving is fully on screen", () => {
    const choice = choosePerch(todayPerches(1), 1, CLEARANCE, 0, false);
    expect(choice).toMatchObject({ roomAboveViewport: 0, scrollBase: 0 });
  });

  it("falls back to the last perch rather than stranding him off screen", () => {
    expect(choosePerch(todayPerches(1), 1, CLEARANCE, 5000, false)).toMatchObject({ index: 2 });
  });

  it("pins him to the first perch when motion is reduced, wherever the scroll is", () => {
    expect(choosePerch(todayPerches(0), 0, CLEARANCE, 3000, true)).toMatchObject({ index: 0 });
  });

  it("has nothing to say before anything has been measured", () => {
    expect(choosePerch([], 0, CLEARANCE, 0, false)).toBeNull();
  });

  it("holds a perch it has just moved to — one settle, one hop", () => {
    // Re-run against the layout the previous answer produces: the choice has
    // to be a fixed point, or he hops down the page a card per frame.
    const first = choosePerch(todayPerches(0), 0, CLEARANCE, 300, false)!;
    const second = choosePerch(todayPerches(first.index), first.index, CLEARANCE, first.scrollBase, false)!;
    expect(second.index).toBe(first.index);
    expect(second.scrollBase).toBe(first.scrollBase);
  });
});

describe("perchOffsetX", () => {
  const perch = { x: 20, y: 0, width: 360, align: "center" as const };

  it("centres him on a perch with empty space above it", () => {
    expect(perchOffsetX(perch, 96)).toBe(152);
  });

  it("puts him at the clear end of a perch whose left side is occupied", () => {
    expect(perchOffsetX({ ...perch, align: "right" }, 96)).toBe(284);
    expect(perchOffsetX({ ...perch, align: "left" }, 96)).toBe(20);
  });
});

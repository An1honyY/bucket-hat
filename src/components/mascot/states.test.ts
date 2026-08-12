import { createBeatBag, GREETING, GREETING_MS, MASCOT_ANIMATIONS } from "./states";

// The bag is the only logic in the mascot's animation layer — everything else
// is pose data judged by rendering it. Worth pinning because both of its
// properties are invisible on screen until you have watched for a minute:
// that nothing gets starved, and that a beat never plays twice in a row.

/** Deterministic stand-in for Math.random, so a shuffle test can't flake. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("createBeatBag", () => {
  it("deals every beat equally often — no behaviour gets starved", () => {
    const next = createBeatBag(10, seeded(1));
    const counts = new Array(10).fill(0);
    let current = 0;
    for (let i = 0; i < 500; i++) {
      current = next(current);
      counts[current]++;
    }
    expect(counts).toEqual(new Array(10).fill(50));
  });

  it("never deals the same beat twice in a row, including across a refill", () => {
    for (const seed of [1, 7, 99, 12345]) {
      const next = createBeatBag(4, seeded(seed));
      let current = 0;
      const drawn: number[] = [];
      for (let i = 0; i < 200; i++) {
        const previous = current;
        current = next(current);
        expect(current).not.toBe(previous);
        drawn.push(current);
      }
      // ...and it is genuinely reordering, not just cycling 0,1,2,3.
      expect(new Set(drawn.slice(0, 4).join(",") + "|" + drawn.slice(4, 8).join(",")).size).toBeGreaterThan(1);
    }
  });

  it("a single-beat state just repeats that beat", () => {
    const next = createBeatBag(1, seeded(1));
    expect([next(0), next(0), next(0)]).toEqual([0, 0, 0]);
  });
});

type Beat = (typeof MASCOT_ANIMATIONS.idle.beats)[number];

const totalMs = (beats: Beat[]) => beats.reduce((sum, b) => sum + b.frames.reduce((s, f) => s + f.ms, 0), 0);

/** Standing still: no body motion and no frame that moves a limb. Blinking
 *  still counts as resting — the eyes are not a limb, and a rest that doesn't
 *  blink is a freeze. */
const isRest = (beat: Beat) =>
  !beat.body &&
  !beat.frames.some(
    (f) => f.pose.leftFlipperDeg || f.pose.rightFlipperDeg || f.pose.leftFootLift || f.pose.rightFootLift
  );

describe("beat definitions", () => {
  it("every state has at least one beat and idle is the only one with several", () => {
    for (const [name, animation] of Object.entries(MASCOT_ANIMATIONS)) {
      expect(animation.beats.length).toBeGreaterThan(0);
      if (name !== "idle") expect(animation.beats).toHaveLength(1);
    }
    expect(MASCOT_ANIMATIONS.idle.beats.length).toBeGreaterThan(1);
  });

  it("idle spends more of a pass standing still than moving", () => {
    // The whole point of the rest beats: a character that never stops reads
    // as a mechanism. Measured in time rather than in beats, because that is
    // what someone looking at the screen experiences — one three-second rest
    // outweighs three foot taps.
    const beats = MASCOT_ANIMATIONS.idle.beats;
    const resting = totalMs(beats.filter(isRest));
    expect(resting).toBeGreaterThan(totalMs(beats.filter((b) => !isRest(b))));
  });

  it("he never holds completely motionless for more than a couple of seconds", () => {
    // The bag can deal every rest in a row, so this can't be enforced by the
    // mix — it has to hold beat by beat. Rendered, ten seconds of nothing
    // read as a hung view rather than as a calm animal, which is why the
    // blink lives inside `rest()` and splits it.
    for (const beat of MASCOT_ANIMATIONS.idle.beats.filter(isRest)) {
      for (const frame of beat.frames) {
        expect(frame.ms).toBeLessThan(2000);
      }
    }
  });

  it("a rocking beat holds its frame exactly as long as the rock takes", () => {
    // Decoupling these is what makes a beat end mid-swing and snap the
    // character upright, so it is worth asserting rather than eyeballing.
    for (const animation of [...Object.values(MASCOT_ANIMATIONS), { beats: [] }]) {
      for (const beat of animation.beats) {
        const { rockDeg, periodMs = 1500, cycles } = beat.body ?? {};
        if (!rockDeg || cycles === undefined) continue;
        const frameMs = beat.frames.reduce((total, f) => total + f.ms, 0);
        expect(frameMs).toBe(2 * periodMs * cycles);
      }
    }
  });

  it("the greeting is a single beat, so the bag can never cut it short", () => {
    expect(GREETING.beats).toHaveLength(1);
    // A greeting that outstays its welcome stops reading as a greeting. It
    // also blocks the weather state from showing for exactly this long.
    expect(GREETING_MS).toBeLessThan(1200);
  });
});

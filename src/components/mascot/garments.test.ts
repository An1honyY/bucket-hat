import {
  UMBRELLA_CANOPY,
  UMBRELLA_PANEL_LIT,
  UMBRELLA_PANEL_SHADED,
  UMBRELLA_POINTS,
  UMBRELLA_SEAMS,
  UMBRELLA_SHAFT,
  UMBRELLA_SHAFT_WIDTH,
  GARMENT_OUTLINE_WIDTH,
} from "./garments";
import { VIEW_BOX_HEADROOM, VIEW_BOX_UNITS } from "./MascotBase";

// The umbrella is the one garment generated from constants rather than drawn,
// so its shape is genuinely re-tunable — tilt, radius, dome, shaft length are
// all one number each. That is the point, and it is also the risk: every one
// of them moves the canopy towards an edge of the viewBox, and going over is
// invisible in a unit test and subtle on screen (a clipped rim just looks like
// a slightly straighter rim). These tests are the guard rail for that tuning.
//
// Everything else about the umbrella was judged by rendering it; nothing here
// tries to assert that it looks like an umbrella.

type Point = [number, number];

/**
 * Points *on* a generated path, sampled along each segment.
 *
 * The obvious shortcut — read every coordinate in the string and treat the
 * control points as the bound — is far too pessimistic to be useful here: the
 * canopy's shoulder control sits at y −48.7 while the curve it shapes only
 * reaches −44.9, so that version condemns a shape with three units to spare.
 * Bézier curves stay well inside their control hull, so this walks them.
 *
 * Only the commands `u()` actually emits are handled — absolute M/L/C/Q/z, no
 * arcs, no relative moves, no exponent notation — and anything else throws
 * rather than being silently skipped past.
 */
function samples(d: string, steps = 64): Point[] {
  const out: Point[] = [];
  let cursor: Point = [0, 0];
  let start: Point = [0, 0];
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  for (const [, command, body] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const n = (body.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const at = (i: number): Point => [n[i * 2], n[i * 2 + 1]];
    switch (command) {
      case "M":
        cursor = start = at(0);
        out.push(cursor);
        break;
      case "L":
        cursor = at(0);
        out.push(cursor);
        break;
      case "C": {
        const [p1, p2, p3] = [at(0), at(1), at(2)];
        const p0 = cursor;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const b = (a: number, b1: number, c: number, dd: number) =>
            lerp(lerp(lerp(a, b1, t), lerp(b1, c, t), t), lerp(lerp(b1, c, t), lerp(c, dd, t), t), t);
          out.push([b(p0[0], p1[0], p2[0], p3[0]), b(p0[1], p1[1], p2[1], p3[1])]);
        }
        cursor = p3;
        break;
      }
      case "Q": {
        const [p1, p2] = [at(0), at(1)];
        const p0 = cursor;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const b = (a: number, b1: number, c: number) => lerp(lerp(a, b1, t), lerp(b1, c, t), t);
          out.push([b(p0[0], p1[0], p2[0]), b(p0[1], p1[1], p2[1])]);
        }
        cursor = p2;
        break;
      }
      case "z":
      case "Z":
        cursor = start;
        out.push(cursor);
        break;
      default:
        throw new Error(`unhandled path command "${command}" — this sampler only knows M/L/C/Q/z`);
    }
  }
  return out;
}

const PATHS: Record<string, string> = {
  canopy: UMBRELLA_CANOPY,
  shaft: UMBRELLA_SHAFT,
  panelLit: UMBRELLA_PANEL_LIT,
  panelShaded: UMBRELLA_PANEL_SHADED,
  seam0: UMBRELLA_SEAMS[0],
  seam1: UMBRELLA_SEAMS[1],
};

/** Half the widest stroke any of it carries — the outline on the canopy. */
const INK = Math.max(GARMENT_OUTLINE_WIDTH, UMBRELLA_SHAFT_WIDTH) / 2;

describe("the umbrella fits the box it made room for", () => {
  it.each(Object.entries(PATHS))("%s stays inside the viewBox, stroke included", (_name, d) => {
    for (const [x, y] of samples(d)) {
      expect(x).toBeGreaterThanOrEqual(INK);
      expect(x).toBeLessThanOrEqual(VIEW_BOX_UNITS - INK);
      expect(y).toBeGreaterThanOrEqual(-VIEW_BOX_HEADROOM + INK);
    }
  });

  it("actually uses the headroom — otherwise the box is taller than it needs to be", () => {
    const top = Math.min(...samples(UMBRELLA_CANOPY).map(([, y]) => y));
    expect(top).toBeLessThan(0);
    // Within 12 units of the ceiling. Slack beyond that means either the
    // canopy shrank or the headroom grew, and every placement is paying for
    // space nothing occupies.
    expect(top).toBeGreaterThan(-VIEW_BOX_HEADROOM);
    expect(top + VIEW_BOX_HEADROOM).toBeLessThan(12);
  });

  it("shelters his head rather than sitting off to one side", () => {
    // The rim's low end has to reach past the middle of the hat, or the
    // umbrella reads as held aloft beside him. It cannot reach the far side —
    // see garments.ts for why that is geometry, not laziness.
    const [rightX] = UMBRELLA_POINTS.rightTip.split(" ").map(Number);
    expect(rightX).toBeGreaterThan(VIEW_BOX_UNITS / 2);
  });
});

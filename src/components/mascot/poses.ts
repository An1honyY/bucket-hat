import type { MascotPose } from "./MascotBase";

// Reference poses for the mascot, kept while the character is still being
// finalised.
//
// These exist as typed constants rather than as notes in a doc for one
// reason: a note describing "half-lidded, gaze down" drifts silently the
// moment the pose API changes, whereas this file stops compiling. Everything
// here is a real, renderable pose.
//
// These are the shortlist the *character* was judged on, and they stay for
// that: a fixed set of expressions to check the art against.
//
// They are no longer what ships. `states.ts` holds the poses §13.9's states
// actually render, and where the two overlap (wave, sun-squint) the numbers
// differ — see the notes below. If you are changing how a state looks, change
// states.ts; this file is a reference sheet.

export const REFERENCE_POSES: { key: string; label: string; note: string; pose: MascotPose }[] = [
  {
    key: "base",
    label: "Base",
    note: "The artwork exactly as supplied. The control everything else is judged against.",
    pose: {},
  },
  {
    key: "happy",
    label: "Happy",
    note:
      "Closed upturned eyes with the beak open. The eyes are replaced outright rather than " +
      "covered by a lid, so there's no seam — this is the cleanest of the expressions.",
    pose: { eyes: "happy", mouth: "open" },
  },
  {
    key: "curious",
    label: "Curious",
    note: "Whole-body tilt plus a glance up and across. The tilt is deliberately small; past about 8° he looks unsteady.",
    pose: { tiltDeg: -7, gazeX: -2, gazeY: -2 },
  },
  {
    key: "content",
    label: "Content",
    note:
      "Half-lidded with the gaze dropped. The roughest of the set: the lid is drawn over the " +
      "supplied eye shapes rather than being part of them, so it has a hard edge. Worth " +
      "redrawing in the source art if this state ships.",
    pose: { eyes: "half", gazeY: 1.5 },
  },
  {
    key: "surprised",
    label: "Surprised",
    note: "Shrunken pupils in the full eye whites, beak open. Reads clearly even at 64pt.",
    pose: { eyes: "wide", mouth: "open", gazeY: -1 },
  },
  {
    key: "wave",
    label: "Wave",
    note:
      "One flipper up. §13.9's on-focus greeting; the raise is what the wave animation drives. " +
      "The shipped wave peaks at 86°, not 55 — rendered, 55° is an arm held out rather than up.",
    pose: { rightFlipperDeg: 55, eyes: "happy" },
  },
  {
    key: "shield",
    label: "Sun-squint",
    note:
      "§13.9's HIGH_UV_INDEX state. Written as 'a flipper up near the brow' — but at 48° it " +
      "renders as pointing, not shading, which is why states.ts uses 88°. Kept as the record " +
      "of what the pose was meant to be.",
    pose: { leftFlipperDeg: 48, eyes: "half" },
  },
];

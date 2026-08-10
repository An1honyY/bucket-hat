import type { MascotPose } from "./MascotBase";

// Reference poses for the mascot, kept while the character is still being
// finalised.
//
// These exist as typed constants rather than as notes in a doc for one
// reason: a note describing "half-lidded, gaze down" drifts silently the
// moment the pose API changes, whereas this file stops compiling. Everything
// here is a real, renderable pose.
//
// Nothing consumes these yet. Phase 21's `mascotStateFor()` (docs/13 §13.9)
// maps engine signals onto the states below; until then they're the shortlist
// the character was judged on, preserved so the work isn't repeated.

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
    note: "One flipper up. §13.9's on-focus greeting; the raise is what the wave animation drives.",
    pose: { rightFlipperDeg: 55, eyes: "happy" },
  },
  {
    key: "shield",
    label: "Sun-squint",
    note: "§13.9's HIGH_UV_INDEX state — a flipper up near the brow, eyes narrowed.",
    pose: { leftFlipperDeg: 48, eyes: "half" },
  },
];

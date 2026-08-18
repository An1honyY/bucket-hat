import Svg, { Ellipse, G, Path } from "react-native-svg";
import {
  GARMENT_HIGHLIGHT,
  GARMENT_HIGHLIGHT_OPACITY,
  GARMENT_OUTLINE,
  GARMENT_OUTLINE_WIDTH,
  GARMENT_SEAM_WIDTH,
  GARMENT_SHADE,
  GARMENT_SHADE_OPACITY,
  JACKET,
  JACKET_SLEEVE_EDGE,
  JACKET_HIGHLIGHT,
  JACKET_SEAMS,
  JACKET_SLEEVE,
  UMBRELLA_ARM_DEG,
  UMBRELLA_CANOPY,
  UMBRELLA_PANEL_LIT,
  UMBRELLA_PANEL_SHADED,
  UMBRELLA_SEAMS,
  UMBRELLA_SHAFT,
  UMBRELLA_SHAFT_WIDTH,
} from "./garments";

// The mascot, from the second QuiverAI illustration Antony supplied — the one
// with the reworked bucket hat.
//
// Everything is that artwork's own path data, verbatim, with a single
// exception: the torso outline has had its two wing excursions carved out, and
// those wings are redrawn as separate limbs so they can move.
//
// That surgery is unavoidable, and it is the third time it has been attempted,
// so the reasoning is worth stating once properly. In the source, head, body
// and both wings are a single closed outline: the path runs up one wing,
// across the top of the head, down the other wing, and around the belly.
// Nothing that is part of a shape's own contour can be rotated away from it.
// An earlier attempt rotated the `#258AD6` wing *shading* instead, which slid
// a detail mark across the belly while the flipper stayed welded to the torso
// — it read as the penguin sprouting a direction arrow.
//
// What is different this time: the wing coordinates are traced out of the
// source path's own curve data, and the torso resumes at exactly the points
// where the source's outline branches into each wing. Earlier attempts
// replaced the whole body with a hand-drawn approximation and lost the
// character. Here, at rest, the silhouette is the artwork's.
//
// The navy outline is a stroke on the same path rather than a second traced
// silhouette, which is what keeps it an even width across the torso and the
// moving wings alike.
//
// A 0.93 vertical squash (for shorter, rounder proportions) used to be applied
// as a wrapping transform. It is now baked into every coordinate below,
// because a global transform meant the numbers in this file were not the
// numbers on screen — which quietly invalidated a round of pixel measurements
// taken against them. If the proportions need changing again, re-bake rather
// than re-wrap. Note the source art's own y values therefore no longer match
// the QuiverAI file: multiply by 0.93 about y = 143 to compare.

/** Artwork units across. Exported so a wrapper can convert the pivot below
 *  into its own coordinate space without hard-coding 150 a second time. This
 *  is also what `size` means at every call site: the *width* in px. */
export const VIEW_BOX_UNITS = 150;

/**
 * Empty artwork units above the character, so an umbrella has somewhere to be.
 *
 * The character himself fits 0–150 exactly and his hat crown already reaches
 * y ≈ 16, so a canopy over his head has no room at all in the square box. This
 * lifts the top of the viewBox instead of shrinking him.
 *
 * It is **constant**, not added only when he is holding one: `mascotFeetOffset`
 * is what every placement measures against, and a box that changed height with
 * the weather would move him relative to the line he stands on. The box is
 * transparent and `pointerEvents="none"` at both placements, so the blank
 * space costs nothing.
 *
 * What a *layout* reserves for him is a different number — `mascotClearance`,
 * which is his drawn extent rather than his box, and which does follow the
 * umbrella. Reserving the box was the same mistake in the opposite direction:
 * it made every screen pay for the umbrella's headroom in the sunshine.
 */
export const VIEW_BOX_HEADROOM = 48;

/** The box's height in artwork units — no longer square. */
export const VIEW_BOX_HEIGHT_UNITS = VIEW_BOX_UNITS + VIEW_BOX_HEADROOM;
const VIEW_BOX = `0 ${-VIEW_BOX_HEADROOM} ${VIEW_BOX_UNITS} ${VIEW_BOX_HEIGHT_UNITS}`;

/** Where the whole character pivots: the feet, not the centre. `tiltDeg` uses
 *  it below, and Mascot.tsx's animated lean has to pivot about the same point
 *  or the two rotations disagree about where the ground is. */
export const TILT_ORIGIN = { x: 75, y: 133.7 };

/**
 * The top of the character himself: his hat crown, in artwork units.
 *
 * Not a drawing constant — nothing below is positioned from it — but the one
 * number a layout needs in order to reserve the space he actually occupies
 * instead of the space his box occupies. Two independent measurements agree on
 * it: the crown sits at y ≈ 16 in the source art, and at 64pt the hat was
 * measured on screen at 50px above his feet, which is (133.7 − 16) / 150 × 64.
 */
export const CROWN_Y = 16;

/** Half the distance between the two feet's centres (they sit at x ≈ 55 and
 *  x ≈ 95 in the paths below). Mascot.tsx offsets the pivot by this to rock
 *  the character over one foot rather than about the point between them —
 *  rotating about `TILT_ORIGIN` sends the far foot through the ground. */
export const HALF_STANCE = 20;

// Palette, lifted from the source art's stylesheet. Nothing invents a colour.
const NAVY = "#081834";
const BLUE = "#2FAAF7";
const BLUE_SHADE = "#258AD6";
const WHITE = "#FFFFFF";
const WHITE_SHADE = "#DDDDDD";
const EYE = "#242528";
const BEAK = "#FFB50A";
const BEAK_DARK = "#66340A";
const FOOT = "#D97A16";
const FOOT_STROKE = "#5B2C0B";
const FOOT_MID = "#FDB016";
const FOOT_LIGHT = "#E09A48";
// Hat tones sampled from the launcher icon (`assets/header-logo.png`) rather
// than taken from the illustration, so the companion and the app mark wear the
// same hat. Its three dominant fills are #d2ae6d, #a3854b and #655132.
const HAT = "#D2AE6D";
const HAT_MID = "#A3854B";
const HAT_DARK = "#655132";

/**
 * The torso with the wings removed.
 *
 * Traced from the source's blue body path. It follows it exactly — the top of
 * the head as the straight `l55.9 1.2`, down the right shoulder to (108.5,
 * 71.4) — and then, where the original swings out into the right wing, carries
 * straight down the flank to (110.9, 83.6), which is the point the source's
 * own outline returns to. Same on the left, between (36.8, 101.6) and the
 * shoulder at (43, 69.9).
 */
const TORSO =
  "M104.4 53.35" +
  "C105.5 57.53 107.6 66.18 108.4 74.55 L108.5 76.41" +
  "C109.8 81.06 110.6 84.69 110.9 87.76" +
  "C111.8 90.92 113.3 101.71 112.4 110.54" +
  "C113 109.99 113.5 109.15 114 108.5" +
  "C113.2 119.84 107 127.28 100.9 131.38" +
  "C97.6 132.68 94.4 133.24 92.6 133.7 L92.8 133.24" +
  "C84.1 135.56 74 136.96 62.5 134.54" +
  "C60.1 133.7 49.6 133.61 45.6 129.89" +
  "C39.5 123.84 36.5 114.17 36.8 104.5" +
  "C37.1 95.1 39.7 84.22 43 75.02" +
  "C43.8 74.18 44 73.16 44.4 72.23" +
  "C45.9 67.3 46.4 61.16 48.5 52.23 z";

/**
 * One wing, traced from the source outline's own excursion: shoulder at
 * the shoulder → out and down to the tip → back up the inner edge to where
 * the torso resumes. (Coordinates below are post-squash, see the file header.)
 *
 * Only the left is defined; the right is this mirrored about the body's centre
 * line, so there is one silhouette to maintain rather than two that drift.
 */
const WING =
  // A blade whose root edge is a straight chord *through the pivot*, from
  // (52, 68.6) to (52, 85.34). That geometry is what fixes the raised flipper:
  // every point of the root stays within 9 units of the hinge however far the
  // limb swings, so it can never rotate clear of the body and open a gap at
  // the armpit. The pivot sits about 10 units inside the torso's left edge,
  // which is what keeps the root buried.
  //
  // The tip keeps the source art's own curve — the rounded point at
  // (21.4, 108) through (23.6, 113.6) and back — because that silhouette is
  // the most recognisable thing about the flipper.
  "M52 68.6" +
  "C40 73.25 26 91.85 21.4 108.03" +
  "C20.6 112.22 21.9 113.61 23.6 113.61" +
  "C27 113.61 34.9 108.03 35.4 106.64" +
  "C40 99.29 46 91.85 52 85.34 z";

/** The source's darker shading inside the flipper tip. The source's pale rim
 *  highlight is not drawn: it is a hairline stroke that, once the limb could
 *  rotate, swung out over the belly and read as a scratch. */
const WING_TIP_SHADE =
  "m35.9 91.29 c-2.4 3.81 -7 17.3 -13.8 17.76 -0.6 5.12 6.3 2.23 13.4 -4.46 -0.4 -5.86 0.6 -13.76 0.4 -13.3 z";

/** The pivot, at the joint rather than at the top of the shape — the shoulder
 *  extension above it is what stays inside the torso as the limb swings.
 *  Mirrored about x = 75. */
const LEFT_SHOULDER = "52, 76.97";
const RIGHT_SHOULDER = "98, 76.97";

/** The rendered height, in px, of a mascot `size` px wide. The box stopped
 *  being square when it grew headroom for the umbrella. */
export function mascotBoxHeight(size: number): number {
  return (size * VIEW_BOX_HEIGHT_UNITS) / VIEW_BOX_UNITS;
}

/**
 * Distance from the top of the rendered box down to the soles, in px.
 *
 * The box has empty space both above the character (`VIEW_BOX_HEADROOM`, for
 * the umbrella) and below his feet (about 11% of the artwork's own height), so
 * laying a mascot out by its box puts him floating well above whatever he is
 * meant to be standing on. Callers position him with `-mascotFeetOffset(size)`
 * to stand him on an edge — which is the whole idea of the placements in
 * §9.7, and consistent with a character whose every motion pivots on a foot.
 *
 * This is a *positioning* number, not a layout one — see `mascotClearance`
 * for the room a screen should reserve above him.
 */
export function mascotFeetOffset(size: number): number {
  return Math.round(((TILT_ORIGIN.y + VIEW_BOX_HEADROOM) / VIEW_BOX_UNITS) * size);
}

/**
 * How much room he actually needs above the line he stands on, in px.
 *
 * Deliberately **not** `mascotFeetOffset`, which is the whole box: the box
 * carries `VIEW_BOX_HEADROOM` above him for an umbrella he is usually not
 * holding, so reserving it made every layout pay the umbrella's rent in the
 * sunshine — at 96pt, 116px of screen for a character 75px tall.
 *
 * Bare, that is his hat crown (`CROWN_Y`). Holding the umbrella, it is the
 * box after all: the canopy fills the headroom almost exactly — measured at
 * 64pt it reached 78px above his feet against the box's 77.5 — so there is
 * nothing to trim in that case and no second measurement to keep in step.
 *
 * The hop's own stretch (7%) briefly carries the crown a few px past this. It
 * is transient, he is drawn over the cards rather than clipped by them, and
 * every placement has more than that in ordinary screen padding.
 */
export function mascotClearance(size: number, hasUmbrella: boolean): number {
  if (hasUmbrella) return mascotFeetOffset(size);
  return Math.round(((TILT_ORIGIN.y - CROWN_Y) / VIEW_BOX_UNITS) * size);
}

export type EyeState = "open" | "happy" | "half" | "wide";
export type MouthState = "closed" | "open";

export interface MascotPose {
  /** Pupil offset, in artwork units. ±1.5 is already a clear glance. */
  gazeX?: number;
  gazeY?: number;
  eyes?: EyeState;
  mouth?: MouthState;
  /** Whole-character tilt, degrees, about the feet. */
  tiltDeg?: number;
  /** Flipper swing, degrees. Positive lifts the tip away from the body on
   *  both sides; the sign is mirrored internally. */
  leftFlipperDeg?: number;
  rightFlipperDeg?: number;
  /** Foot lift, artwork units off the ground. Deliberately moves the foot
   *  *alone* — the feet sit outside the tilt group, so the torso stays exactly
   *  where it is and this reads as a tap rather than as a hop. 4 is a clear
   *  tap; the foot is only about 11 units tall. */
  leftFootLift?: number;
  rightFootLift?: number;
}

/**
 * §13.9's clothing slots, already resolved to fills. Absent means the slot is
 * empty; a present-but-uncoloured item arrives as the neutral grey rather than
 * as `undefined`, so "owns it, hasn't tagged it" and "isn't wearing one" stay
 * distinguishable here.
 */
export interface MascotGarmentFills {
  jacket?: string;
  umbrella?: string;
}

interface Props {
  size: number;
  pose?: MascotPose;
  garments?: MascotGarmentFills;
}

/**
 * The rotation and mirroring every limb-attached shape shares. Extracted
 * because the flipper and its sleeve have to turn together but cannot be
 * drawn together: the flipper goes behind the torso and the sleeve in front
 * of it (see Sleeve below).
 */
function Limb({ side, deg, children }: { side: "left" | "right"; deg: number; children: React.ReactNode }) {
  const isLeft = side === "left";
  return (
    <G rotation={isLeft ? deg : -deg} origin={isLeft ? LEFT_SHOULDER : RIGHT_SHOULDER}>
      <G scale={`${isLeft ? 1 : -1}, 1`} origin="75, 0">
        {children}
      </G>
    </G>
  );
}

/**
 * A sleeve, drawn *over* the torso while still turning with its flipper.
 *
 * The obvious placement — inside the wing group with the flipper — renders
 * nothing at rest: the wings draw behind the torso, and the sleeve covers
 * precisely the upper part of the limb that the torso hides. So it gets its
 * own pass after the body, and the jacket body drawn after *it* buries the
 * root, exactly the way the torso buries the flipper's root.
 */
function Sleeve({ side, deg, fill }: { side: "left" | "right"; deg: number; fill: string }) {
  return (
    <Limb side={side} deg={deg}>
      {/* Fill unstroked, outline only where the sleeve genuinely has an edge.
          Stroked all the way round it drew a navy line across the shoulder;
          the reference has none — the colour runs straight from torso into
          sleeve, and only the silhouette and the cuff are outlined. */}
      <Path d={JACKET_SLEEVE} fill={fill} />
      <Path
        d={JACKET_SLEEVE_EDGE}
        fill="none"
        stroke={GARMENT_OUTLINE}
        strokeWidth={GARMENT_OUTLINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Limb>
  );
}

function Wing({ side, deg }: { side: "left" | "right"; deg: number }) {
  return (
    <Limb side={side} deg={deg}>
        {/* A full closed outline, and the whole limb draws *behind* the torso.
            That pairing is what makes the outline stop exactly where it meets
            the body: the torso simply covers everything inboard of its own
            edge, so the stroke can never poke across the flank and there is no
            hand-tuned start point to drift. Outlining only the outer edge
            instead left the blue unbordered along the bottom of a raised
            flipper. */}
      <Path d={WING} fill={BLUE} stroke={NAVY} strokeWidth={3.4} strokeLinejoin="round" />
      <Path d={WING_TIP_SHADE} fill={BLUE_SHADE} />
    </Limb>
  );
}

function Eyes({ eyes, gazeX, gazeY }: { eyes: EyeState; gazeX: number; gazeY: number }) {
  if (eyes === "happy") {
    return (
      <G>
        <Path d="M59 59.3 q4.5 -5.58 9 0" stroke={EYE} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Path d="M81 59.3 q4.5 -5.58 9 0" stroke={EYE} strokeWidth={2} strokeLinecap="round" fill="none" />
      </G>
    );
  }
  const pupilScale = eyes === "wide" ? 0.74 : 1;
  return (
    <G>
      <G translateX={gazeX} translateY={gazeY}>
        <G scale={pupilScale} origin="63.5, 57.91">
          <Path d="m61.6 62.93 c-2.6 -3.07 -1.2 -9.67 2.9 -9.58 3.4 0.28 4.5 5.95 1.6 9.3 -1.5 -0.56 -3.1 -0.56 -4.5 0.28 z" fill={EYE} />
          <Path d="m63.7 56.88 c-0.1 -0.74 -0.6 -1.39 -1.3 -1.39 -0.8 0.09 -1 0.65 -1 1.49 0 0.56 0.6 1.3 1.2 1.12 0.8 -0.09 1 -0.56 1.1 -1.21 z" fill={WHITE} />
        </G>
        <G scale={pupilScale} origin="85.5, 57.91">
          <Path d="m83.4 62.93 c-2.8 -2.33 -2.3 -10.04 2.2 -9.76 3.5 0.19 5 5.77 2.4 9.86 -1.4 -0.46 -3.1 -0.93 -4.9 -0.09 h0.3 z" fill={EYE} />
          <Path d="m85.5 56.6 c-0.1 -0.56 -0.6 -1.39 -1.5 -1.21 -0.9 0.28 -1 1.67 -0.5 2.42 1.1 1.12 2.4 0 2 -1.21 z" fill={WHITE} />
        </G>
      </G>
      {eyes === "half" && (
        <G>
          <Path d="M58.5 51.86 h11 v5.58 q-5.5 2.33 -11 0 z" fill={WHITE} />
          <Path d="M80.5 51.86 h11 v5.58 q-5.5 2.33 -11 0 z" fill={WHITE} />
        </G>
      )}
    </G>
  );
}

function Mouth({ mouth }: { mouth: MouthState }) {
  return (
    <G>
      <Path
        d="m74.5 62.65 c-2.9 0 -8.4 1.86 -8.5 2.79 s2.6 6.51 6 8.28 c4.5 1.95 8.5 -0.93 10.1 -4.28 1.4 -3.07 1.5 -3.63 0.5 -4.46 -1 -0.46 -4.7 -2.33 -8.1 -2.33 z"
        fill={BEAK}
      />
      <Path
        d="m74.5 62.18 c-2.5 0 -8.4 2.14 -8.9 3.07 s2.8 6.51 5.5 8.46 c3 2.23 7.3 1.02 9.3 -0.84 2.2 -1.95 3.5 -4.74 3.5 -6.6 0 -1.02 -0.9 -1.49 -2 -1.95 -2.4 -1.21 -5.4 -2.23 -7.4 -2.14 zm0.4 0.93 c2.7 0 7 1.77 7.2 2.6 0.3 1.58 -2.7 7.63 -7.7 7.91 -4.5 0 -7.9 -5.86 -8.3 -7.72 -0.1 -0.46 5.5 -2.88 8.8 -2.79 z"
        fill={BEAK_DARK}
      />
      {mouth === "open" ? (
        <G translateY={1.12}>
          <Path
            d="m67.4 66.83 c0.2 1.86 3.5 7.07 7.1 6.98 4 0 6.9 -5.67 6.9 -7.44 -0.9 -0.65 -3.8 2.14 -6.9 2.14 -2.5 0 -7.1 -2.79 -7.1 -1.67 z"
            fill={BEAK_DARK}
          />
        </G>
      ) : (
        <Path
          d="m67.4 66.83 c0.2 1.86 3.5 5.95 7.1 5.86 4 0 6.9 -4.56 6.9 -6.32 -0.9 -0.65 -3.8 2.14 -6.9 2.14 -2.5 0 -7.1 -2.79 -7.1 -1.67 z"
          fill={BEAK_DARK}
        />
      )}
    </G>
  );
}

export default function MascotBase({ size, pose = {}, garments }: Props) {
  const {
    gazeX = 0,
    gazeY = 0,
    eyes = "open",
    mouth = "closed",
    tiltDeg = 0,
    leftFlipperDeg: posedLeftFlipperDeg = 0,
    rightFlipperDeg = 0,
    leftFootLift = 0,
    rightFootLift = 0,
  } = pose;

  // Holding it wins over the pose. The umbrella is drawn in artwork
  // coordinates rather than in the limb's frame — it has to be, since its
  // whole geometry is "reach from the one place this flipper can put a hand to
  // above the hat" — so a beat, the greeting or a hop that moved this flipper
  // would slide the hand straight out of the handle. Enforced here rather than
  // asked of every caller, because there is no pose for which the other
  // behaviour is right.
  const leftFlipperDeg = garments?.umbrella ? UMBRELLA_ARM_DEG : posedLeftFlipperDeg;

  return (
    <Svg width={size} height={mascotBoxHeight(size)} viewBox={VIEW_BOX}>
      {/* Feet — source art, unchanged, behind the torso, and split into one
          group per foot so each can lift on its own. The source draws all
          eight paths as one block; the only change is where the two groups
          begin. Each foot's four paths are its fill, its outline stroke, its
          mid tone and its highlight, in that order. */}
      <G id="foot-right" translateY={-rightFootLift}>
        <Path
          d="m80 136.49 c-0.5 2.42 1 4.84 4.2 5.02 2.6 0.09 5.7 -0.37 7.7 -0.37 3.4 0.09 6.2 1.58 8.7 1.49 2.2 -0.09 2.7 -2.42 5.2 -2.88 s5.7 0.84 6.1 -0.19 c1.7 -2.7 -5 -8.28 -10 -8.18 l-8.7 1.12"
          fill={FOOT}
        />
        <Path
          d="m79.6 137.33 c0.2 2.14 1.7 4.09 4.6 4.19 2.6 0.09 5.7 -0.46 7.8 -0.28 3 0.19 5.9 1.49 8.4 1.4 2.2 -0.09 2.7 -2.33 5.2 -2.88 1.6 -0.37 5.2 0.47 6 -0.09 2.9 -1.86 -3.3 -8.37 -9.6 -8.37"
          fill="none"
          stroke={FOOT_STROKE}
          strokeWidth={1.4483}
          strokeLinecap="round"
        />
        <Path
          d="m92.9 139.47 c-0.8 -0.28 1.6 -2.6 4 -3.91 1.7 -0.93 4.8 -2.05 5.5 -2.05 s2.4 -0.19 5.1 1.67 3 3.16 1.7 3.44 c-1.1 0 -3.1 -0.65 -5.2 0.28 -1.5 0.74 -2.2 1.86 -3.7 1.77 -2.2 0 -7 -1.21 -7.4 -1.21 z"
          fill={FOOT_MID}
        />
        <Path d="m100.1 132.31 c-0.2 -0.37 2.6 -0.93 5 0.28 2.4 1.3 3.4 3.07 3.4 3.07 s-2.1 -1.58 -3.6 -1.95 c-1.7 -0.37 -4.7 -0.84 -4.8 -1.39 z" fill={FOOT_LIGHT} />
      </G>

      <G id="foot-left" translateY={-leftFootLift}>
        <Path
          d="m70.3 137.61 c0 1.77 -0.4 3.91 -3.2 4 -2.5 0.19 -5.5 -0.56 -8.6 -0.19 -3.4 0.28 -6 1.58 -8.5 1.21 -2 -0.28 -2.6 -2.23 -5.1 -2.42 -1.9 -0.19 -4.3 0.56 -5.4 -0.46 -2.2 -2.33 3.9 -7.07 7.1 -7.9 l2.6 -0.46 15.4 4.74 5.7 1.49 z"
          fill={FOOT}
        />
        <Path
          d="m70.3 137.89 c-0.1 1.77 -0.6 3.53 -3.2 3.63 -2.6 0.19 -5.6 -0.56 -8.7 -0.19 -3.4 0.28 -6 1.58 -8.5 1.21 -2 -0.19 -2.6 -2.23 -5.1 -2.51 -2.1 -0.19 -4 0.65 -5.3 -0.28 -2.4 -2.33 3.2 -6.97 7 -7.9"
          fill="none"
          stroke={FOOT_STROKE}
          strokeWidth={1.4483}
          strokeLinecap="round"
        />
        <Path
          d="m40.3 138.26 c0 0.74 1.8 0.56 3.7 0.37 3 -0.19 4.1 1.67 5.5 2.51 2.4 1.3 7 -1.3 8 -1.3 s0 -1.3 -3 -2.98 c-2.2 -1.3 -4.6 -2.6 -7.5 -2.6 -2 0 -6.1 2.7 -6.7 4 z"
          fill={FOOT_MID}
        />
        <Path d="m41.7 136.03 c-0.5 0 3.5 -3.16 4.9 -3.26 l1 0.47 c-2 0 -5.4 2.79 -5.9 2.79 z" fill={FOOT_LIGHT} />
      </G>

      <G rotation={tiltDeg} origin={`${TILT_ORIGIN.x}, ${TILT_ORIGIN.y}`}>
        {/* Wings behind the torso. Everything inboard of the body's edge — the
            root, and the part of the wing's outline that would run across the
            flank — is covered by the torso drawn over it, so the outline ends
            at the body without any hand-tuned trimming. */}
        <Wing side="left" deg={leftFlipperDeg} />
        <Wing side="right" deg={rightFlipperDeg} />

        {/* torso: the source outline with the wing excursions carved out */}
        <Path d={TORSO} fill={NAVY} stroke={NAVY} strokeWidth={3.6} strokeLinejoin="round" />
        <Path d={TORSO} fill={BLUE} />

        {/* The source's `#36506B` sliver at (108, 69) is not drawn. It is the
            right wing's inner highlight, and carving the wings out of the
            torso orphaned it: measured, it spans x 108–128 while the torso's
            right edge sits at x ≈ 110, so it floated outside the body as a
            hairline crescent with nothing to belong to. The left wing's
            equivalent went the same way. */}
        {/* Blue across the whole forehead, not just the bridge.
            The torso's own top edge is a straight line from (48.5, 52.2) to
            (104.4, 53.4) carrying the 3.6pt navy outline, so a dark bar runs
            right across the head under the hat. Patching only between the eyes
            left the rest of that bar showing either side of them. This covers
            the full width; the hat draws afterwards and takes back whatever it
            should cover. */}
        <Ellipse cx={76} cy={51.86} rx={30} ry={8.37} fill={BLUE} />
        {/* The source's wedge between the eyes, kept but filled blue rather
            than white: white there makes the two eye patches read as one mask
            instead of as a pair of eyes. */}
        <Path
          d="m71.4 63.02 -0.1 4.34 c-0.4 -5.11 -3.4 -7.81 -4.3 -8.37 l14.5 -0.28 c-2.6 2.7 -4.4 6.98 -3.9 11.63 0.3 1.4 0.4 1.67 0.8 2.7 l-1.8 -0.37 h-3.2 l-2 0.37 z"
          fill={BLUE}
        />
        {/* Solid white behind each eye. The source draws the two eye patches as
            separate paths that meet the belly path along a seam, and at large
            sizes body blue showed through that seam. A backing shape under each
            one removes the class of problem rather than chasing the one gap. */}
        <Ellipse cx={63} cy={58.37} rx={8} ry={8.84} fill={WHITE} />
        <Ellipse cx={86} cy={58.37} rx={8} ry={8.84} fill={WHITE} />
        <Path
          d="m71.4 63.02 c-2.5 0.56 -4.9 1.49 -5.5 2.23 -0.5 0.56 1.6 4.84 4.6 7.63 3.1 3.16 8 2.23 10.5 -0.46 2 -1.95 3 -4.84 2.6 -6.6 -0.2 -0.93 -3.6 -2.33 -5.2 -2.79 2 0.09 6.6 0.56 6.6 0.56 l5.6 3.72 c2.4 9.58 9.3 21.76 10.3 33.29 0.6 8.37 -2 29.85 -27.3 29.76 -18.1 -0.28 -26.2 -7.81 -26.1 -25.85 0.1 -11.16 7.1 -22.32 11.5 -35.99 l5.4 -3.72 7 -1.77 z"
          fill={WHITE}
        />
        <Path d="m81 63.02 c-0.7 -0.09 -2.1 -0.09 -3.1 -0.09 -0.8 -2.6 -0.9 -8.37 3.6 -13.86 l12.5 3.26 c2 3.72 1.9 12.46 -3.3 15.72 l-0.3 -0.19 -9.4 -4.84 z" fill={WHITE} />
        <Path
          d="m65.4 49.54 c-4 0.93 -7.5 1.49 -9.9 2.33 -2.5 5.58 -1.9 13.86 3.5 16.65 l7 -3.72 5.4 -1.77 v-5.67 c-0.4 -4 -1.8 -5.86 -3.8 -7.9 l-2.2 0.09 z"
          fill={WHITE}
        />
        <Path
          d="m52.1 121.05 c4.5 1.49 11.5 3.91 21.5 3.91 10.5 0 18 -1.86 23 -3.44 -4.2 4.37 -11.2 8.56 -22.6 8.84 -8.5 0 -18 -2.14 -21.9 -9.3 z"
          fill={WHITE_SHADE}
        />

        {/* §13.9's paper-doll layer, over the body and under the hat — so the
            brim covers the top of the hood exactly as it does in the
            reference, and the eyes and beak below still draw over everything.
            An unset colour arrives here already resolved to the neutral grey
            (mascotSwatchHex), never omitted: `color` is a Phase 21 field, so
            most wardrobes have none and the mascot must not look undressed
            for someone who never went back to tag anything. */}
        {garments?.jacket && (
          <G id="jacket">
            {/* Hood and body in one stroke, with the face opening and V-neck
                as a single evenodd hole — see JACKET. */}
            <Path
              d={JACKET}
              fillRule="evenodd"
              fill={garments.jacket}
              stroke={GARMENT_OUTLINE}
              strokeWidth={GARMENT_OUTLINE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Sleeves *over* the coat, and drawn after it on purpose: their
                fill covers the coat's flank outline exactly where the arm is
                in front of the body, which is the only way the two colours
                meet with no line between them. Below the cuff the coat's own
                outline resumes. */}
            <Sleeve side="left" deg={leftFlipperDeg} fill={garments.jacket} />
            <Sleeve side="right" deg={rightFlipperDeg} fill={garments.jacket} />
            <Path d={JACKET_HIGHLIGHT} fill={GARMENT_HIGHLIGHT} opacity={GARMENT_HIGHLIGHT_OPACITY} />
            {JACKET_SEAMS.map((d) => (
              <Path
                key={d}
                d={d}
                fill="none"
                stroke={GARMENT_OUTLINE}
                strokeWidth={GARMENT_SEAM_WIDTH}
                strokeLinecap="round"
                opacity={0.5}
              />
            ))}
          </G>
        )}

        {/* Hat before the face, which is the order the source art uses. Drawing
            it after put its brim-underside stroke straight across the top of
            both eyes — the stray lines on the face. The strokes are hat
            construction lines and are meant to sit *under* the eyes. */}
        <G id="hat">
          <Path
            d="m43 64.79 c-3.4 -0.84 -11.5 -5.49 -11.7 -10.14 -0.4 -4.19 7.7 -6.14 11.7 -10.6 l3 -3.72 c-0.5 -2.05 1.6 -4.37 2.5 -5.58 1.9 -2.51 1.1 -8 3.5 -11.81 1.4 -3.07 5.5 -4.56 8.4 -5.58 4.1 -1.77 7.2 -0.93 9.5 -0.74 4.6 0.74 8.7 -1.12 12.6 -1.02 2.5 0 8.5 1.4 11.6 3.63 2.5 1.4 4.3 3.26 4.9 7.44 l2.4 8.56 c1.6 0.93 2.6 2.79 2.2 5.86 4 7.53 17.4 9.77 16.5 13.95 -0.9 3.35 -6 7.07 -12.6 9.39 l-2.9 -10.69 c-2.5 0.09 -6.5 -1.02 -10.6 -1.86 -5.1 -1.3 -11.5 -4.19 -18.4 -4.09 -6 0 -14 2.79 -18.5 4.09 -2.1 0.47 -3.6 0.09 -5.5 0.09 l-5.6 -0.09 -3 12.93 z"
            fill={HAT}
          />
          <Path d="m52 35.12 c1.6 -3.35 5.5 -7.81 10 -6.97 3.5 0.56 5.6 1.95 9.9 0.47 -1.4 1.86 -3.9 2.33 -8.4 1.77 -4.9 -0.46 -8.4 2.05 -11.5 4.74 z" fill={HAT_MID} />
          <Path d="m60 18.47 c6.4 -0.46 9.4 1.86 13.5 1.67 4 -0.28 6.6 -2.7 7.5 -2.79 0.9 -0.37 0.5 -0.74 -2 -0.74 -2.4 0.28 -4.9 1.21 -7.6 0.84 l-4.5 -0.56 c-1.8 -0.28 -3.8 -0.28 -6.9 1.58 z" fill={HAT_MID} />
          <Path d="m91.1 24.89 c0.9 4.09 3.9 6.98 9 8.37 l0.3 1.49 -1.5 -0.09 c-3.9 -0.46 -7.3 -3.35 -7.9 -7.9 v-1.86 h0.1 z" fill={HAT_MID} />
          <Path d="m84.9 42.65 c7.2 2.23 9.6 4.46 13.2 5.12 3.9 0.93 7.4 -0.09 7.4 0.47 0 0.47 -1.9 1.4 -5.4 1.4 -3.5 -0.09 -8.5 -1.95 -11.5 -3.81 l-4.2 -3.16 h0.5 z" fill={HAT_MID} />
          <Path
            d="m46.5 39.68 c5 -2.33 15.9 -4.93 28.4 -5.02 11.7 -0.09 23.5 2.79 28.6 5.21 l0.1 1.3 -13.1 -2.42 -13.6 -3.16 -8.8 0.09 -9.2 1.21 -12 2.79 h-0.4 z"
            fill={HAT_MID}
          />
          <Path d="m51.8 35.21 c1.3 -1.58 5.8 -5.58 10.3 -5.58 l6.8 0.37 c-3.8 1.3 -7 -1.77 -14.4 3.35 l-2.7 1.86 z" fill={HAT_DARK} />
          {/* Four of the source's hat marks are deliberately not drawn: the
              dark squiggles at (45.6, 38.6) and (76.4, 33.6) and their two
              thin stroke twins. In the artwork they suggest folds in the
              brim, but they sit *below* the brim's lower edge, so on the
              character they land on the forehead either side of the eyes and
              read as scratches on his face — the marks that weren't there on
              the earlier hat. */}
          {[
            "m32.5 54.19 c1.6 -1.49 4.5 -2.7 7.9 -2.42 10 0.47 12.1 1.02 19.2 -0.84 4.4 -1.3 9.4 -3.26 15 -3.26 8.4 -0.09 15 3.72 22 5.21 8 1.86 11.5 0.28 16 -0.19 2.9 -0.46 5 -0.28 5.8 1.58",
            "m46 40.7 c1.1 -0.56 4.6 -2.23 9.6 -2.88",
            "m62.1 36.52 c3.4 -0.56 6.3 -0.93 12.9 -0.84 7.4 0 10 1.4 18.9 3.07 4.2 0.65 7.5 1.49 9.2 2.42",
            "m91.1 25.45 c0.5 4.46 2.9 8.37 9.5 9.67 1.9 0.37 3.4 3.26 2.9 6.05 3.9 6.14 10.6 8 15.1 11.16 1.4 1.02 1.9 2.33 1 3.81 -1.6 2.79 -6.2 6.05 -11.6 7.72",
            "m42.9 64.51 c-3.4 -0.93 -9.9 -4.65 -11.4 -8.84 -1.4 -4.19 6 -6.6 10.4 -10.42 1.6 -1.39 3.1 -3.16 4.2 -4.65 -0.5 -2.7 2 -5.49 2.4 -5.95 2 -2.79 1.5 -6.51 3 -10.23 1 -3.16 2.9 -4.56 7.5 -6.42 5.5 -2.42 7.9 -1.58 10.4 -1.12 6.5 1.12 9.5 -1.3 13.2 -0.46 2.8 0.19 10.4 2.33 13.5 5.12 2.4 1.95 2.8 5.21 2.9 6.7 l1.9 6.98",
          ].map((d) => (
            <Path key={d} d={d} fill="none" stroke={HAT_DARK} strokeWidth={1.2047} strokeLinecap="round" />
          ))}
        </G>

        <Eyes eyes={eyes} gazeX={gazeX} gazeY={gazeY} />
        <Mouth mouth={mouth} />

        {/* Over everything, and inside the tilt group so it leans with him —
            it is in his hand, not pinned to the sky. The shaft draws first so
            the canopy's own fill buries the length running up inside the dome,
            leaving only the ferrule above it and the stick below the rim. */}
        {garments?.umbrella && (
          <G id="umbrella">
            <Path
              d={UMBRELLA_SHAFT}
              fill="none"
              stroke={GARMENT_OUTLINE}
              strokeWidth={UMBRELLA_SHAFT_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={UMBRELLA_CANOPY}
              fill={garments.umbrella}
              stroke={GARMENT_OUTLINE}
              strokeWidth={GARMENT_OUTLINE_WIDTH}
              strokeLinejoin="round"
            />
            <Path d={UMBRELLA_PANEL_LIT} fill={GARMENT_HIGHLIGHT} opacity={GARMENT_HIGHLIGHT_OPACITY} />
            <Path d={UMBRELLA_PANEL_SHADED} fill={GARMENT_SHADE} opacity={GARMENT_SHADE_OPACITY} />
            {UMBRELLA_SEAMS.map((d) => (
              <Path
                key={d}
                d={d}
                fill="none"
                stroke={GARMENT_OUTLINE}
                strokeWidth={GARMENT_SEAM_WIDTH}
                strokeLinecap="round"
                opacity={0.5}
              />
            ))}
          </G>
        )}
      </G>
    </Svg>
  );
}

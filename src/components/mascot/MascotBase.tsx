import Svg, { Ellipse, G, Path } from "react-native-svg";

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

const VIEW_BOX = "0 0 150 150";

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
  "M104.4 46.6 " +
  "C105.5 51.1 107.6 60.4 108.4 69.4 L108.5 71.4 " +
  "C109.8 76.4 110.6 80.3 110.9 83.6 " +
  "C111.8 87 113.3 98.6 112.4 108.1 " +
  "C113 107.5 113.5 106.6 114 105.9 " +
  "C113.2 118.1 107 126.1 100.9 130.5 " +
  "C97.6 131.9 94.4 132.5 92.6 133 L92.8 132.5 " +
  "C84.1 135 74 136.5 62.5 133.9 " +
  "C60.1 133 49.6 132.9 45.6 128.9 " +
  "C39.5 122.4 36.5 112 36.8 101.6 " +
  "C37.1 91.5 39.7 79.8 43 69.9 " +
  "C43.8 69 44 67.9 44.4 66.9 " +
  "C45.9 61.6 46.4 55 48.5 45.4 z";

/**
 * One wing, traced from the source outline's own excursion: shoulder at
 * (43, 69.9) → out and down to the tip at (21.4, 105.4) → back up the inner
 * edge to where the torso resumes.
 *
 * Only the left is defined; the right is this mirrored about the body's centre
 * line, so there is one silhouette to maintain rather than two that drift.
 */
const WING =
  // A blade with a rounded top, not a wedge.
  //
  // The shoulder extension runs from (56, 66) — well inside the torso, which
  // at that height reaches to about x 46 — so nothing of it shows at rest;
  // it only appears as the limb swings out, which is exactly when a shoulder
  // should appear. An earlier version started at (48, 58), right on the
  // torso's edge, so the wedge was visible even at rest and its flat cut
  // showed as a straight edge on the raised flipper.
  //
  // The tip keeps the source art's own curve — the rounded point at
  // (21.4, 105.4) through (23.6, 111.4) and back — because that silhouette is
  // the most recognisable thing about the flipper.
  "M56 66 " +
  "C44 72 26 92 21.4 105.4 " +
  "C20.6 109.9 21.9 111.4 23.6 111.4 " +
  "C27 111.4 34.9 105.4 35.4 103.9 " +
  "C35.5 96 36.5 88.5 38.5 83.5 " +
  "C43 74 50 68 56 66 z";

/**
 * The wing's *outer* contour only, as an open path.
 *
 * The limb is filled by WING and outlined by this, rather than by stroking
 * WING itself. A closed stroke draws down the inner edge too, and since the
 * wings sit over the torso that inner line landed across the body and the
 * belly as a hard dark arc — the stray mark beside each flipper. Outlining
 * only the outside is what lets the limb read as part of the body: there is
 * simply no line where the two meet.
 */
const WING_OUTLINE =
  // Starts at (43, 77), which is where the wing crosses the torso's edge —
  // not at the shape's own top. Beginning it up at (56, 66) drew the stroke
  // from inside the body outward, painting a navy streak across the flank
  // before the flipper even emerged. The shoulder is left unstroked on
  // purpose: no line where limb meets body is exactly what makes it read as
  // part of the body.
  "M40 83 " +
  "C32.5 90 24 97.5 21.4 105.4 " +
  "C20.6 109.9 21.9 111.4 23.6 111.4 " +
  "C27 111.4 34.9 105.4 35.4 103.9";

/** The source's darker shading inside the flipper tip. The source's pale rim
 *  highlight is not drawn: it is a hairline stroke that, once the limb could
 *  rotate, swung out over the belly and read as a scratch. */
const WING_TIP_SHADE =
  "m35.9 87.4c-2.4 4.1-7 18.6-13.8 19.1-0.6 5.5 6.3 2.4 13.4-4.8-0.4-6.3 0.6-14.8 0.4-14.3z";

/** The pivot, at the joint rather than at the top of the shape — the shoulder
 *  extension above it is what stays inside the torso as the limb swings.
 *  Mirrored about x = 75. */
const LEFT_SHOULDER = "50, 70";
const RIGHT_SHOULDER = "100, 70";

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
}

interface Props {
  size: number;
  pose?: MascotPose;
}

function Wing({ side, deg }: { side: "left" | "right"; deg: number }) {
  const isLeft = side === "left";
  return (
    <G rotation={isLeft ? deg : -deg} origin={isLeft ? LEFT_SHOULDER : RIGHT_SHOULDER}>
      <G scale={`${isLeft ? 1 : -1}, 1`} origin="75, 0">
        {/* Fill first, then an outline on the outer edge only — never a stroke
            on the closed shape, which would draw a line down the inner edge
            and across the body. */}
        <Path d={WING} fill={BLUE} />
        <Path d={WING_TIP_SHADE} fill={BLUE_SHADE} />
        <Path
          d={WING_OUTLINE}
          fill="none"
          stroke={NAVY}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </G>
  );
}

function Eyes({ eyes, gazeX, gazeY }: { eyes: EyeState; gazeX: number; gazeY: number }) {
  if (eyes === "happy") {
    return (
      <G>
        <Path d="M59 53 q4.5 -6 9 0" stroke={EYE} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Path d="M81 53 q4.5 -6 9 0" stroke={EYE} strokeWidth={2} strokeLinecap="round" fill="none" />
      </G>
    );
  }
  const pupilScale = eyes === "wide" ? 0.74 : 1;
  return (
    <G>
      <G translateX={gazeX} translateY={gazeY}>
        <G scale={pupilScale} origin="63.5, 51.5">
          <Path d="m61.6 56.9c-2.6-3.3-1.2-10.4 2.9-10.3 3.4 0.3 4.5 6.4 1.6 10-1.5-0.6-3.1-0.6-4.5 0.3z" fill={EYE} />
          <Path d="m63.7 50.4c-0.1-0.8-0.6-1.5-1.3-1.5-0.8 0.1-1 0.7-1 1.6 0 0.6 0.6 1.4 1.2 1.2 0.8-0.1 1-0.6 1.1-1.3z" fill={WHITE} />
        </G>
        <G scale={pupilScale} origin="85.5, 51.5">
          <Path d="m83.4 56.9c-2.8-2.5-2.3-10.8 2.2-10.5 3.5 0.2 5 6.2 2.4 10.6-1.4-0.5-3.1-1-4.9-0.1h0.3z" fill={EYE} />
          <Path d="m85.5 50.1c-0.1-0.6-0.6-1.5-1.5-1.3-0.9 0.3-1 1.8-0.5 2.6 1.1 1.2 2.4 0 2-1.3z" fill={WHITE} />
        </G>
      </G>
      {eyes === "half" && (
        <G>
          <Path d="M58.5 45 h11 v6 q-5.5 2.5 -11 0 z" fill={WHITE} />
          <Path d="M80.5 45 h11 v6 q-5.5 2.5 -11 0 z" fill={WHITE} />
        </G>
      )}
    </G>
  );
}

function Mouth({ mouth }: { mouth: MouthState }) {
  return (
    <G>
      <Path
        d="m74.5 56.6c-2.9 0-8.4 2-8.5 3s2.6 7 6 8.9c4.5 2.1 8.5-1 10.1-4.6 1.4-3.3 1.5-3.9 0.5-4.8-1-0.5-4.7-2.5-8.1-2.5z"
        fill={BEAK}
      />
      <Path
        d="m74.5 56.1c-2.5 0-8.4 2.3-8.9 3.3s2.8 7 5.5 9.1c3 2.4 7.3 1.1 9.3-0.9 2.2-2.1 3.5-5.1 3.5-7.1 0-1.1-0.9-1.6-2-2.1-2.4-1.3-5.4-2.4-7.4-2.3zm0.4 1c2.7 0 7 1.9 7.2 2.8 0.3 1.7-2.7 8.2-7.7 8.5-4.5 0-7.9-6.3-8.3-8.3-0.1-0.5 5.5-3.1 8.8-3z"
        fill={BEAK_DARK}
      />
      {mouth === "open" ? (
        <G translateY={1.2}>
          <Path
            d="m67.4 61.1c0.2 2 3.5 7.6 7.1 7.5 4 0 6.9-6.1 6.9-8-0.9-0.7-3.8 2.3-6.9 2.3-2.5 0-7.1-3-7.1-1.8z"
            fill={BEAK_DARK}
          />
        </G>
      ) : (
        <Path
          d="m67.4 61.1c0.2 2 3.5 6.4 7.1 6.3 4 0 6.9-4.9 6.9-6.8-0.9-0.7-3.8 2.3-6.9 2.3-2.5 0-7.1-3-7.1-1.8z"
          fill={BEAK_DARK}
        />
      )}
    </G>
  );
}

export default function MascotBase({ size, pose = {} }: Props) {
  const {
    gazeX = 0,
    gazeY = 0,
    eyes = "open",
    mouth = "closed",
    tiltDeg = 0,
    leftFlipperDeg = 0,
    rightFlipperDeg = 0,
  } = pose;

  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      {/* A slight vertical squash, anchored at the feet so he stays standing
          on the ground. Shorter reads as younger and rounder — the classic
          chibi trade — and doing it as one transform leaves every traced
          coordinate in the file matching the source art, which hand-shortening
          the torso would not. */}
      <G scale="1, 0.93" origin="75, 143">
      {/* feet — source art, unchanged, behind the torso */}
      <G id="feet">
        <Path
          d="m80 136c-0.5 2.6 1 5.2 4.2 5.4 2.6 0.1 5.7-0.4 7.7-0.4 3.4 0.1 6.2 1.7 8.7 1.6 2.2-0.1 2.7-2.6 5.2-3.1s5.7 0.9 6.1-0.2c1.7-2.9-5-8.9-10-8.8l-8.7 1.2"
          fill={FOOT}
        />
        <Path
          d="m79.6 136.9c0.2 2.3 1.7 4.4 4.6 4.5 2.6 0.1 5.7-0.5 7.8-0.3 3 0.2 5.9 1.6 8.4 1.5 2.2-0.1 2.7-2.5 5.2-3.1 1.6-0.4 5.2 0.5 6-0.1 2.9-2-3.3-9-9.6-9"
          fill="none"
          stroke={FOOT_STROKE}
          strokeWidth={1.4483}
          strokeLinecap="round"
        />
        <Path
          d="m92.9 139.2c-0.8-0.3 1.6-2.8 4-4.2 1.7-1 4.8-2.2 5.5-2.2s2.4-0.2 5.1 1.8 3 3.4 1.7 3.7c-1.1 0-3.1-0.7-5.2 0.3-1.5 0.8-2.2 2-3.7 1.9-2.2 0-7-1.3-7.4-1.3z"
          fill={FOOT_MID}
        />
        <Path d="m100.1 131.5c-0.2-0.4 2.6-1 5 0.3 2.4 1.4 3.4 3.3 3.4 3.3s-2.1-1.7-3.6-2.1c-1.7-0.4-4.7-0.9-4.8-1.5z" fill={FOOT_LIGHT} />
        <Path
          d="m70.3 137.2c0 1.9-0.4 4.2-3.2 4.3-2.5 0.2-5.5-0.6-8.6-0.2-3.4 0.3-6 1.7-8.5 1.3-2-0.3-2.6-2.4-5.1-2.6-1.9-0.2-4.3 0.6-5.4-0.5-2.2-2.5 3.9-7.6 7.1-8.5l2.6-0.5 15.4 5.1 5.7 1.6z"
          fill={FOOT}
        />
        <Path
          d="m70.3 137.5c-0.1 1.9-0.6 3.8-3.2 3.9-2.6 0.2-5.6-0.6-8.7-0.2-3.4 0.3-6 1.7-8.5 1.3-2-0.2-2.6-2.4-5.1-2.7-2.1-0.2-4 0.7-5.3-0.3-2.4-2.5 3.2-7.5 7-8.5"
          fill="none"
          stroke={FOOT_STROKE}
          strokeWidth={1.4483}
          strokeLinecap="round"
        />
        <Path
          d="m40.3 137.9c0 0.8 1.8 0.6 3.7 0.4 3-0.2 4.1 1.8 5.5 2.7 2.4 1.4 7-1.4 8-1.4s0-1.4-3-3.2c-2.2-1.4-4.6-2.8-7.5-2.8-2 0-6.1 2.9-6.7 4.3z"
          fill={FOOT_MID}
        />
        <Path d="m41.7 135.5c-0.5 0 3.5-3.4 4.9-3.5l1 0.5c-2 0-5.4 3-5.9 3z" fill={FOOT_LIGHT} />
      </G>

      <G rotation={tiltDeg} origin="75, 133">
        {/* torso first: the source outline with the wing excursions carved out */}
        <Path d={TORSO} fill={NAVY} stroke={NAVY} strokeWidth={3.6} strokeLinejoin="round" />
        <Path d={TORSO} fill={BLUE} />

        {/* Wings *over* the torso, not behind it.
            Behind, the torso's own navy outline ran between body and flipper
            and cut the limb off as a separate object. Drawn on top, the
            flipper's outline continues the body's silhouette instead of being
            severed by it, which is how they read in the reference art — part
            of the body rather than pinned to it. The white belly below then
            covers their inner edges. */}
        <Wing side="left" deg={leftFlipperDeg} />
        <Wing side="right" deg={rightFlipperDeg} />

        {/* The source's `#36506B` sliver at (108, 69) is not drawn. It is the
            right wing's inner highlight, and carving the wings out of the
            torso orphaned it: measured, it spans x 108–128 while the torso's
            right edge sits at x ≈ 110, so it floated outside the body as a
            hairline crescent with nothing to belong to. The left wing's
            equivalent went the same way. */}
        {/* Blue across the whole forehead, not just the bridge.
            The torso's own top edge is a straight line from (48.5, 45.4) to
            (104.4, 46.6) carrying the 3.6pt navy outline, so a dark bar runs
            right across the head under the hat. Patching only between the eyes
            left the rest of that bar showing either side of them. This covers
            the full width; the hat draws afterwards and takes back whatever it
            should cover. */}
        <Ellipse cx={76} cy={45} rx={30} ry={9} fill={BLUE} />
        {/* The source's wedge between the eyes, kept but filled blue rather
            than white: white there makes the two eye patches read as one mask
            instead of as a pair of eyes. */}
        <Path
          d="m71.4 57-0.1-6.1c-0.4-5.5-3.4-8.4-4.3-9l14.5-0.3c-2.6 2.9-4.4 7.5-3.9 12.5 0.3 1.5 0.4 1.8 0.8 2.9l-1.8-0.4h-3.2l-2 0.4z"
          fill={BLUE}
        />
        {/* Solid white behind each eye. The source draws the two eye patches as
            separate paths that meet the belly path along a seam, and at large
            sizes body blue showed through that seam. A backing shape under each
            one removes the class of problem rather than chasing the one gap. */}
        <Ellipse cx={63} cy={52} rx={8} ry={9.5} fill={WHITE} />
        <Ellipse cx={86} cy={52} rx={8} ry={9.5} fill={WHITE} />
        <Path
          d="m71.4 57c-2.5 0.6-4.9 1.6-5.5 2.4-0.5 0.6 1.6 5.2 4.6 8.2 3.1 3.4 8 2.4 10.5-0.5 2-2.1 3-5.2 2.6-7.1-0.2-1-3.6-2.5-5.2-3 2 0.1 6.6 0.6 6.6 0.6l5.6 4c2.4 10.3 9.3 23.4 10.3 35.8 0.6 9-2 32.1-27.3 32-18.1-0.3-26.2-8.4-26.1-27.8 0.1-12 7.1-24 11.5-38.7l5.4-4 7-1.9z"
          fill={WHITE}
        />
        <Path d="m81 57c-0.7-0.1-2.1-0.1-3.1-0.1-0.8-2.8-0.9-9 3.6-14.9l12.5 3.5c2 4 1.9 13.4-3.3 16.9l-0.3-0.2-9.4-5.2z" fill={WHITE} />
        <Path
          d="m65.4 42.5c-4 1-7.5 1.6-9.9 2.5-2.5 6-1.9 14.9 3.5 17.9l7-4 5.4-1.9v-6.1c-0.4-4.3-1.8-6.3-3.8-8.5l-2.2 0.1z"
          fill={WHITE}
        />
        <Path
          d="m52.1 119.4c4.5 1.6 11.5 4.2 21.5 4.2 10.5 0 18-2 23-3.7-4.2 4.7-11.2 9.2-22.6 9.5-8.5 0-18-2.3-21.9-10z"
          fill={WHITE_SHADE}
        />

        {/* Hat before the face, which is the order the source art uses. Drawing
            it after put its brim-underside stroke straight across the top of
            both eyes — the stray lines on the face. The strokes are hat
            construction lines and are meant to sit *under* the eyes. */}
        <G id="hat">
          <Path
            d="m43 58.9c-3.4-0.9-11.5-5.9-11.7-10.9-0.4-4.5 7.7-6.6 11.7-11.4l3-4c-0.5-2.2 1.6-4.7 2.5-6 1.9-2.7 1.1-8.6 3.5-12.7 1.4-3.3 5.5-4.9 8.4-6 4.1-1.9 7.2-1 9.5-0.8 4.6 0.8 8.7-1.2 12.6-1.1 2.5 0 8.5 1.5 11.6 3.9 2.5 1.5 4.3 3.5 4.9 8l2.4 9.2c1.6 1 2.6 3 2.2 6.3 4 8.1 17.4 10.5 16.5 15-0.9 3.6-6 7.6-12.6 10.1l-2.9-11.5c-2.5 0.1-6.5-1.1-10.6-2-5.1-1.4-11.5-4.5-18.4-4.4-6 0-14 3-18.5 4.4-2.1 0.5-3.6 0.1-5.5 0.1l-5.6-0.1-3 13.9z"
            fill={HAT}
          />
          <Path d="m52 27c1.6-3.6 5.5-8.4 10-7.5 3.5 0.6 5.6 2.1 9.9 0.5-1.4 2-3.9 2.5-8.4 1.9-4.9-0.5-8.4 2.2-11.5 5.1z" fill={HAT_MID} />
          <Path d="m60 9.1c6.4-0.5 9.4 2 13.5 1.8 4-0.3 6.6-2.9 7.5-3 0.9-0.4 0.5-0.8-2-0.8-2.4 0.3-4.9 1.3-7.6 0.9l-4.5-0.6c-1.8-0.3-3.8-0.3-6.9 1.7z" fill={HAT_MID} />
          <Path d="m91.1 16c0.9 4.4 3.9 7.5 9 9l0.3 1.6-1.5-0.1c-3.9-0.5-7.3-3.6-7.9-8.5v-2h0.1z" fill={HAT_MID} />
          <Path d="m84.9 35.1c7.2 2.4 9.6 4.8 13.2 5.5 3.9 1 7.4-0.1 7.4 0.5 0 0.5-1.9 1.5-5.4 1.5-3.5-0.1-8.5-2.1-11.5-4.1l-4.2-3.4h0.5z" fill={HAT_MID} />
          <Path
            d="m46.5 31.9c5-2.5 15.9-5.3 28.4-5.4 11.7-0.1 23.5 3 28.6 5.6l0.1 1.4-13.1-2.6-13.6-3.4-8.8 0.1-9.2 1.3-12 3h-0.4z"
            fill={HAT_MID}
          />
          <Path d="m51.8 27.1c1.3-1.7 5.8-6 10.3-6l6.8 0.4c-3.8 1.4-7-1.9-14.4 3.6l-2.7 2z" fill={HAT_DARK} />
          {/* Four of the source's hat marks are deliberately not drawn: the
              dark squiggles at (45.6, 38.6) and (76.4, 33.6) and their two
              thin stroke twins. In the artwork they suggest folds in the
              brim, but they sit *below* the brim's lower edge, so on the
              character they land on the forehead either side of the eyes and
              read as scratches on his face — the marks that weren't there on
              the earlier hat. */}
          {[
            "m32.5 47.5c1.6-1.6 4.5-2.9 7.9-2.6 10 0.5 12.1 1.1 19.2-0.9 4.4-1.4 9.4-3.5 15-3.5 8.4-0.1 15 4 22 5.6 8 2 11.5 0.3 16-0.2 2.9-0.5 5-0.3 5.8 1.7",
            "m46 33c1.1-0.6 4.6-2.4 9.6-3.1",
            "m62.1 28.5c3.4-0.6 6.3-1 12.9-0.9 7.4 0 10 1.5 18.9 3.3 4.2 0.7 7.5 1.6 9.2 2.6",
            "m91.1 16.6c0.5 4.8 2.9 9 9.5 10.4 1.9 0.4 3.4 3.5 2.9 6.5 3.9 6.6 10.6 8.6 15.1 12 1.4 1.1 1.9 2.5 1 4.1-1.6 3-6.2 6.5-11.6 8.3",
            "m42.9 58.6c-3.4-1-9.9-5-11.4-9.5-1.4-4.5 6-7.1 10.4-11.2 1.6-1.5 3.1-3.4 4.2-5-0.5-2.9 2-5.9 2.4-6.4 2-3 1.5-7 3-11 1-3.4 2.9-4.9 7.5-6.9 5.5-2.6 7.9-1.7 10.4-1.2 6.5 1.2 9.5-1.4 13.2-0.5 2.8 0.2 10.4 2.5 13.5 5.5 2.4 2.1 2.8 5.6 2.9 7.2l1.9 7.5",
          ].map((d) => (
            <Path key={d} d={d} fill="none" stroke={HAT_DARK} strokeWidth={1.2047} strokeLinecap="round" />
          ))}
        </G>

        <Eyes eyes={eyes} gazeX={gazeX} gazeY={gazeY} />
        <Mouth mouth={mouth} />
      </G>
      </G>
    </Svg>
  );
}

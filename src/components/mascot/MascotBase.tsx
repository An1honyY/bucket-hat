import Svg, { Ellipse, G, Path } from "react-native-svg";

// The mascot. Built from the QuiverAI illustration Antony supplied — its
// palette, its face, beak, feet and the single white face-and-belly shape are
// all carried over unchanged. Two parts of it are *not* transcriptions, and
// both are deliberate:
//
// **The body silhouette was rebuilt without wings.** In the source, the
// flippers are fused into the body path: the outline sweeps out and back to
// form each wing, and the only separate wing shapes are thin `#2990D9`
// shading slivers laid on top. Rotating those slivers — which is what a first
// attempt did — moves a detail mark across the belly and leaves the actual
// flipper welded to the body, so the character reads as having gained a
// direction arrow rather than having lifted a limb. There is no way to animate
// a flipper that is part of the torso outline, so the torso is now a clean egg
// and the flippers are separate limbs hinged at the shoulders.
//
// **The hat was redrawn.** Three faults in the original, all reported from
// looking at it: the brim's front hung low enough to cut across the top of
// both eyes; the crown was too short to read as a bucket hat; and the brim was
// drawn as one shape *in front of* the head, so it crossed the forehead. A
// real hat's brim passes behind the head — you see it to the sides, not across
// the face. So the brim is drawn *before* the body and the crown *after*: the
// head hides the brim's middle, leaving the side wings, and the forehead stays
// visible between the crown and the eyes.
//
// The original viewBox is preserved. Every coordinate carried over from the
// source art is expressed in it.

const VIEW_BOX = "86 -59.1 174 170";

// Palette, lifted from the source art so nothing here invents a colour.
const NAVY = "#0B1B37";
const BLUE = "#32AAFA";
const BLUE_SHADE = "#2990D9";
const WHITE = "#FFFFFF";
const WHITE_SHADE = "#DDDDDE";
const PUPIL = "#27282A";
const BEAK_DARK = "#61320F";
const BEAK_MID = "#EC9210";
const BEAK_LIGHT = "#FCAD0B";
const BEAK_MOUTH = "#5C2F0B";
const FOOT = "#DB7B1A";
const FOOT_STROKE = "#5E3111";
const FOOT_MID = "#FCAF17";
const FOOT_LIGHT = "#FFD78C";
const HAT_BRIM = "#BF8F5F";
const HAT_BRIM_LIGHT = "#CCA070";
const HAT_CROWN = "#AC8255";
const HAT_STROKE = "#5E4129";
const HAT_SHADOW = "#30363D";

export type EyeState = "open" | "happy" | "half" | "wide";
export type MouthState = "closed" | "open";

export interface MascotPose {
  /** Pupil offset, in artwork units. ±2 is already a clear glance. */
  gazeX?: number;
  gazeY?: number;
  eyes?: EyeState;
  mouth?: MouthState;
  /** Whole-character tilt, degrees, about the feet. */
  tiltDeg?: number;
  /**
   * Flipper swing, degrees, hinged at the shoulder. Positive lifts the tip
   * away from the body on both sides; the sign is mirrored internally so a
   * caller never has to think about which side it is addressing.
   *
   * Verified by rendering rather than derived: the wing shapes' visual mass
   * does not sit where their bounding box implies.
   */
  leftFlipperDeg?: number;
  rightFlipperDeg?: number;
}

interface Props {
  size: number;
  pose?: MascotPose;
}

const LEFT_SHOULDER = "141, 6";
const RIGHT_SHOULDER = "203, 6";

function Eyes({ eyes, gazeX, gazeY }: { eyes: EyeState; gazeX: number; gazeY: number }) {
  if (eyes === "happy") {
    return (
      <G>
        <Path d="M150 1 q9 -11 18 0" stroke={PUPIL} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Path d="M177 1 q9 -11 18 0" stroke={PUPIL} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      </G>
    );
  }

  const pupilScale = eyes === "wide" ? 0.72 : 1;

  return (
    <G>
      <Path
        d="m159.9-13.4c5.8 0 9.1 5.9 9.1 13.4 0 8.3-2.7 10.5-8.5 10.5-6.1 0.5-10.5-3.5-11.5-10.9-0.5-6.6 2.9-13 10.9-13z"
        fill={WHITE}
      />
      <Path
        d="m186.4-13.4c6.5 0 10.2 5.8 10.2 12.9 0 4.9-1.6 9.8-5.2 10.9-2.9 0.5-7.4-0.1-8.8-1.5-3.1-1.3-6.1-2.8-6.1-9 0-7.7 3.9-13.3 9.9-13.3z"
        fill={WHITE}
      />
      <G translateX={gazeX} translateY={gazeY}>
        <G scale={pupilScale} origin="159.5, -1.2">
          <Path
            d="m160.6-6.3c2.3 0 3.9 2.7 3.9 5.4 0 2.5-0.6 4.3-1.7 5.8-1.8-0.9-3.8-0.9-5.3 0.1-1.1-1.1-1.8-3.1-1.5-5.9 0.1-2.5 1.6-5.7 4.2-5.7l0.4 0.3z"
            fill={PUPIL}
          />
          <Ellipse cx={158.5} cy={-2.4} rx={1.26} ry={1.644} fill={WHITE} />
        </G>
        <G scale={pupilScale} origin="186.3, -1.2">
          <Path
            d="m186.1-6.3c2.4 0 4.1 2.8 4 6.3 0 2-0.6 3.6-1.5 5.1-2-0.8-3.6-1.1-5.7 0-1-1.1-1.9-2.6-1.9-5.2 0-3.4 1.6-6.5 4.1-6.5l1 0.3z"
            fill={PUPIL}
          />
          <Ellipse cx={184.4} cy={-2.3} rx={1.26} ry={1.704} fill={WHITE} />
        </G>
      </G>
      {eyes === "half" && (
        <G>
          <Path d="m147 -15 h24 v10 q-12 5 -24 0 z" fill={BLUE} />
          <Path d="m174 -15 h25 v10 q-12 5 -25 0 z" fill={BLUE} />
        </G>
      )}
    </G>
  );
}

function Mouth({ mouth }: { mouth: MouthState }) {
  return (
    <G>
      <Path
        d="m173.5 3.8c2.4-0.2 7.6 1.8 9.4 3 1.5 0.8 0.7 3.6-0.4 5.8-2 4.2-5.6 7-9.6 7-3.8 0.2-6.4-3.1-8.5-6.2-2.9-4.9-2.7-6-0.8-6.9 2.1-1 6.9-2.9 9.9-2.7z"
        fill={BEAK_DARK}
      />
      <Path
        d="m163.6 7.6c2.4-0.8 5.5-2.6 9.3-2.6 3.1 0 7.1 1.9 8.7 2.6 1 0.5-0.2 4.2-1.7 6.3-2.4 2.9-5.8 5.1-9.8 3.7-3.1-1.1-8.1-7.7-7-9.8l0.5-0.2z"
        fill={BEAK_MID}
      />
      <Path
        d="m163.9 8c2.6-1 5.1-2.4 8.6-2.4 3 0 5.4 1.3 7.5 2.3 1.6 0.7-2.5 8.5-7 8-5.4 0-10.3-7.9-9.1-7.9z"
        fill={BEAK_LIGHT}
      />
      {mouth === "open" ? (
        <G translateY={2.4}>
          <Path
            d="m164.4 9c1.2-0.6 5.1 2.5 8.5 2.5 3.1 0 6.6-2.9 7.7-2.7 1 0.6-2.5 9.6-7.6 9.5-5 0.3-9.6-8.9-8.6-9.3z"
            fill={BEAK_MOUTH}
          />
        </G>
      ) : (
        <Path
          d="m164.4 9c1.2-0.6 5.1 2.5 8.5 2.5 3.1 0 6.6-2.9 7.7-2.7 1 0.6-2.5 8.1-7.6 8-5 0.3-9.6-7.4-8.6-7.8z"
          fill={BEAK_MOUTH}
        />
      )}
    </G>
  );
}

/** One flipper, as a real limb. `side` mirrors the shape about the body's
 *  centre line (x = 172) so there is one silhouette to maintain, not two. */
function Flipper({ side, deg }: { side: "left" | "right"; deg: number }) {
  const mirror = side === "left" ? 1 : -1;
  return (
    <G
      rotation={side === "left" ? deg : -deg}
      origin={side === "left" ? LEFT_SHOULDER : RIGHT_SHOULDER}
    >
      <G scale={`${mirror}, 1`} origin="172, 0">
        {/* Short. The first pass ran nearly the full height of the body and
            read as arms rather than flippers — a penguin's are stubby, ending
            around the widest point of the torso rather than reaching the feet.
            navy backing stands in for an outline, as the body's does. */}
        <Path d="M146 8 C120 18 111 42 116 66 C119 80 143 82 146 67 C137 48 138 26 153 14 z" fill={NAVY} />
        <Path d="M147 13 C125 22 117 44 122 64 C125 76 140 77 143 64 C135 47 136 28 151 18 z" fill={BLUE} />
        <Path d="M139 30 C132 42 131 54 134 63 C135 68 140 68 140 62 C137 52 137 40 141 33 z" fill={BLUE_SHADE} />
      </G>
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
      <G id="foot-left">
        <Path
          d="m143 90c-3-0.3-10.6 5.4-11.3 9-0.3 4.3 5.1 2 6.1 2.3 3.1 0.3 3.3 2.7 5.9 3.2 2.5 0.5 5.3-0.7 7.6-1.2s4.7-0.7 7.7-0.3 5.7 0.6 7.3-0.5c1.9-1.5 2.7-8.8-1.8-9.7l-21.5-2.8z"
          fill={FOOT}
          stroke={FOOT_STROKE}
          strokeWidth={1.728}
        />
        <Path
          d="m132.9 99.2c1.6 1.3 4.9-1.6 8 0.7 2.6 1.9 2.6 3.9 8.7 1.9 5.9-1.9 3.3-0.7 3.3-0.7s-1.9-4.2-11.4-7.9c-4 0.4-8.5 5.6-8.6 6z"
          fill={FOOT_MID}
        />
        <Path d="m132.9 98.9c0-0.5 4.1-7.6 10.3-7.9l0.9 1.2c-0.1 0-5.1-0.6-11.2 6.7z" fill={FOOT_LIGHT} opacity={0.41} />
      </G>
      <G id="foot-right">
        <Path
          d="m194 91 10-1c3-0.3 9.8 3.5 11.6 7.8 1.8 6.4-5.7 1.3-9 4.2-2.2 1.9-2.7 3.5-8 2-2.3-0.7-4.6-1.5-7.7-1.3s-6.9 1-8.9 0.1c-4.6-1.7-4.4-8.8-0.1-10l12.1-1.8z"
          fill={FOOT}
          stroke={FOOT_STROKE}
          strokeWidth={1.68}
        />
        <Path
          d="m193.6 100.5c2.3-4.2 7.3-6.7 11.5-8 3 0 7 4.3 7.9 6 0.1 3.4-4.6-1.5-8.6 2.3-2.8 2.5-4.5 0.7-10.8-0.3z"
          fill={FOOT_MID}
        />
        <Path d="m202.4 91.3c1.2-0.3 5.1-0.4 9.6 5-5.1-4.7-7.9-3.7-7.9-3.7l-1.7-1.3z" fill={FOOT_LIGHT} opacity={0.41} />
      </G>

      <G rotation={tiltDeg} origin="172, 95">
        {/* ---- brim, BEHIND the head ----
            This is the layering fix. Drawn here, the body below covers its
            middle, so what remains visible is the brim to either side of the
            head — which is what a brim actually looks like from the front —
            and the forehead is left clear. */}
        {/* The supplied hat's own brim, unchanged, lifted 9 units.
            Redrawing this from scratch was a mistake worth recording: a
            hand-built brim-and-crown came out reading as a fedora, then as a
            boxy pot. The original shape was never the problem — only where it
            sat and what it was drawn in front of.
            Being *behind* the torso is what does the real work: the head hides
            its middle, so the brim shows to either side of the face instead of
            across it, and the low front edge no longer matters because it is
            covered by the head. */}
        <G id="hat-brim" translateY={-3}>
          <Path
            d="m142.6-26.3c-5.7 8.4-14.6 13.3-15.7 16.7-1.4 6.5 8.6 10.4 9.6 10.5l10.6-4.9 20.9-2.3 28.4 1 11.5 6.3c6.2-2 16.2-4.8 11.5-10.9-3.3-4.1-9-7.7-12.9-13.7 0.4-3-3.5-8.4-5.5-15.3-2.1-6.1-3.5-8.2-9.5-10.4-6.5-2.6-10.1-1.8-16.5-1.1-5 0.5-9.1-1.2-16 0.5-7 2.3-11.1 4.9-12.6 14.6-0.4 3-4 7-3.8 9z"
            fill={HAT_BRIM}
            stroke={HAT_STROKE}
            strokeWidth={1.684}
          />
          <Path
            d="m142.5-26.4c-6.6 9.3-14.5 14-15.6 17.4 5.1-4.3 20.5-8.8 35.1-10 8-1 13.9-0.6 19.4 0 10.2 1 31 5 35.7 9 4 2.5 2.8-0.5 1.8-1.9-3.3-3.7-9.5-7.1-14.8-14.5-5.1-2.1-14.1-5-26.1-5.6-9-0.3-16 0.1-20.5 1-7.1 1.1-13.4 3.2-15 4.6z"
            fill={HAT_BRIM_LIGHT}
            stroke={HAT_STROKE}
            strokeWidth={1.49}
          />
          {/* The seam between the floppy outer brim and the flat middle, and
              the shadow the brim casts. Both are in the source art and both
              were dropped when the hat was being rebuilt — without them the
              brim is one undifferentiated slab. */}
          <Path
            d="m129.1-7.5c0.3-3.4 16.4-8.5 25.8-9.9 12.5-2.2 23.1-2 31.6-0.7 10.1 1.1 28.1 5.5 30.1 8.3"
            fill="none"
            stroke={HAT_STROKE}
            strokeWidth={1.684}
          />
          <Path
            d="m141.6-9c6-2.8 13.4-4.8 22.9-5 11-0.6 22.6 0 35 4.4l5 1.6-1.4-9.1c-7.6-1.9-22.1-2.4-30.1-2.5-6.5-0.3-23 1.6-29 3l-2.4 7.6z"
            fill={HAT_SHADOW}
            opacity={0.16}
          />
        </G>

        {/* ---- flippers, behind the torso so they read as attached ---- */}
        <Flipper side="left" deg={leftFlipperDeg} />
        <Flipper side="right" deg={rightFlipperDeg} />

        {/* ---- torso ----
            Pear-shaped, not the egg of the previous pass: narrow across the
            head and widening steadily to its broadest just above the feet,
            which is the proportion the supplied artwork had and the thing that
            made it read as a penguin rather than as a generic blob. Still one
            clean silhouette with no wings welded into it, so the flippers
            above can swing freely. */}
        {/* The bottom stops around y 95, not 105: the feet are drawn before
            the torso so it overlaps their tops, and a body reaching to 105 hid
            them almost entirely. */}
        <Path
          d="M172 -35 C152 -35 143 -14 140 10 C135 40 124 68 129 82 C135 94 154 98 172 98 C190 98 209 94 215 82 C220 68 209 40 204 10 C201 -14 192 -35 172 -35 z"
          fill={NAVY}
        />
        <Path
          d="M172 -31 C154 -31 146 -12 143 11 C138 40 129 67 133 79 C139 90 156 94 172 94 C188 94 205 90 211 79 C215 67 206 40 201 11 C198 -12 190 -31 172 -31 z"
          fill={BLUE}
        />

        {/* the single white face-and-belly shape, carried over unchanged */}
        <Path
          d="m191.4 10.4c1.6 8.9 11.7 29.6 12.2 44.1 0.4 22.4-11.1 33.1-30.7 34.1-15.8 0.2-31.5-7.1-31.5-30.6 0-17.1 10-34.5 13.2-46.7-4.7-1.7-5.9-7.4-5.7-11.7 0.1-6.4 3.3-12.1 10.5-12.1 4.8 0 9.5 4.7 9.5 12.1v4.8c0 0.2 1.7-0.6 4.5-0.6s3.7 0.8 3.6 0.6c-0.5-1.5-0.6-3.1-0.6-4.8 0-6.6 3.2-12.2 9.8-12.4 5.9-0.2 10.3 5.9 10.3 13.2 0 5.6-1.9 9.2-5.1 10z"
          fill={WHITE}
        />
        <Path
          d="m146.9 77.5c4.8 6.5 11.6 10.9 25.5 11.3 9.2-0.2 19.2-2.7 26.2-11.4-3.5 1.2-12.7 5.1-26.1 5.1-11.9-0.1-18.3-2.9-25.5-5.1l-0.1 0.1z"
          fill={WHITE_SHADE}
        />

        <Eyes eyes={eyes} gazeX={gazeX} gazeY={gazeY} />
        <Mouth mouth={mouth} />

        {/* ---- crown, in FRONT of the head ----
            Taller than the original's, which was too shallow to read as a
            bucket hat, and stopping well above the eyes so the forehead shows
            between it and them. */}
        {/* The supplied hat's own crown, in FRONT of the head so it sits on it,
            lifted with the brim and stretched taller — the "more buckety" note.
            The scale is anchored at the crown's base so it grows upward rather
            than sinking into the forehead it just uncovered. */}
        <G id="hat-crown" translateY={-3}>
          <G scale="1, 1.15" origin="172, -28">
            <Path
              d="m166.6-49.3c6.9 0.3 6.4-1.1 11.9-1.1 2.5-0.5 7.9 0 12 2.1 3.5 1.4 5.4 3.4 6 7.3-0.4 2.5-0.5 2.5 1.9 7.4 1.2 2.7-2.4 3.2-4.2 2.3-2.7-0.7-8.6-2.7-22.1-2.6-15.1 0-15 1.5-19 1-2.6-0.7-6.1-1.9-2.6-4 2.9-1.9-1.9-2.1-1.3-6.5 0.2-4 6.5-7.6 12.7-7.6l4.7 1.7z"
              fill={HAT_CROWN}
            />
            <Path
              d="m142.5-26.8c-0.4-3.2 3.4-7.7 3.9-10.7 0.7-4.4 1.6-7.5 3.6-10 1.9-2.4 5.7-4.1 9-4.9 4.9-1 9.4 0.4 13.1 0.1 4.5-0.3 9.4-2 15.4-0.1 6 2 8.4 3.4 10 7.4 2.1 5 0.5 2.5 5 13 0.9 2.4 0.5 2.1 1.1 4.4"
              fill={HAT_CROWN}
              stroke={HAT_STROKE}
              strokeWidth={1.49}
            />
          </G>
        </G>
      </G>
    </Svg>
  );
}

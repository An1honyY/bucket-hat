import Svg, { Ellipse, G, Path } from "react-native-svg";

// The mascot, ported from the QuiverAI illustration Antony supplied. That
// artwork is the style reference and the base character; everything here is a
// faithful transcription of it plus the seams needed to make it act.
//
// Why this replaced the hand-drawn attempts: it solves the thing the earlier
// passes kept getting wrong. The face and belly are a *single* white shape
// (the `FACE_AND_BELLY` path below rises into two lobes for the eye sockets),
// so there is no dark band across the chin — which was the specific complaint
// about the previous designs, and which is genuinely awkward to construct when
// the head and body are separate ellipses.
//
// Its other structural choice worth keeping: a dark navy silhouette sits
// *behind* the blue body, offset slightly, so the character reads as outlined
// without a stroke on every shape. That is what gives it weight against both
// the light and dark themes.
//
// The original viewBox is preserved rather than normalised to 0–100. Every
// coordinate in the artwork is expressed in it, and re-basing them by hand is
// a lot of opportunity to introduce drift for no benefit.

const VIEW_BOX = "86 -59.1 174 170";

// Palette, lifted from the source art so nothing here invents a colour.
const NAVY = "#0B1B37";
const BLUE = "#32AAFA";
const BLUE_SHADE = "#2990D9";
const BLUE_LIGHT = "#AFE4FE";
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

/** Eye centres in the artwork's own coordinates — everything expressive is
 *  positioned relative to these rather than to fresh magic numbers. */
const LEFT_EYE = { cx: 159.5, cy: -1.2 };
const RIGHT_EYE = { cx: 186.3, cy: -1.2 };

export type EyeState = "open" | "happy" | "half" | "wide";
export type MouthState = "closed" | "open";

/**
 * How the hat sits.
 *
 * `original` is the artwork untouched. Both alternatives thin the brim and
 * lift it, because at the supplied proportions the brim's lower edge lands at
 * roughly y −7.5 while the eye whites start at y −13.4 — so the rim overlaps
 * the top of both eyes and eats exactly the part of the face that carries
 * expression.
 *
 * They compress and raise the whole hat rather than surgically shortening the
 * brim: in the source art the brim and the crown sides are one path, so
 * "just the brim" cannot be scaled without distorting the crown with it.
 * A slightly shorter crown is also closer to a real bucket hat than the
 * original's tall one, so the compression is not a cost.
 */
export type HatStyle = "original" | "thin" | "perched";

const HAT_STYLES: Record<HatStyle, { scaleY: number; shiftY: number; rotate: number }> = {
  original: { scaleY: 1, shiftY: 0, rotate: 0 },
  // Brim's lower edge lands near y −14: clear of the eyes, still sitting down
  // on the head the way a bucket hat should.
  thin: { scaleY: 0.88, shiftY: -2, rotate: 0 },
  // Higher up the head and tipped back a touch — the way someone actually
  // wears one. Trades some of the "pulled down" character for a full face.
  perched: { scaleY: 0.86, shiftY: -7, rotate: -3 },
};

export interface MascotPose {
  /** Pupil offset, in artwork units. Small numbers go a long way: ±2 is a
   *  clear glance. */
  gazeX?: number;
  gazeY?: number;
  eyes?: EyeState;
  mouth?: MouthState;
  /** Whole-character tilt, degrees. Rotates about the feet so it stays on the
   *  ground rather than pivoting in mid-air. */
  tiltDeg?: number;
  /** Flipper swing, degrees, hinged at the shoulder. Positive lifts the tip
   *  away from the body on both sides — the sign is mirrored internally so a
   *  caller doesn't have to remember which side it's addressing. */
  leftFlipperDeg?: number;
  rightFlipperDeg?: number;
}

interface Props {
  size: number;
  pose?: MascotPose;
  hat?: HatStyle;
}

/** Shoulder hinges, read off the wing shapes in the source art. */
const LEFT_SHOULDER = "131, 61";
const RIGHT_SHOULDER = "217, 61";

function Eyes({ eyes, gazeX, gazeY }: { eyes: EyeState; gazeX: number; gazeY: number }) {
  if (eyes === "happy") {
    // Closed, upturned. Replaces the sclera entirely rather than covering it,
    // so there's no seam where a lid would meet the white.
    return (
      <G>
        <Path
          d={`M${LEFT_EYE.cx - 9} ${LEFT_EYE.cy + 2} q9 -11 18 0`}
          stroke={PUPIL}
          strokeWidth={3.2}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M${RIGHT_EYE.cx - 9} ${RIGHT_EYE.cy + 2} q9 -11 18 0`}
          stroke={PUPIL}
          strokeWidth={3.2}
          strokeLinecap="round"
          fill="none"
        />
      </G>
    );
  }

  const pupilScale = eyes === "wide" ? 0.72 : 1;

  return (
    <G>
      {/* sclera — the source art's own shapes */}
      <Path
        d="m159.9-13.4c5.8 0 9.1 5.9 9.1 13.4 0 8.3-2.7 10.5-8.5 10.5-6.1 0.5-10.5-3.5-11.5-10.9-0.5-6.6 2.9-13 10.9-13z"
        fill={WHITE}
      />
      <Path
        d="m186.4-13.4c6.5 0 10.2 5.8 10.2 12.9 0 4.9-1.6 9.8-5.2 10.9-2.9 0.5-7.4-0.1-8.8-1.5-3.1-1.3-6.1-2.8-6.1-9 0-7.7 3.9-13.3 9.9-13.3z"
        fill={WHITE}
      />

      {/* pupils, moved as a group so the highlight travels with them */}
      <G translateX={gazeX} translateY={gazeY}>
        <G scale={pupilScale} origin={`${LEFT_EYE.cx}, ${LEFT_EYE.cy}`}>
          <Path
            d="m160.6-6.3c2.3 0 3.9 2.7 3.9 5.4 0 2.5-0.6 4.3-1.7 5.8-1.8-0.9-3.8-0.9-5.3 0.1-1.1-1.1-1.8-3.1-1.5-5.9 0.1-2.5 1.6-5.7 4.2-5.7l0.4 0.3z"
            fill={PUPIL}
          />
          <Ellipse cx={158.5} cy={-2.4} rx={1.26} ry={1.644} fill={WHITE} />
        </G>
        <G scale={pupilScale} origin={`${RIGHT_EYE.cx}, ${RIGHT_EYE.cy}`}>
          <Path
            d="m186.1-6.3c2.4 0 4.1 2.8 4 6.3 0 2-0.6 3.6-1.5 5.1-2-0.8-3.6-1.1-5.7 0-1-1.1-1.9-2.6-1.9-5.2 0-3.4 1.6-6.5 4.1-6.5l1 0.3z"
            fill={PUPIL}
          />
          <Ellipse cx={184.4} cy={-2.3} rx={1.26} ry={1.704} fill={WHITE} />
        </G>
      </G>

      {/* half-lidded: a body-blue cap over the top of each sclera. Drawn in the
          body colour rather than as a separate lid colour so it reads as the
          head coming down over the eye. */}
      {eyes === "half" && (
        <G>
          <Path d="m147 -14 h24 v9 q-12 5 -24 0 z" fill={BLUE} />
          <Path d="m174 -14 h25 v9 q-12 5 -25 0 z" fill={BLUE} />
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
        // The source art's dark lower shape, dropped and deepened so the beak
        // parts. Same silhouette, so it still reads as the same beak.
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

export default function MascotBase({ size, pose = {}, hat = "original" }: Props) {
  const {
    gazeX = 0,
    gazeY = 0,
    eyes = "open",
    mouth = "closed",
    tiltDeg = 0,
    leftFlipperDeg = 0,
    rightFlipperDeg = 0,
  } = pose;
  const hatStyle = HAT_STYLES[hat];

  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      {/* Feet sit outside the tilt: the character leans, it doesn't slide. */}
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
        <Path
          d="m132.9 98.9c0-0.5 4.1-7.6 10.3-7.9l0.9 1.2c-0.1 0-5.1-0.6-11.2 6.7z"
          fill={FOOT_LIGHT}
          opacity={0.41}
        />
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
        {/* dark silhouette behind everything — the art's outline substitute */}
        <Path
          d="m213.1 19c1.4-1.5 8.9 7.6 9.9 9.3 1.1 1.7 0.9 1.7 0.6 2.7 5.6 7.4 13.3 19.9 13.3 30.3 0 7.1-5.9 7.6-12.4 3.3-3.4-2.2-6.4-5.6-6.5-5.1-0.4 5.6-2.1 13.9-7.1 21.1-5.9 8.7-17 17.3-38.3 18.3-22.1 0.9-32.2-6.8-38.1-13.1-6.1-6.7-8.1-16.5-8.5-24.8 0-0.1-7.9 7.4-12.6 8.1-4.3 0.7-4.8-3.7-3.3-10.1 3.3-13.7 15.9-29.4 23-38 1.4-11.7 5.8-30.4 9.9-39.6h60.6c4.5 5.3 8.9 24.6 9.5 37.6z"
          fill={NAVY}
        />
        {/* blue body */}
        <Path
          d="m211.6 20.1c0-1-1.2-17.1-8.1-37.1h-60.3c-3.2 22.3-7.8 38.8-8.2 39.4-3.6 4.2-22.9 26.4-23.9 40.5-0.4 9.4 11 2.2 16.3-3.5-0.8-12.1 3.6-25.4 4.5-25.3 1.5 0.5-2.5 6.9-2.9 22.2 0.2 13 3.5 20.6 10.5 27.8 6 6.2 17 11.2 33 11.5 12.7 0 24.4-3.7 30-7.7 9.4-6.4 13.4-15.9 14.1-25.5 1.4-13-3.7-28.3-3.7-28.4 0-0.6 1.1-1 1.5 0 2.1 6.3 3.6 13.6 3.7 22.4h0.8c3.1 3.6 14.5 13.6 15.7 5.4 0.9-10.2-12.5-31.4-22.6-40.2-0.5-0.3-0.4-1.1-0.4-1.5z"
          fill={BLUE}
        />
        {/* the single white face-and-belly shape, rising into two eye lobes */}
        <Path
          d="m191.4 10.4c1.6 8.9 11.7 29.6 12.2 44.1 0.4 22.4-11.1 33.1-30.7 34.1-15.8 0.2-31.5-7.1-31.5-30.6 0-17.1 10-34.5 13.2-46.7-4.7-1.7-5.9-7.4-5.7-11.7 0.1-6.4 3.3-12.1 10.5-12.1 4.8 0 9.5 4.7 9.5 12.1v4.8c0 0.2 1.7-0.6 4.5-0.6s3.7 0.8 3.6 0.6c-0.5-1.5-0.6-3.1-0.6-4.8 0-6.6 3.2-12.2 9.8-12.4 5.9-0.2 10.3 5.9 10.3 13.2 0 5.6-1.9 9.2-5.1 10z"
          fill={WHITE}
        />
        <Path
          d="m146.9 77.5c4.8 6.5 11.6 10.9 25.5 11.3 9.2-0.2 19.2-2.7 26.2-11.4-3.5 1.2-12.7 5.1-26.1 5.1-11.9-0.1-18.3-2.9-25.5-5.1l-0.1 0.1z"
          fill={WHITE_SHADE}
        />
        {/* Flippers. In the source these are one path holding both wings as
            subpaths, which makes them a single immovable shape; split here so
            each can swing from its own shoulder.

            The second subpath began with a relative `m54.3 5` measured from
            the first subpath's start point (139.1, 87.8) — hence the absolute
            193.4, 92.8 it becomes below. Getting that wrong silently teleports
            the right flipper, so it's worth stating.

            They rotate over a smooth body: the silhouette's sides carry no
            wing bulge of their own, so a raised flipper reveals plain blue
            rather than a leftover lump. */}
        {/* Signs verified by rendering, not by reasoning about the geometry —
            the wing shapes' mass doesn't sit where their bounding box suggests,
            and the first guess had positive swinging both flippers *inward*
            across the belly. Positive is now outward/raised on both sides. */}
        <G id="flipper-left" rotation={leftFlipperDeg} origin={LEFT_SHOULDER}>
          <Path
            d="m139.1 87.8c3.4 2.6 10.9 5 16.4 5.6l-8.1-13.8c-5.8-1.6-14.3-9.8-17.4-17.6l-0.9-3c0 14 5.8 24 10 28.8z"
            fill={BLUE_SHADE}
          />
        </G>
        <G id="flipper-right" rotation={-rightFlipperDeg} origin={RIGHT_SHOULDER}>
          <Path
            d="M193.4 92.8c3-0.2 7.7-2 10.2-3.4 4.3-3.5 12.9-10.9 14.4-27.8-3.5 5.9-10.1 13.3-18 16.5l-6.6 14.7z"
            fill={BLUE_SHADE}
          />
        </G>
        <Path
          d="m127.6 40c-3.5 7.5-7.1 18.9-13.5 21.8-2.5 1.6-3.2-0.4-3-0.2 0.5 6.3 4.8 4.9 15.8-4.3-0.4-2.9 0.5-13.9 0.7-17.3zm87.4-4 3.1 18.6c2 2.8 11.4 11 14.9 8.4 1.1-0.6 1-2 1-2-6 3-12.4-12.1-17.4-23.1l-1.6-1.9z"
          fill={BLUE_SHADE}
        />
        <Path
          d="m134.1 21.5c-5.7 7-21 25.8-22.7 38.4 3.1-11.1 13.5-26.9 22.6-36.4 1-1 0.5-3 0.1-2zm77.9-1.5c3.5 3.6 18.1 18.6 22.5 38.6-0.5-15.1-13-31-21.1-39-1.4-1.5-1.4-0.1-1.4 0.4z"
          fill={BLUE_LIGHT}
          opacity={0.34}
        />

        <Eyes eyes={eyes} gazeX={gazeX} gazeY={gazeY} />
        <Mouth mouth={mouth} />

        {/* Hat last, so it sits over the head. The scale is anchored at the
            crown's top (y −49) so compressing it lifts the brim rather than
            sinking the crown. */}
        <G id="hat" rotation={hatStyle.rotate} origin="172, -20">
          <G scale={`1, ${hatStyle.scaleY}`} origin="172, -49" translateY={hatStyle.shiftY}>
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
          <Path
            d="m166.6-49.3c6.9 0.3 6.4-1.1 11.9-1.1 2.5-0.5 7.9 0 12 2.1 3.5 1.4 5.4 3.4 6 7.3-0.4 2.5-0.5 2.5 1.9 7.4 1.2 2.7-2.4 3.2-4.2 2.3-2.7-0.7-8.6-2.7-22.1-2.6-15.1 0-15 1.5-19 1-2.6-0.7-6.1-1.9-2.6-4 2.9-1.9-1.9-2.1-1.3-6.5 0.2-4 6.5-7.6 12.7-7.6l4.7 1.7z"
            fill={HAT_CROWN}
          />
          <Path
            d="m142.5-26.8c-0.4-3.2 3.4-7.7 3.9-10.7 0.7-4.4 1.6-7.5 3.6-10 1.9-2.4 5.7-4.1 9-4.9 4.9-1 9.4 0.4 13.1 0.1 4.5-0.3 9.4-2 15.4-0.1 6 2 8.4 3.4 10 7.4 2.1 5 0.5 2.5 5 13 0.9 2.4 0.5 2.1 1.1 4.4"
            fill="none"
            stroke={HAT_STROKE}
            strokeWidth={1.49}
          />
          <Path
            d="m141.6-9c6-2.8 13.4-4.8 22.9-5 11-0.6 22.6 0 35 4.4l5 1.6-1.4-9.1c-7.6-1.9-22.1-2.4-30.1-2.5-6.5-0.3-23 1.6-29 3l-2.4 7.6z"
            fill={HAT_SHADOW}
            opacity={0.16}
          />
          <Path
            d="m129.1-7.5c0.3-3.4 16.4-8.5 25.8-9.9 12.5-2.2 23.1-2 31.6-0.7 10.1 1.1 28.1 5.5 30.1 8.3"
            fill="none"
            stroke={HAT_STROKE}
            strokeWidth={1.684}
          />
          </G>
        </G>
      </G>
    </Svg>
  );
}

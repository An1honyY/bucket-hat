// §13.9's paper-doll layer — the clothes the mascot wears, tinted at render
// time from the recommended item's own `MascotSwatch`.
//
// Drawn to Antony's reference: a hooded rain jacket whose hood frames the
// face, whose hem sits above the belly's lower lobe so white and blue still
// show, and whose sleeves cover the upper flipper with the blue tip out
// below the cuff.
//
// The sleeve is the piece with a structural consequence. It cannot live on
// the torso overlay, because the flipper rotates: at any raise the limb would
// slide straight out of a static sleeve. It is therefore drawn *inside* the
// wing group, from the wing's own curve data, so it turns with the limb — the
// same reasoning that made the wings separate paths in the first place (see
// MascotBase's header).
//
// Only the fill is tinted. Outline, seams and shading are fixed, and the two
// shading layers are plain white/black at low alpha rather than lightened and
// darkened variants of the tint — that way a swatch of any lightness keeps
// its modelling, and white or the neutral grey can't dissolve into the belly.

/** Every garment carries the character's own outline, at the character's weight. */
export const GARMENT_OUTLINE = "#081834";
export const GARMENT_OUTLINE_WIDTH = 3.2;
/** Seams — pockets, the cuff, the placket. Thinner than the silhouette. */
export const GARMENT_SEAM_WIDTH = 1.5;
export const GARMENT_HIGHLIGHT = "#FFFFFF";
export const GARMENT_HIGHLIGHT_OPACITY = 0.22;
export const GARMENT_SHADE = "#000000";
export const GARMENT_SHADE_OPACITY = 0.1;

/**
 * The jacket — hood and body as **one** path, with the face opening and the
 * V-neck cut out of it as a single hole (`fillRule="evenodd"`).
 *
 * This is the third construction and the first that reads. The others each
 * failed for the same underlying reason, worth stating once: the garment is
 * one piece of fabric, and every attempt to build it from two pieces put a
 * line where the reference has none.
 *
 *   1. Hood folded into the body as a rising collar → "a shirt that goes up
 *      to his ears". A collar that high has no reason to exist.
 *   2. Separate hood drawn under the body → invisible. Hood and shoulders
 *      occupy the same part of the silhouette, so all that showed was the few
 *      units protruding past the flank, which looked like straps.
 *   3. Separate hood drawn over the body → visible, but with its own outline
 *      cutting across the shoulders. Two garments, not one.
 *
 * So: one contour around the outside, one around the hole. The hood is simply
 * where that outer contour bulges past the head — about 12 units proud at the
 * temples, easing back to the torso's own line by the chest, so the colour
 * runs unbroken from hood to hem.
 *
 * The hole is a keyhole: wide around the face, narrowing to a V at mid-chest.
 * That is the reference's collar, and it suits him — the white of his face
 * runs down into the white of his chest through it. It clears both eye
 * patches, passing outside x 55–94 at eye height, and the beak sits inside
 * it. The top of both contours is under the hat and never seen.
 */
export const JACKET =
  // Outer contour: hood, flanks, hem. The bulge peaks at the temples (y ≈ 64)
  // and is back on the torso's own line by the chest — carried further down it
  // sits exactly where the flippers hang and swallows both sleeves.
  "M46 47" +
  "C36.5 55 33.5 65 35.5 74" +
  "C37.5 81 40 86 39.5 93" +
  "C38 100 37.2 106 37.1 110.5" +
  "C48 116.5 61 119.5 75 119.8" +
  "C89 119.5 102 116.5 112.9 110.5" +
  "C112.8 106 112 100 110.5 93" +
  "C110 86 112.5 81 114.5 74" +
  "C116.5 65 113.5 55 104 47" +
  "C95 41 55 41 46 47 z" +
  // The hole: face opening narrowing to the V.
  "M54 50" +
  "C51.5 60 53 70 57 77" +
  "C62 84 68.5 87.5 75 89" +
  "C81.5 87.5 88 84 93 77" +
  "C97 70 98.5 60 96 50" +
  "C88 45.5 62 45.5 54 50 z";

/** A front pouch. Each opening runs from high near the centre *outward* and
 *  down, the way the reference draws it; mirrored — outer top to inner bottom
 *  — the two meet in a V and read as a seam down his belly instead. */
export const JACKET_SEAMS = [
  "M69 96 C63.5 100 58.5 104.5 55.5 111",
  "M81 96 C86.5 100 91.5 104.5 94.5 111",
];

/** A soft light down the left edge, following the new outer contour so the
 *  hood and the flank catch it as one surface. */
export const JACKET_HIGHLIGHT =
  "M46 47 C36.5 55 33.5 65 35.5 74 C37.5 81 40 86 39.5 93" +
  "C38 100 37.2 106 37.1 110.5 C39.5 111.8 42 112.9 44.6 113.8" +
  "C43.6 110.5 43 106 43 102 C43.2 94 45.5 86 43.5 76" +
  "C42 66 45 55 52.2 48.5 z";

/**
 * One sleeve, in the wing's own coordinate space and mirrored with it.
 *
 * Both edges start from the wing's own curves, de Casteljau-split at t = 0.75,
 * then offset outward by ~2 units — so it hangs *over* the limb rather than
 * being painted onto it. Recompute the split if `WING` ever changes.
 *
 * Both of those numbers were arrived at by rendering, and both matter:
 *
 * - Split at 0.75, not half way. Only the outer third of the flipper clears
 *   the torso at rest, so a sleeve over the limb's "upper half" is entirely
 *   behind the body and invisible.
 * - Offset outward. Traced exactly onto the wing it is the same width as the
 *   blade, and the jacket body then covers all but a sliver — measured, about
 *   two units of visible sleeve. A sleeve is baggier than the arm inside it,
 *   which is both true of coats and what makes this one read.
 */
export const JACKET_SLEEVE =
  "M52 66.5" +
  "C41.5 70.5 30.5 83 24.3 96.5" +
  // the cuff, across the limb
  "C27.5 101 33.5 103.5 40.5 103.2" +
  // inner edge, deliberately pushed *inside* the torso so the jacket body
  // buries the root the way the torso buries the flipper's
  "C45 97 50 91 54 86.5 z";

/** The cuff on its own, stroked over the sleeve so the opening reads. */
export const JACKET_CUFF = "M24.3 96.5 C27.5 101 33.5 103.5 40.5 103.2";

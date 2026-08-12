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
 * The jacket body, hood included.
 *
 * One shape rather than a separate hood: everything above the brow is behind
 * the hat anyway (the hat draws after this), so what actually reads as a hood
 * is the collar rising past the cheeks. The opening is cut to clear both eye
 * patches — it passes outside x 55–94 at eye height and dips to y 81 under
 * the beak, which sits inside it.
 *
 * The flanks trace the torso's own outline so the two share a silhouette
 * rather than the jacket floating inside it.
 */
export const JACKET_BODY =
  "M46 52" +
  // down the left flank, on the torso's line
  "C44.6 60 44.2 67 43 75.02" +
  "C39.7 84.22 37.1 95.1 36.8 104.5" +
  "C36.75 106.5 36.85 108.5 37.1 110.5" +
  // hem, dipping in the middle the way a heavy hem hangs
  "C48 116.5 61 119.5 75 119.8" +
  "C89 119.5 102 116.5 112.9 110.5" +
  "C113.15 108.5 113.25 106.5 113.2 104.5" +
  // up the right flank
  "C112.9 95.1 110.3 84.22 107 75.02" +
  "C105.8 67 105.4 60 104 52" +
  // the opening: down around the right cheek, under the beak, up the left
  "C102.6 60 100.8 65 99 66.4" +
  "C95.5 72 89.5 77 84 79.6" +
  "C81 81 78 81.6 75 81.6" +
  "C72 81.6 69 81 66 79.6" +
  "C60.5 77 54.5 72 51 66.4" +
  "C49.2 65 47.4 60 46 52 z";

/** The placket fold at the throat, and the two pocket seams. Stroked, not
 *  filled, so they read as stitching at any tint. */
export const JACKET_SEAMS = [
  // the collar's inner fold, echoing the opening a few units below it
  "M55 71.5 C59.5 77.5 66 82.5 75 84.6 C84 82.5 90.5 77.5 95 71.5",
  // pockets
  "M55.5 96 C57.5 103 61.5 107.5 66.5 109.5",
  "M94.5 96 C92.5 103 88.5 107.5 83.5 109.5",
];

/** A soft light down the left edge, matching where the source art puts its
 *  own highlight on the body. */
export const JACKET_HIGHLIGHT =
  "M46 52 C44.6 60 44.2 67 43 75.02 C39.7 84.22 37.1 95.1 36.8 104.5" +
  "C36.75 106.5 36.85 108.5 37.1 110.5 C39.5 111.8 42 112.9 44.6 113.8" +
  "C43.6 111 43.1 107.7 43.2 104.5 C43.5 95.4 46 84.9 49.2 76" +
  "C50.4 68 50.8 60 52.2 52.6 z";

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

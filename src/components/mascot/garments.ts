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
 * The hood — a real one, drawn behind the body and around the head.
 *
 * The first attempt folded this into the body as a collar that simply rose to
 * the hat brim. It read as a t-shirt pulled up to his ears, because a collar
 * that high has no reason to be there. A hood does: it sits *outside* the
 * head's silhouette (about 5 units proud of it), which is what says "there is
 * fabric around his head" rather than "his shirt is too big".
 *
 * A horseshoe, open at the bottom where the body's shoulders cover it. The
 * top third is under the hat and never seen, so it is only roughed in; the
 * inner edge is cut to clear both eye patches, passing outside x 55–94 at eye
 * height.
 */
export const JACKET_HOOD =
  // Widest at the temples, tucking back inside the body's edge by the time it
  // reaches the chest — left proud down there it read as a lump at the waist.
  "M46 97" +
  "C34 84 34 66 44 53" +
  "C53 43 97 43 106 53" +
  "C116 66 116 84 104 97" +
  // inner edge, back up around the right of the face
  "C101 89 99 82 97 74" +
  "C96 64 95 56 93 51" +
  "C86 46 64 46 57 51" +
  "C55 56 54 64 53 74" +
  "C51 82 49 89 46 97 z";

/**
 * The jacket body: rounded shoulders, and a low, nearly flat neckline.
 *
 * The neckline is the fix for the same t-shirt problem. Swept up to the
 * cheeks it strangled him; a penguin this round has no neck to speak of, so
 * the opening sits low on the chest (y ≈ 80) and stays almost horizontal,
 * leaving a band of white throat above it. The shoulders still rise to y 68 —
 * that is where the sleeves attach, and dropping them too would have left the
 * arms unconnected.
 *
 * The flanks trace the torso's own outline so the two share a silhouette
 * rather than the jacket floating inside it.
 */
export const JACKET_BODY =
  "M46 68" +
  // down the left flank, on the torso's line
  "C44 76 41 88 38.5 100" +
  "C37.6 105 37.1 108 37.1 110.5" +
  // hem, dipping in the middle the way a heavy hem hangs
  "C48 116.5 61 119.5 75 119.8" +
  "C89 119.5 102 116.5 112.9 110.5" +
  "C112.9 108 112.4 105 111.5 100" +
  // up the right flank
  "C109 88 106 76 104 68" +
  // right shoulder into the neckline
  "C101 73 97 77 92 79" +
  "C87 80.5 81 81.2 75 81.3" +
  "C69 81.2 63 80.5 58 79" +
  "C53 77 49 73 46 68 z";

/** The neckline's inner fold, and the pouch pocket. Stroked, not filled, so
 *  they read as stitching at any tint. */
export const JACKET_SEAMS = [
  // the collar's fold, echoing the neckline a few units below it
  "M55 78 C61 82.5 68 84.8 75 85 C82 84.8 89 82.5 95 78",
  // A front pouch, the way the reference draws it: each opening runs from
  // high near the centre *outward* and down. Mirrored the other way — outer
  // top to inner bottom — the two lines meet in a V and read as a seam down
  // his belly rather than as a pocket.
  "M69 94.5 C63.5 99 58.5 103.5 55.5 110",
  "M81 94.5 C86.5 99 91.5 103.5 94.5 110",
];

/** A soft light down the left edge, matching where the source art puts its
 *  own highlight on the body. */
export const JACKET_HIGHLIGHT =
  "M46 68 C44 76 41 88 38.5 100 C37.6 105 37.1 108 37.1 110.5" +
  "C39.5 111.8 42 112.9 44.6 113.8 C43.6 111 43.1 107.7 43.2 104.5" +
  "C43.5 96 45.5 86 48 77.5 C48.8 73.5 49 70.5 49.4 68 z";

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

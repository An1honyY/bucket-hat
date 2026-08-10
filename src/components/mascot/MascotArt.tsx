import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { MASCOT_GARMENT_OUTLINE, mascotSwatchHex } from "../../theme/mascotSwatches";
import type { MascotSwatch } from "../../types";

// docs/09-design-system.md §9.7, docs/13-extended-features.md §13.9 — the base
// character, drawn as named groups so the animation layer can transform each
// one independently and the paper-doll tint only ever sets a slot's `fill`.
//
// The character is a kororā — a little blue penguin, the one that actually
// lives on Auckland's coast. The spec names no animal, so this is a choice,
// and it was made on the slot constraints rather than on charm: §13.9 needs a
// jacket, bottoms and a held umbrella, which requires an upright body with a
// torso, two limbs that can hold something, and legs. Most native birds are
// wrong for that — a kiwi is a horizontal teardrop with no waist and nothing
// to hold an umbrella with. A penguin is already shaped like someone standing
// up wearing a coat.
//
// It wears the app's own bucket hat, in the same kōwhai gold as the launcher
// icon, so the companion and the app mark read as the same thing.
//
// This component is pure: every pose is a number passed in. The animation
// layer (src/lib/mascot.ts + the animated wrapper) decides what those numbers
// are, which keeps "what the character looks like" and "how it moves" in
// separate files, and means the reduce-motion path is just the same art with
// static values rather than a second illustration.

/** Character palette. Deliberately *not* theme tokens: the mascot keeps its
 *  own colouring across light/dark and across the weather mood, the way a
 *  drawing of an animal would. Only the garment slots change colour. */
// Lifted from a much darker slate. A kororā really is near-indigo, but at the
// original value a navy or black garment sat within a few steps of the body
// and the two merged into one shape — and those are two of the twelve swatches
// people will most often pick for a coat. The character has to be light enough
// that every swatch reads as clothing on it.
const BODY = "#4E5CA0";
const BODY_SHADE = "#3E4A85";
const BELLY = "#F4F1FA";
const BEAK = "#E8A23C";
const FOOT = "#DE8F2E";
const OUTLINE = "#1E2033";
const HAT = "#E8B93C";
const HAT_BAND = "#C9992B";
const PUFF = "#DCE8F5";

/** A garment slot. Present means "wearing one"; an absent `swatch` inside it
 *  means "wearing one we have no colour for", which renders neutral — the two
 *  are genuinely different states and §13.9 requires the second to still show
 *  the overlay. */
export interface MascotSlot {
  swatch?: MascotSwatch;
}

export interface MascotOutfit {
  jacket?: MascotSlot;
  bottoms?: MascotSlot;
  umbrella?: MascotSlot;
  scarf?: MascotSlot;
}

export type EyeState = "open" | "narrow" | "closed";

export interface MascotPose {
  /** Degrees, negative raises the flipper. The wave and the brow-shade both
   *  drive this; fanning drives the right one. */
  leftArmDeg?: number;
  rightArmDeg?: number;
  eyes?: EyeState;
  /** Forward lean, degrees — the umbrella huddle. */
  leanDeg?: number;
  /** Sideways streaming of the scarf tail, degrees. */
  scarfDeg?: number;
  /** The shiver's visible breath. */
  breath?: boolean;
  /** The warm state's sweat bead. */
  sweat?: boolean;
}

interface Props {
  size: number;
  outfit?: MascotOutfit;
  pose?: MascotPose;
}

export default function MascotArt({ size, outfit = {}, pose = {} }: Props) {
  const {
    leftArmDeg = 0,
    rightArmDeg = 0,
    eyes = "open",
    leanDeg = 0,
    scarfDeg = 0,
    breath = false,
    sweat = false,
  } = pose;

  const jacketFill = outfit.jacket ? mascotSwatchHex(outfit.jacket.swatch) : undefined;
  const bottomsFill = outfit.bottoms ? mascotSwatchHex(outfit.bottoms.swatch) : undefined;
  const umbrellaFill = outfit.umbrella ? mascotSwatchHex(outfit.umbrella.swatch) : undefined;
  const scarfFill = outfit.scarf ? mascotSwatchHex(outfit.scarf.swatch) : undefined;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* The whole character leans as one, so the umbrella huddle tips the
          body without detaching the hat or the feet from it. Rotating about
          the feet (50,88) rather than the centre keeps it standing on the
          ground instead of pivoting in mid-air. */}
      <G rotation={leanDeg} origin="50, 88">
        {/* Draw order is load-bearing: feet sit behind the body so they read
            as sticking out from under it, the bottoms slot goes *over* the
            body (drawn behind it, the body simply hid it), and the arms go
            over both garments so a flipper reads as coming out of a sleeve. */}

        {/* ---- feet ---- */}
        <G id="feet">
          <Ellipse cx={41} cy={90} rx={7} ry={4} fill={FOOT} stroke={OUTLINE} strokeWidth={1.6} />
          <Ellipse cx={59} cy={90} rx={7} ry={4} fill={FOOT} stroke={OUTLINE} strokeWidth={1.6} />
        </G>

        {/* ---- body ---- */}
        <G id="body">
          <Ellipse cx={50} cy={58} rx={23} ry={30} fill={BODY} stroke={OUTLINE} strokeWidth={2} />
          {/* The belly is what makes it read as a penguin rather than a blob,
              and it's what a jacket sits on top of. */}
          <Ellipse cx={50} cy={64} rx={15} ry={22} fill={BELLY} />
        </G>

        {/* ---- bottoms slot ---- */}
        {bottomsFill && (
          <G id="bottoms-slot">
            {/* Solid across the waist rather than notched between the legs.
                The notch let the white belly through, and stacked under the
                open jacket's own gap it drew one long white stripe from chin
                to feet. A short centre seam says "two legs" without cutting a
                hole in the shape. */}
            <Path
              d="M33 72 q17 6 34 0 v9 q0 6 -7 6 h-20 q-7 0 -7 -6 z"
              fill={bottomsFill}
              stroke={MASCOT_GARMENT_OUTLINE}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
            <Path d="M50 79 v8" stroke={MASCOT_GARMENT_OUTLINE} strokeWidth={1.2} strokeLinecap="round" />
          </G>
        )}

        {/* ---- jacket slot ---- */}
        {jacketFill && (
          <G id="jacket-slot">
            {/* An open coat: two front panels with a gap, so the belly still
                shows between them. A solid rectangle over the torso read as
                the character being *replaced* by the garment rather than
                wearing it. */}
            <Path
              d="M31 50 a19 19 0 0 1 12 -6 l7 9 v22 h-13 a6 6 0 0 1 -6 -6 z"
              fill={jacketFill}
              stroke={MASCOT_GARMENT_OUTLINE}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
            <Path
              d="M69 50 a19 19 0 0 0 -12 -6 l-7 9 v22 h13 a6 6 0 0 0 6 -6 z"
              fill={jacketFill}
              stroke={MASCOT_GARMENT_OUTLINE}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </G>
        )}

        {/* ---- scarf slot ---- */}
        {scarfFill && (
          <G id="scarf-slot">
            <Path
              d="M36 47 q14 6 28 0 v6 q-14 6 -28 0 z"
              fill={scarfFill}
              stroke={MASCOT_GARMENT_OUTLINE}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
            {/* The tail is its own rotating group — this is the part the wind
                state streams sideways, pivoting where it meets the neck. */}
            <G id="scarf-tail" rotation={scarfDeg} origin="62, 50">
              <Path
                d="M60 50 q10 2 14 10 q-4 3 -8 1 q-4 -5 -8 -5 z"
                fill={scarfFill}
                stroke={MASCOT_GARMENT_OUTLINE}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            </G>
          </G>
        )}

        {/* ---- arms (flippers) ---- */}
        {/* Pivot at the shoulder so a raised flipper swings rather than
            slides. Drawn after the jacket so a sleeve reads as on top of the
            coat, which is how a flipper poking out of a coat actually looks. */}
        {/* Deliberately breaking the body's silhouette rather than sitting
            inside it: drawn within the ellipse, in a shade only a little off
            the body's own, a raised flipper was invisible — the wave and the
            brow-shade poses looked identical to idle. */}
        <G id="arm-left" rotation={leftArmDeg} origin="28, 52">
          <Path
            d="M28 48 q-11 7 -11 20 q0 5 5 5 q5 0 5 -6 q0 -10 4 -15 z"
            fill={BODY_SHADE}
            stroke={OUTLINE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
        <G id="arm-right" rotation={rightArmDeg} origin="72, 52">
          <Path
            d="M72 48 q11 7 11 20 q0 5 -5 5 q-5 0 -5 -6 q0 -10 -4 -15 z"
            fill={BODY_SHADE}
            stroke={OUTLINE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>

        {/* ---- umbrella slot ---- */}
        {umbrellaFill && (
          <G id="umbrella-slot">
            {/* Held out to the side and well clear of the hat. At its first
                size and position the canopy overlapped the brim and the two
                read as a second hat rather than as something being carried.
                The handle running down to the flipper is what makes it read
                as held; without it the canopy just floats. */}
            {/* The handle runs *past* the flipper's tip and hooks back into
                it. Stopping short left the umbrella hanging in the air beside
                the penguin rather than being carried — the single thing that
                made this slot read as broken at full size. */}
            <Path d="M84 26 v44" stroke={OUTLINE} strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M84 70 q0 5 -5 5" stroke={OUTLINE} strokeWidth={2.2} strokeLinecap="round" fill="none" />
            <Path
              d="M71 26 a13 11 0 0 1 26 0 q-6.5 -3.5 -13 0 q-6.5 -3.5 -13 0 z"
              fill={umbrellaFill}
              stroke={MASCOT_GARMENT_OUTLINE}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </G>
        )}

        {/* ---- face ---- */}
        <G id="face">
          {eyes === "closed" ? (
            <>
              <Path d="M38 47 q4 3 8 0" stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" fill="none" />
              <Path d="M54 47 q4 3 8 0" stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <Ellipse cx={42} cy={46} rx={3.4} ry={eyes === "narrow" ? 1.4 : 3.6} fill={OUTLINE} />
              <Ellipse cx={58} cy={46} rx={3.4} ry={eyes === "narrow" ? 1.4 : 3.6} fill={OUTLINE} />
              {eyes === "open" && (
                <>
                  <Circle cx={43.2} cy={44.8} r={1.1} fill="#FFFFFF" />
                  <Circle cx={59.2} cy={44.8} r={1.1} fill="#FFFFFF" />
                </>
              )}
            </>
          )}
          <Path
            d="M50 51 l5 4 l-5 4 l-5 -4 z"
            fill={BEAK}
            stroke={OUTLINE}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </G>

        {/* ---- hat: the app's own mark, worn ---- */}
        <G id="hat">
          {/* A bucket hat, not a sun hat. The distinction is entirely in the
              brim: short, angled *down*, and only a little wider than the
              crown. Drawn first at rx 27 — wider than the penguin's whole
              body — it read as a sombrero, which is the one silhouette this
              app cannot afford to get wrong.

              Crown is a tapered dome, slightly wider at the base than the
              top, which is what separates a bucket hat from a beanie. */}
          <Path
            d="M37 30 q1 -15 13 -15 q12 0 13 15 z"
            fill={HAT}
            stroke={OUTLINE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Rect x={36} y={26} width={28} height={4.5} fill={HAT_BAND} />
          <Path
            d="M31 29 q19 7 38 0 q-2 8 -19 8 q-17 0 -19 -8 z"
            fill={HAT}
            stroke={OUTLINE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>

        {/* ---- transient state marks ---- */}
        {breath && (
          <G id="breath">
            <Circle cx={64} cy={58} r={4} fill={PUFF} opacity={0.85} />
            <Circle cx={71} cy={55} r={2.6} fill={PUFF} opacity={0.6} />
            <Circle cx={76} cy={53} r={1.6} fill={PUFF} opacity={0.4} />
          </G>
        )}
        {sweat && (
          <G id="sweat">
            {/* Beside the temple, clear of the hat brim and the eye. */}
            <Path d="M67 44 q3.5 5 0 7.5 q-3.5 -2.5 0 -7.5 z" fill="#7FC4E8" stroke={OUTLINE} strokeWidth={1.2} />
          </G>
        )}
      </G>
    </Svg>
  );
}

import Svg, { Line, Path, Rect } from "react-native-svg";

// docs/09-design-system.md §9.3/§9.4 (2026-07-21) — small line-icon glyphs
// paired with every clothing/accessory recommendation ("icon + item name",
// never bare text), one fixed icon per slot kind — not per-item art (gear
// photos stay exactly as they are in Gear/Journey Detail).
//
// UI/UX polish pass 2 (2026-07-23): jacket/base/shoe/umbrella/sunglasses/
// accessory paths are adapted from Tabler Icons (github.com/tabler/
// tabler-icons, MIT, no attribution required) — same 24x24 viewBox as this
// file's own convention, near-identical stroke width — after the
// hand-drawn originals didn't read clearly at a glance (the jacket glyph
// in particular didn't look like a jacket). Only geometry is reused; this
// component still applies its own strokeWidth/colour at render time, not
// Tabler's source styling. midlayer/bottoms/vehicle stay hand-drawn —
// simple enough silhouettes not to need an external source. See
// DECISIONS.md.
export type ClothingIconKind =
  | "jacket"
  | "midlayer"
  | "base"
  | "bottoms"
  | "shoe"
  | "umbrella"
  | "sunglasses"
  | "gloves"
  | "hat"
  | "accessory"
  | "vehicle";

interface Props {
  kind: ClothingIconKind;
  size?: number;
  color: string;
}

// A picked/fallback accessory's `name`/`fallbackText` is free text with no
// further discriminated subtype (§3's ClothingItem has no accessory
// sub-kind), so a name/text match is the only signal available without a
// schema change.
//
// Only sunglasses were matched before, which meant recommend.ts's cold-weather
// line — "Consider gloves/a hat — it's cold out" — fell through to the generic
// glyph, a *backpack*. Nothing about that advice involves carrying a bag.
//
// Order matters, because both engine strings name more than one garment:
// "UV is high — sunglasses/a hat recommended" and "Consider gloves/a hat —
// it's cold out" each mention a hat, so sunglasses and gloves are tested first
// and the hat glyph is left for text that only says hat (a user-named "Beanie"
// or "Wool hat"). The generic bag now only appears for an accessory that
// really is a carried thing.
export function accessoryIconKind(text: string): ClothingIconKind {
  if (/sunglass|shades/i.test(text)) return "sunglasses";
  if (/glove|mitten/i.test(text)) return "gloves";
  if (/hat|beanie|cap\b|toque/i.test(text)) return "hat";
  return "accessory";
}

const PATHS: Record<ClothingIconKind, { d: string[]; lines?: { x1: number; y1: number; x2: number; y2: number }[]; rects?: { x: number; y: number; w: number; h: number; rx: number }[] }> = {
  // Tabler Icons "jacket" (MIT) — a winter coat with a V-neck collar and
  // two flapped side pockets, unlike the old unrecognisable outline.
  jacket: {
    d: [
      "M16,3l-4,5l-4,-5",
      "M12,19a2,2,0,0,1,-2,2h-4a2,2,0,0,1,-2,-2v-8.172a2,2,0,0,1,.586,-1.414l.828,-.828a2,2,0,0,0,.586,-1.414v-2.172a2,2,0,0,1,2,-2h8a2,2,0,0,1,2,2v2.172a2,2,0,0,0,.586,1.414l.828,.828a2,2,0,0,1,.586,1.414v8.172a2,2,0,0,1,-2,2h-4a2,2,0,0,1,-2,-2",
      "M20,13h-3a1,1,0,0,0,-1,1v2a1,1,0,0,0,1,1h3",
      "M4,17h3a1,1,0,0,0,1,-1v-2a1,1,0,0,0,-1,-1h-3",
      "M12,19v-11",
    ],
  },
  // A crew-neck jumper with long sleeves. Replaces a hand-drawn "gilet" that
  // was three strokes around an open quadrilateral and read as an abstract
  // shape rather than a garment. Long sleeves are what separate it from
  // `base` (a short-sleeved tee) at this size; the round collar separates it
  // from `jacket`, which has a V-neck, pockets and a centre zip.
  midlayer: {
    d: [
      // Sleeves run *down the sides* to cuffs near the hem, rather than
      // flaring off the shoulder. A first attempt kept the Tabler shirt's
      // short flared sleeve and the result was indistinguishable from `base`
      // at any size — long sleeves are the whole distinction between a jumper
      // and a tee, so they have to be unmistakably long.
      "M8.5,5 L5,6.5 L3.5,15.5 L6.5,16.6 L7.5,10.5 L7.5,20 L16.5,20 L16.5,10.5 L17.5,16.6 L20.5,15.5 L19,6.5 L15.5,5 Z",
      "M8.5,5 a3.5,3.5,0,0,0,7,0",
    ],
  },
  // Tabler Icons "shirt" (MIT) — a t-shirt collar/sleeve silhouette.
  base: {
    d: ["M15,4l6,2v5h-3v8a1,1,0,0,1,-1,1h-10a1,1,0,0,1,-1,-1v-8h-3v-5l6,-2a3,3,0,0,0,6,0"],
  },
  // Hand-drawn — a simple trouser silhouette: waistband + two legs split
  // by a centre seam.
  bottoms: {
    d: ["M7,4 L17,4 L17,20 L13.5,20 L12,10 L10.5,20 L7,20 Z", "M7,7 L17,7"],
  },
  // Tabler Icons "shoe" (MIT).
  shoe: {
    d: [
      "M4,6h5.426a1,1,0,0,1,.863,.496l1.064,1.823a3,3,0,0,0,1.896,1.407l4.677,1.114a4,4,0,0,1,3.074,3.89v2.27a1,1,0,0,1,-1,1h-16a1,1,0,0,1,-1,-1v-10a1,1,0,0,1,1,-1",
      "M14,13l1,-2",
      "M8,18v-1a4,4,0,0,0,-4,-4h-1",
      "M10,12l1.5,-3",
    ],
  },
  // Tabler Icons "umbrella" (MIT).
  umbrella: {
    d: ["M4,12a8,8,0,0,1,16,0l-16,0", "M12,12v6a2,2,0,0,0,4,0"],
  },
  // Tabler Icons "sunglasses" (MIT).
  sunglasses: {
    d: [
      "M8,4h-2l-3,10",
      "M16,4h2l3,10",
      "M10,16h4",
      "M21,16.5a3.5,3.5,0,0,1,-7,0v-2.5h7v2.5",
      "M10,16.5a3.5,3.5,0,0,1,-7,0v-2.5h7v2.5",
      "M4,14l4.5,4.5",
      "M15,14l4.5,4.5",
    ],
  },
  // Hand-drawn — a mitt whose thumb is a lobe of the *same* outline, not a
  // stroke tacked onto the side. Two earlier attempts failed differently:
  // separate fingers turned to mush at 15px, and a mitten drawn as body +
  // thumb left the body's edge running between them, so the thumb read as a
  // detached blob. One continuous silhouette fixes both.
  gloves: {
    d: [
      "M8,20.4 V15 C6.3,15.2 5,14.1 5,12.6 C5,11.3 6.5,10.8 7.4,11.7 L8,12.4 V10.2 a4,4,0,0,1,8,0 V20.4 Z",
      "M8,17.4 H16",
    ],
  },
  // Hand-drawn — a ribbed beanie: tall crown, a flush turned-up band, and
  // three rib strokes through the band. No pom, by request. An earlier
  // version used a shallow dome on an over-wide band and read as a cloche or
  // a serving cover; the height and the ribbing are what sell "knitted".
  hat: {
    d: [
      "M6.5,15.2 C6.5,9.2 8.6,5.2 12,5.2 C15.4,5.2 17.5,9.2 17.5,15.2",
      "M6.2,15.2 h11.6 a0.9,0.9,0,0,1,.9,.9 v2.1 a0.9,0.9,0,0,1,-.9,.9 h-11.6 a0.9,0.9,0,0,1,-.9,-.9 v-2.1 a0.9,0.9,0,0,1,.9,-.9 z",
      "M9.4,15.6 v2.9",
      "M12,15.6 v2.9",
      "M14.6,15.6 v2.9",
    ],
  },
  // Tabler Icons "backpack" (MIT) — a genuinely carried accessory. No longer
  // the catch-all for gloves and hats; see accessoryIconKind above.
  accessory: {
    d: [
      "M5,18v-6a6,6,0,0,1,6,-6h2a6,6,0,0,1,6,6v6a3,3,0,0,1,-3,3h-8a3,3,0,0,1,-3,-3",
      "M10,6v-1a2,2,0,1,1,4,0v1",
      "M9,21v-4a2,2,0,0,1,2,-2h2a2,2,0,0,1,2,2v4",
      "M11,10h2",
    ],
  },
  // Tabler Icons "car" (MIT) — used by GearThumbnail's vehicle rows.
  vehicle: {
    d: [
      "M5,17a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
      "M15,17a2,2,0,1,0,4,0a2,2,0,1,0,-4,0",
      "M5,17h-2v-6l2,-5h9l4,5h1a2,2,0,0,1,2,2v4h-2m-4,0h-6m-6,-6h15m-6,0v-5",
    ],
  },
};

export default function ClothingTypeIcon({ kind, size = 16, color }: Props) {
  const spec = PATHS[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {spec.d.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {spec.rects?.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} stroke={color} strokeWidth={1.8} />
      ))}
      {spec.lines?.map((l, i) => (
        <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

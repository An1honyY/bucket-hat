# Mascot — handoff

Phase 21 (`docs/13-extended-features.md` §13.9, `docs/09-design-system.md` §9.7).
The character is **built and poseable**; the animation layer is **not started**.
Read this before touching `MascotBase.tsx` — most of it is scar tissue from
mistakes that cost several rounds each.

## What exists

| File | State |
|---|---|
| `MascotBase.tsx` | The character. Pure, declarative — every pose is a number passed in. **Done.** |
| `poses.ts` | Seven named reference poses as typed constants. Nothing consumes them yet. |
| `MascotPreview.tsx` | **Temporary bench.** Not routed; wired into `TodayScreen` by hand during art work. Delete when Phase 21 ships. |
| `../../theme/mascotSwatches.ts` | `MascotSwatch` → hex, plus the neutral placeholder. Tested. Unused so far. |

The artwork is a **penguin in the app's bucket hat**, ported from an SVG Antony
supplied (QuiverAI). It is his drawing, not a redraw — treat the path data as
source material and change it only with a reason.

## The pose API

```ts
interface MascotPose {
  gazeX?, gazeY?        // pupil offset in artwork units; ±1.5 is a clear glance
  eyes?: "open" | "happy" | "half" | "wide"
  mouth?: "closed" | "open"
  tiltDeg?              // whole-character lean, about the feet
  leftFlipperDeg?       // positive = away from the body, on both sides
  rightFlipperDeg?      // (the sign is mirrored internally, so callers ignore side)
}
```

That set covers every state in §13.9's table. Nothing else should need adding.

## Things that will bite you

**Coordinates are literal.** A 0.93 vertical squash used to be a wrapping
`<G scale>`; it is now baked into every number. Do not reintroduce a global
transform — it means the file's numbers stop matching the screen, which
silently invalidated a whole round of pixel measurements (the sampler was
reading the forehead while reporting on the eyes). If proportions need
changing, re-bake.

Consequence: **y values no longer match Antony's source SVG.** Multiply by
0.93 about y = 143 to compare.

**If you ever re-bake:** a path's *first* moveto is absolute even when written
lowercase `m` (SVG spec). Scaling its y as a delta moves every shape — the feet
went from y 136 to 126 instead of 136.5 and ended up behind the body.

**The flippers are carved out of the torso.** In the source, head, body and both
wings are one closed outline, so a flipper cannot be rotated — it is part of the
torso's own contour. `TORSO` is that outline with the two wing excursions
removed; `WING` is the excursion, mirrored for the right side.

Two properties of the wing are load-bearing and easy to break:

- Its **root is a straight chord through the pivot**, so every point stays
  within ~9 units of the hinge and it can never swing clear of the body and
  open a gap at the armpit.
- It draws **behind the torso**, with a **full closed outline**. That pairing is
  what makes the outline stop exactly where it meets the body — the torso covers
  everything inboard of its own edge. Outlining only the outer edge instead left
  a raised flipper unbordered along its bottom; drawing the wing *over* the
  torso put a hard dark arc across the belly.

**Paint order matters.** Current order: feet → wings → torso → forehead/eye
patches → hat → eyes → mouth. The hat must come **before** the eyes; drawn after,
its brim-underside construction strokes paint across the face.

**Some source paths are deliberately not drawn.** All are documented inline:
the `#36506B` sliver at (108, 69) (right wing's highlight, orphaned by the
carve — it floats outside the body), the wing's pale rim highlight, the lower
lobe shading, four hat marks that land on the forehead as scratches, and the
white wedge between the eyes (kept, but filled blue). Don't "restore" them
without rendering the result.

**Verify by rendering.** Every defect in this component was invisible to types,
lint and tests, and obvious in a screenshot. Several were invisible at 190px and
obvious at 430px. When measuring pixels, first confirm the sampler maps
coordinates to the same space you are reasoning in.

## Next phases

**Task 3 — `mascotStateFor()` + animation.** The remaining core work.
- Pure selector in **`src/lib/mascot.ts`** (§13.9 is explicit: not `recommend.ts`
  — this is presentational mapping, not recommendation logic).
- Maps engine signals already computed to §13.9's states: idle, wave, shiver
  (`warmthLevel >= BOTTOMS_COLD_WARMTH_LEVEL`), sun-squint (`HIGH_UV_INDEX`),
  umbrella-huddle (`Recommendation.umbrella` is a real item), wind-blown
  (`windEffect === "amplified"` past `WIND_CHILL_KPH`), warm/fanning (`HOT_C`).
  Reuse those named constants; do not invent thresholds.
- Shiver + wind-blown compose; shiver and warm/fanning are mutually exclusive by
  construction, so no conflict resolution is needed beyond that.
- Animate with `react-native-reanimated` (already a dependency) driving the pose
  numbers. **Respect `AccessibilityInfo.isReduceMotionEnabled()`** by dropping to
  one static pose per state — that path is free, since the art is the same and
  only the numbers stop moving.
- The whole component is decorative: `importantForAccessibility="no"` /
  `accessibilityElementsHidden`. Everything it conveys is already in the gear
  card and leg list as text.
- Unit-test the selector; it is pure and worth pinning.

**Task 4 — the care loop.** Tap reactions, visit memory, a warmth value that
rises and plateaus but **never decays** — see `DECISIONS.md` 2026-08-09
("responsive, not needy"). Needs an additive-only migration for the persisted
state (`docs/03-data-models.md` §3.1). Care modulates expressiveness only;
weather still decides which state shows.

**Task 5 — placement.** Primary above the "Right now" card on Today (current
conditions); smaller secondary on Journey Detail reflecting *that journey's*
`Recommendation`, not now. Ship the `MascotSwatch` picker in the gear add/edit
form via this phase's own additive migration. Delete `MascotPreview.tsx`.

**Garment slots (deferred, was part of task 2).** §13.9's paper-doll layer —
jacket/bottoms/umbrella overlays tinted from `ClothingItem.color`. The swatch
lookup and its neutral fallback exist; the overlay shapes do not. An unset
colour **must** render neutral grey rather than being omitted or guessed —
`color` is a Phase 21 field, so most wardrobes have none.

## Known gaps

Everything above was verified on **web, dark theme**, at 620/430/190/96/64px.
**Light theme and native are unverified.** Check both before shipping.

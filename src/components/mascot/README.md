# Mascot — handoff

Phase 21 (`docs/13-extended-features.md` §13.9, `docs/09-design-system.md` §9.7).
The character is **built and poseable** and the **animation layer is done**;
the care loop and the actual placement are not. Read this before touching
`MascotBase.tsx` — most of it is scar tissue from mistakes that cost several
rounds each.

## What exists

| File | State |
|---|---|
| `MascotBase.tsx` | The character. Pure, declarative — every pose is a number passed in. **Done.** |
| `Mascot.tsx` | The animated component: state → motion, reduce-motion fallback, decorative a11y. **Done.** |
| `states.ts` | What each state looks like and how it moves, as a list of **beats**. Change poses and timings here. Its header explains the two-mechanism split (Reanimated body, keyframed limbs) and why. |
| `../../lib/mascot.ts` | `mascotStateFor()` — the pure selector, tested against the engine's own fixtures. **Done.** |
| `poses.ts` | The reference sheet the *character* was judged on. Not what ships. |
| `MascotPreview.tsx` | **Temporary bench.** Not routed; wired into `TodayScreen` by hand. Delete when Phase 21 ships. |
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
  leftFootLift?         // artwork units off the ground; the torso does not follow
  rightFootLift?        // (4 is a clear tap — the foot is only ~11 units tall)
}
```

This covers every state in §13.9's table plus the idle behaviours. The foot
lifts arrived later than the rest and are the one part of the pose that moves
something *outside* the tilt group — that is deliberate and load-bearing: a
foot tap is only a tap because the torso stays exactly where it is. Anything
that moves the foot and the body together is a hop.

A state is a list of **beats** — a run of frames plus whatever the body does
under them. One beat means that beat on a loop, which is all the weather
states need. Idle has eight, dealt from a shuffled bag (`createBeatBag`): a
weight shift, a tap of each foot, a two-flipper ruffle, and four rests of
different lengths. A full pass is about 17s of which only ~5.3s is movement;
measured over 48s on screen he is standing still 72% of the time.

That ratio is the feature. A character that never stops reads as a mechanism.
So does a fixed sequence — it is a loop with extra steps, and you notice it
come round inside a minute on a screen people leave open, which is why the
order is dealt rather than written.

Each rest **blinks partway through**, and that placement is load-bearing: with
blinks as beats of their own, the bag could deal four rests back to back and
did, producing a measured eleven seconds with nothing moving at all. It read
as a hung view. Splitting every rest around a blink caps the worst case at
about 3.5s.

`Mascot.tsx` drives the lean, the weight shift and the shiver jitter from a
wrapping `Animated.View` rather than through `tiltDeg`, so it can animate them
at 60fps without re-rendering the SVG. The wrapper's `transformOrigin` is
`TILT_ORIGIN` (the feet) — the same point `tiltDeg` uses, exported from
`MascotBase` so the two can't drift — offset by `HALF_STANCE` onto whichever
foot is bearing the weight. See "the character stands on the ground" below.

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

**The flippers cannot reach the face, and the hat eats them past ~90°.** They
are shoulder-mounted and longer than the body is tall, so §13.9's "one hand
shading brow" and "one hand fanning" are not literally achievable. Measured on
screen: ~48° reads as *pointing*, ~88° stands the limb vertical with its tip
tucked behind the brim (as close to the face as it gets), and by 120° the brim
has swallowed everything but a stub. Keep raises at or under 90°. What
distinguishes the raised-flipper states from each other is rate and the rest of
the pose, not position — see `states.ts`.

**The character stands on the ground, so nothing may translate him vertically
or rotate him about the point between his feet.** Both were tried and both
were wrong: a vertical bob lifts both feet together and reads as hovering, and
a sway about `TILT_ORIGIN` drives the far foot through the floor. What ships
is a weight shift — one rock, pivoting over whichever foot the lean puts the
weight on, so the planted foot is pinned and the other one lifts.

The pivot moves by *offsetting the transform*, not by animating
`transformOrigin`: for a pivot `P` and an origin `C`, rotating about `P` is
rotating about `C` plus a translation of `(P−C) − R(P−C)`. That offset is
proportional to `sin(lean)`, so it passes through zero exactly where the
character is upright and the two pivots agree — the pivot can swap sides
without the character jumping. Measured on screen at 215px: the planted foot
moves under 0.1px while the free one rides about 5px.

**Paint order matters.** Current order: feet → wings → torso → forehead/eye
patches → hat → eyes → mouth. The hat must come **before** the eyes; drawn after,
its brim-underside construction strokes paint across the face.

**Some source paths are deliberately not drawn.** All are documented inline:
the `#36506B` sliver at (108, 69) (right wing's highlight, orphaned by the
carve — it floats outside the body), the wing's pale rim highlight, the lower
lobe shading, four hat marks that land on the forehead as scratches, and the
white wedge between the eyes (kept, but filled blue). Don't "restore" them
without rendering the result.

**`accessibilityElementsHidden` / `importantForAccessibility` do nothing on
web.** Measured in the browser: react-native-web emits neither — they are
iOS- and Android-only — so the SVG sat in the accessibility tree unmarked
despite the component carrying both props §13.9 names. `aria-hidden` is the
cross-platform prop that maps to all three, and `Mascot.tsx` sets it. (The same
gap exists on `MetaDivider`, where it costs nothing.)

**Verify by rendering.** Every defect in this component was invisible to types,
lint and tests, and obvious in a screenshot. Several were invisible at 190px and
obvious at 430px. When measuring pixels, first confirm the sampler maps
coordinates to the same space you are reasoning in. For motion, a screenshot is
not enough — sample the DOM over time (the wave, the blink cycle and the
fanning flap were each confirmed by reading `<g transform>` every 60–120ms).

## Next phases

**Task 4 — the care loop.** Tap reactions, visit memory, a warmth value that
rises and plateaus but **never decays** — see `DECISIONS.md` 2026-08-09
("responsive, not needy"). Needs an additive-only migration for the persisted
state (`docs/03-data-models.md` §3.1). Care modulates expressiveness only;
weather still decides which state shows.

**Task 5 — placement.** Primary above the "Right now" card on Today (current
conditions); smaller secondary on Journey Detail reflecting *that journey's*
`Recommendation`, not now. Both feed `mascotStateFor(recommendation)`; pass
something that changes on focus as `greetToken` so the greeting replays.
Ship the `MascotSwatch` picker in the gear add/edit form via this phase's own
additive migration. Delete `MascotPreview.tsx` — and with it `Mascot`'s
`reduceMotionOverride` prop, which exists only for the bench.

**Missing art, in one list.** Three of §13.9's states describe a drawing that
doesn't exist yet, and each currently ships without it: the shiver's **breath
puff**, the fanning state's **sweat drop**, and the huddle's **umbrella**
(which is a garment slot, below). The huddle's raised flipper is positioned to
receive the umbrella when it lands.

**Garment slots (deferred, was part of task 2).** §13.9's paper-doll layer —
jacket/bottoms/umbrella overlays tinted from `ClothingItem.color`. The swatch
lookup and its neutral fallback exist; the overlay shapes do not. An unset
colour **must** render neutral grey rather than being omitted or guessed —
`color` is a Phase 21 field, so most wardrobes have none.

## Known gaps

Verified on **web**, both themes, at 215/150/96/64px: every state's live and
reduce-motion rendering, the greeting's full keyframe sequence, the blink
cycle, and that all 28 mounted instances carry `aria-hidden`.

- **Native is unverified.** The new risk there is `Mascot.tsx`'s wrapper —
  Reanimated shared values plus `transformOrigin` on a `View` style.
- **Reduce motion was verified through `reduceMotionOverride`, not the OS
  setting.** The `AccessibilityInfo` read and its `reduceMotionChanged`
  listener have not been exercised against a real toggle; §13.9's manual test
  plan covers it.
- **The static shiver is weak.** Stripped of its jitter it is just half-lidded
  eyes, and without the breath puff there is nothing else to hold. Acceptable
  because the cold is stated in text on the card, but it is the one
  reduce-motion pose that doesn't carry its state on its own.

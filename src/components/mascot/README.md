# Mascot — handoff

Phase 21 (`docs/13-extended-features.md` §13.9, `docs/09-design-system.md` §9.7).
The character is **built, animated, placed and holding an umbrella**. A jacket
is drawn but **gated off** (below). What's left is the bottoms slot, the
swatch picker that lets anyone choose their colours, and the care loop. Read
this before touching `MascotBase.tsx` — most of it is scar tissue from
mistakes that cost several rounds each.

## What exists

| File | State |
|---|---|
| `MascotBase.tsx` | The character. Pure, declarative — every pose is a number passed in. **Done.** |
| `Mascot.tsx` | The animated component: state → motion, reduce-motion fallback, decorative a11y. Also `mascotFeetOffset()`, for standing him on an edge. **Done.** |
| `states.ts` | What each state looks like and how it moves, as a list of **beats**. Change poses and timings here. Its header explains the two-mechanism split (Reanimated body, keyframed limbs) and why. |
| `../../lib/mascot.ts` | `mascotStateFor(signals)` — the pure selector, tested against the engine's own fixtures. **Done.** |
| `poses.ts` | The reference sheet the *character* was judged on. Nothing renders it; kept for task 4's tap reactions. |
| `garments.ts` | §13.9's paper-doll clothing. The jacket and the umbrella exist; bottoms don't. |
| `garments.test.ts` | The one thing about the umbrella that *can* be asserted: that its generated shape still fits the box. Everything else about it was judged by rendering. |
| `../../theme/mascotSwatches.ts` | `MascotSwatch` → hex, plus `MASCOT_DEFAULT_GARMENT` (orange — see below). Tested, and what tints the jacket. |

## Where he is

| Surface | Size | Fed by |
|---|---|---|
| Today, standing on whichever card you've scrolled to | 96 | `useRightNow`'s recommendation; `MASCOT_IDLE` until one exists |
| Journey Detail, perched on the gear card's top-right | 64 | that journey's live recommendation, or its frozen snapshot's `signals` |

Both stand him on an edge with `-mascotFeetOffset(size)`, which closes the
empty box above and below him. Laid out by the box alone he hovers, which is
the exact look the weight shift exists to avoid.

**The box is not square, and `size` means its width.** `VIEW_BOX_HEADROOM`
adds 48 artwork units of empty space above the character so the umbrella has
somewhere to be — the hat crown already reaches y ≈ 16 in the original 0–150
box, so an open canopy simply does not fit it. Height therefore comes from
`mascotBoxHeight(size)`, and `mascotFeetOffset` and `MASCOT_FEET_ORIGIN` both
measure from the *raised* top.

That headroom is constant rather than added only when the slot is filled, and
that is deliberate: `mascotFeetOffset` is what every placement measures
against, so a box that changed height with the weather would move Today's
reserved clearance each time it rained. The cost is paid in two lines, both
measured and both commented where they live — Today's `forecastPerch` (+28px)
and Journey Detail's `gearSection` (+40px).

**He must be painted over the cards, not between them.** On Today he is
absolutely positioned as the *last* child of a stack containing every card
(`PerchedMascot` + `useMascotPerches`). Laid out in the flow he was an earlier
sibling, so the next card's background painted over his feet and he read as
sunk into the surface rather than standing on it. Being last covers web and
iOS; Android needs the `elevation: 12` on the floating style too, because
elevation decides draw order there and every card carries elevation 6.

On Today he also **hops between perches as you scroll**, landing on the
topmost one with room to hold him. Scroll-driven rather than on a timer: it
can't strand him off screen, needs no clock, and it motivates the movement.

**A perch is declared, never derived.** He is 96pt tall and stands *above* the
line he's on, so he always occupies ~86pt of whatever is up there. Making
every card a perch put him squarely over the hourly forecast strip, because
every card but the first has content pressed against its top edge. Today
declares three, each a place the screen knows is clear:

| # | Where | Align | Covers |
|---|---|---|---|
| 0 | above the "Right now" card | centre | nothing (reserved clearance) |
| 1 | the hourly card's top corner | right | nothing |
| 2 | the first journey card's top | right | nothing |

Measured, not eyeballed: at `SPACING.sm` of clearance perch 1's hat brim
clipped the last 14px of the "Right now" card's bottom gear chip, so
`forecastPerch` is sized to clear it. Re-check that number if the chip row's
wrapping changes.

`PerchAlign` exists for those last two: the space above each is a short row
(an "as of" stamp, a section label) whose far end is empty, so he belongs at
that end rather than centred over the content.

**Spacing between perches is a feature, not a leftover.** With only two, the
gap was 619px against an 812px viewport — a hop's far end was off screen, so
he appeared to leap away rather than across. Three brings it to ~315 and
~340px, both ends visible. If you add a screen, aim for hops well inside a
viewport height.

Two things deliberately *not* perches: every journey card (his body would land
on the departure time, which sits top-right exactly where he stands) and the
checklist row. Two places in the layout pay for him: `perchClearance` above
the first card, and `forecastPerch`'s margin on the forecast card.

The hop is built like a cartoon jump — crouch, launch, hold, absorb — because
the arc alone reads as being carried rather than jumping. The crouch is a
`scaleY` about the same feet origin the weight shift pivots on, so the torso
drops over stationary feet instead of the whole character shrinking; the
flippers go up on the crouch and come down on landing, which is why the
airborne timer is deliberately shorter than the squash it overlaps.

**The state comes from `Recommendation.signals`, not from the recommendation.**
That indirection is load-bearing: a `RecommendationSnapshot` stores the same
signals block, so a frozen journey keeps the companion it was frozen with. It
is not an edge case — `freezeIfDue` fires on Journey Detail load, so a
"leave now" journey is frozen the instant you open it, and without this the
mascot would be missing from the most common Journey Detail view there is.
Snapshots written before Phase 21 have no signals and render no mascot.

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

The umbrella made that limit concrete, and rendering pinned it tighter than
the paragraph above: the hand reaches furthest across the body at 105°, but at
105° the blade is entirely behind the hat brim and the umbrella floats with
nothing holding it. **88° is the last angle at which the hand still reads**,
which is why the umbrella is built around a hand at (17.5, 48) rather than
somewhere more convenient.

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

**`onLayout` does not fire when a view merely moves.** On web
react-native-web implements it with a `ResizeObserver`, which reports size
changes only — so a card that shifts down because the one above it grew never
re-reports its position. Measured: the forecast card grows when its data
lands, and the checklist below it kept a perch 445px up the page, parking the
mascot in empty space. `useMascotPerches` therefore treats `onLayout` as a
*signal to re-measure* and reads the real position with `measureLayout`.
Anything else in this app that positions against another view's layout has
the same trap waiting.

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

**Task 5 — placement. Done**, except for one piece deliberately held back:
§13.9 has the `MascotSwatch` picker shipping in the gear add/edit form this
phase, and it hasn't. The picker's own copy is "this only affects how your
companion looks" — which would be false until the garment overlays below
exist, since nothing renders `color`. It is a form control, a migration and a
promise the app can't keep yet; it belongs with the overlays, in one change.

The bench (`MascotPreview.tsx`) and `Mascot`'s `reduceMotionOverride` prop
went with this task, as planned. If you need a bench again, note that the
override was the only way to *see* the reduce-motion poses without changing
an OS setting.

**Missing art, in one list.** Two of §13.9's states describe a drawing that
doesn't exist yet, and each currently ships without it: the shiver's **breath
puff** and the fanning state's **sweat drop**.

**Garment slots (deferred, was part of task 2).** §13.9's paper-doll layer —
jacket/bottoms/umbrella overlays tinted from `ClothingItem.color`. The swatch
lookup and its neutral fallback exist; the overlay shapes do not. An unset
colour **must** render neutral grey rather than being omitted or guessed —
`color` is a Phase 21 field, so most wardrobes have none.

## Known gaps

Verified on **web**, both themes, at 430/215/150/96/64px: every state's live
and reduce-motion rendering, the greeting's full keyframe sequence, the blink
cycle, and that mounted instances carry `aria-hidden`. Both placements were
measured in the real app against real Auckland weather — feet on the card
edge to within half a pixel, nothing clipped by an ancestor, no overlap with
the section label or the card's own rows, no horizontal page overflow. With
the umbrella, both clearances were re-measured the same way: the canopy clears
Today's bottom gear chip by 2.2px and Journey Detail's "Follow this journey"
button by 1.8px.

- **Native is unverified.** The new risk there is `Mascot.tsx`'s wrapper —
  Reanimated shared values plus `transformOrigin` on a `View` style.
- **Reduce motion has not been exercised against a real OS toggle.** The
  static poses were verified while the bench still had its override prop; the
  `AccessibilityInfo` read and its `reduceMotionChanged` listener have not
  been. §13.9's manual test plan covers it.
- **Only idle and the huddle have been seen in situ.** Auckland was 11°C and
  dry, so the huddle was forced with a temporary override in `mascot.ts` and
  measured on both screens. The other four were verified on the bench before
  it was deleted, but not in the real layout — the leaning ones (wind-blown at
  7°, sun-squint at 5°) are worth a second look if you catch that weather.
- **The static shiver is weak.** Stripped of its jitter it is just half-lidded
  eyes, and without the breath puff there is nothing else to hold. Acceptable
  because the cold is stated in text on the card, but it is the one
  reduce-motion pose that doesn't carry its state on its own.

## The paper-doll layer (§13.9)

> **The jacket is switched off.** `JACKET_OVERLAY_ENABLED` in `../../lib/mascot.ts`
> is `false`, so `mascotGarmentFills` never fills the slot and he ships bare
> under the umbrella. The art, the render path and all the reasoning below are
> untouched and still correct — the shape just isn't good enough yet, and an
> orange coat under an orange umbrella read as one blob rather than two
> garments. Turning it back on is one line and needs no engine change and no
> snapshot migration, because `signals.garments.jacket` is still populated.
> `mascot.test.ts` pins the gate so it can't be forgotten.

`garments.ts` holds the clothing. Only the **fill** is tinted, from the
recommended item's `MascotSwatch`; the outline, seams and shading are fixed,
and the two shading layers are plain white/black at low alpha rather than
lighter/darker variants of the tint — so any swatch keeps its modelling and a
pale one can't dissolve into the belly.

The data path is `recommendGear` → `signals.garments` (swatch *names*, stored,
so a frozen snapshot keeps its outfit) → `mascotGarmentFills` (hex) →
`MascotBase`. Three states per slot and the difference is load-bearing:
**absent** means nothing was recommended, **null** means something was but has
no colour and renders neutral grey, a value renders that swatch. §13.9 requires
the neutral case — `color` is a Phase 21 field, so almost every existing
wardrobe hits it.

**The jacket is one path, not several.** Hood and body share a single outer
contour, with the face opening and V-neck cut out as one `evenodd` hole. Three
constructions failed before this, all for the same reason — the garment is one
piece of fabric, and every attempt to build it from two put a line where the
reference has none:

1. hood folded into the body as a rising collar → "a shirt that goes up to his
   ears"; a collar that high has no reason to exist;
2. separate hood *under* the body → invisible, since hood and shoulders occupy
   the same part of the silhouette and only the sliver past the flank showed;
3. separate hood *over* the body → visible, but its outline cut across the
   shoulders. Two garments, not one.

So the hood is simply where the outer contour bulges past the head — about 12
units proud at the temples, back on the torso's line by the chest. Carried
lower it sits exactly where the flippers hang and swallows both sleeves, which
is the trap to avoid if you retune it.

**The sleeve is outlined on its outer edge and cuff only, and draws over the
coat.** Stroked all the way round it put a navy line across each shoulder; the
reference has none there — torso and sleeve are one colour with one silhouette
and only the outside and the cuff are edges. Drawing the sleeve *after* the
coat is what lets its fill cover the coat's flank outline exactly where the
arm is in front of the body.

The outline also starts at (36.5, 77.9), not at the shoulder root: that is the
outer edge split at t = 0.5, where the arm crosses the coat's flank at rest,
so the two outlines meet. Run from the root, its first half lies inside the
coat and draws a stray diagonal across the shoulder. The *fill* still runs to
the root, so a raised flipper never detaches from the body.

Two more things rendering decided:


- **The sleeve draws over the torso, in its own pass.** The obvious placement,
  inside the wing group beside the flipper, renders *nothing*: the wings draw
  behind the torso and the sleeve covers exactly the part of the limb the
  torso hides. It gets a second rotating group after the body, and the jacket
  body drawn after it buries the root — the same trick the torso plays on the
  flipper. `Limb` exists to share the rotation between the two passes.
- **The sleeve is wider than the flipper.** Traced exactly onto the wing's own
  curves it came out the same width as the blade, and the jacket body then
  covered all but about two units of it. Offsetting it outward by ~2 units is
  both what a real coat does and what makes it visible.

The opening is a keyhole: wide around the face, narrowing to a V at mid-chest,
so the white of his face runs down into the white of his chest. That is the
reference's collar and it suits him — a penguin this round has no neck for a
high collar to sit on, and a flat horizontal neckline (tried) reads as a bib.

Slot priority for the torso follows §13.9: jacket if one was picked, else
midlayer, else base. A *fallback* pick still dresses him — the engine saying
"wear a jacket" without naming one is still saying to wear a jacket.

**The default garment colour is orange, not §13.9's "neutral grey".** Antony's
call and the better one: `color` is a Phase 21 field, so nearly every garment
takes the fallback, which makes it the mascot's usual look rather than a rare
placeholder. Grey read as broken. The accepted cost is that an untagged item
and one tagged `orange` are indistinguishable on the mascot;
`mascotSwatches.test.ts` pins this so nobody restores the grey without reading
why it went.

### The umbrella

The only garment **generated from constants rather than drawn**: a tilt, a
radius, a dome height, a shaft length, and a `u(a, b)` that converts the
umbrella's own frame into artwork coordinates. That is a deliberate break with
the rest of the file, for one reason — the tilt *is* the design, every constant
wants tuning against a render, and thirty hand-rotated coordinates cannot be
tuned. The strings it emits are still artwork coordinates, so anything measured
on screen still compares directly; `UMBRELLA_POINTS` exports the landmarks.

**Its whole shape is dictated by where the hand can be.** The flipper is
straight and shoulder-mounted, so the hand is at (17.5, 48) and nowhere else
(above). Reaching from there to over the hat forces a tilt, and the tilt is
then squeezed from both sides: too little and the canopy sits beside his head
rather than over it, too much and the near rim lands on the brim while the far
rim leaves the box. 37° is where those meet. Four constructions were rendered
before it — 28° read as *holding an umbrella aloft*, not sheltering under one.

Two consequences that look like bugs and aren't:

- **It doesn't cover him.** The rim comes down over his head and right side
  and stops around x 99; the right of the brim stays out in the rain. No canopy
  wide enough to shelter him from a hand that far off-centre fits the box at
  any tilt, and a tilted umbrella with someone hunched under the low side is
  what huddling looks like anyway. `umbrellaHuddle` leans −4°, *into* the
  covered side; leaning the other way put his head back out from under it.
- **The left flipper is pinned whenever the slot is filled**, in `MascotBase`,
  overriding the pose. The overlay is drawn in artwork coordinates rather than
  in the limb's frame, so any beat, greeting or hop that moved that flipper
  would slide the hand out of the handle. Left rather than right so §13.9's
  on-focus wave — which is the right flipper, and plays over whatever state is
  showing — doesn't swing the umbrella around on every arrival. Verified by
  sampling the DOM through 22s of idle beats: the right flipper ruffles, the
  umbrella arm never moves.

The shaft draws **under** the canopy, so the canopy's fill hides the length
running up inside the dome and only the ferrule above and the stick below the
rim are seen. Three rim scallops, not five: at 64pt the whole umbrella is about
40px across and five scallops plus their seams read as texture.

**Not built yet: bottoms.**

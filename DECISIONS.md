# DECISIONS.md — spec deviations & judgment calls

Append-only. One entry per deliberate deviation from, or judgment call
within, the docs in `docs/`. Don't edit or delete past entries — if a
decision is later reversed, add a new entry that supersedes it and says so.

**Don't read this whole file every session.** Skim the index below (cheap),
then grep for the date/title/section tag of any line that looks relevant to
your current task and jump straight to that entry — see AGENTS.md §0 for
the exact workflow. When you append a new entry, also append one matching
line to the index, in the same position (index is in date order, oldest
first).

## Template for new entries

Entries above this point predate the template and stay as-is (append-only —
don't rewrite them). Every new entry from here on must use this compact
form, three one-to-two-sentence fields, no sub-bullets, targeting ~10-15
lines total including the heading and separator:

```
## YYYY-MM-DD — Short title (§X.X)

**What**: one to two sentences — the change, stated plainly.

**Why**: one to two sentences — what in the docs this deviates from or
what judgment call it required.

**Resolution**: one to two sentences — what was decided, how narrowly it's
scoped, and what a future contributor should do instead of extending it
informally.

---
```

Skip restating context the title or section already covers. If a decision
is later reversed, add a new entry that says so and references the old
one by date — don't edit the old entry.

## Index

- 2026-07-19 — Advanced warmth threshold overrides (§3.6, §9.1.1)
- 2026-07-19 — `substitutesForMidlayer` scoped to jacket-absorbs-midlayer only (§3.6, §7.12)
- 2026-07-20 — Hot-weather guidance kept as a note, not an item-matching feature (§7.15)
- 2026-07-20 — Severe-weather advisory is a single suggestion sentence, not a safety feature (§7.14)
- 2026-07-20 — Mascot companion built to Tier 1+2 only; photo-derived garment generation deferred (§13.9)
- 2026-07-20 — Locations CRUD uses text/number fields, not map pin-drop or Places search (§4)
- 2026-07-20 — Onboarding gate uses an explicit completed flag, not the "no Inventory/no SavedLocation" check (§4.1)
- 2026-07-20 — Plan screen's date/time picker is plain text fields (§4)
- 2026-07-20 — Bus/train journeys with waypoints skip indoor dwell legs (§5.5)
- 2026-07-21 — Phase 5's recommendGear() omits the annotation-gated wind/sun deltas and puddle risk (§7.8)
- 2026-07-21 — Annotation UI simplifications: no map repositioning, no swipe-to-delete, no row thumbnails (§4.5)
- 2026-07-21 — AT GTFS Realtime lookup keys are best-effort, not real AT GTFS ids (§5.6, Phase 7)
- 2026-07-21 — Phase 8 leave-by notifications: freeze/recordWear via fallback + foreground listener, not background task (§7.3, §7.4, §7.16)
- 2026-07-21 — Fixed web bundling (`metro.config.js`); `withTimeout()` is a defense-in-depth backstop, not the primary fix [build/infra]
- 2026-07-21 — Phase 9 History: JourneyDetailScreen prefers `recommendationSnapshot` over live recompute whenever one exists (§9.4)
- 2026-07-21 — Phase 10 Personalization: forecast drift re-check runs on foreground only, not OS background task; dev-menu triggers not built (§5.2, §12.2)
- 2026-07-21 — Phase 11 Polish: dark/light theme retrofit built now; gear-card fallback non-interactive; rain-intensity gauge not built (§9.1, §9.5)
- 2026-07-21 — §9.5 rain-intensity gauge built as Plan-screen-only hourly strip, not Plan+Today
- 2026-07-21 — Gear-card fallback text wired to "tap to add" (§9.6), scoped to the live recommendation only
- 2026-07-21 — Phase 12: SQLite left unencrypted at rest, disclosed in privacy policy instead of SQLCipher (§10)
- 2026-07-21 — Phase 12: crash reporting is a real conditional gate with a local no-op provider, not live Sentry (§10)
- 2026-07-21 — Phase 12: bundle identifier placeholder; `PrivacyInfo.xcprivacy` best-effort draft; store steps left as manual checklist (§10)
- 2026-07-21 — "Paua Pop" visual identity redesign: full palette overhaul, approved via multi-round design review [design, §9]
- 2026-07-21 — §9.0 "no drop shadows" rule reversed to shadow-based card elevation, per explicit request
- 2026-07-21 — Weather-reactive Today-tab tint scoped to the Today tab only, not Journey Detail [§9]
- 2026-07-21 — App icon traced from a user-supplied SVG rather than drawn from scratch [design]
- 2026-07-21 — Onboarding collapsed to a single "where are you?" step; rest moved to postponable setup checklist (§4.1)
- 2026-07-21 — AddressAutocomplete error visibility + race guard; map pin-drop closes the Locations CRUD deferral (§5.1)
- 2026-07-21 — Closed three gaps: Plan-screen free-text search, recurring-journey pause, §12.2 debug menu
- 2026-07-22 — Real web map picker (react-leaflet + OpenStreetMap); real navigation iconography (§9.2)
- 2026-07-22 — Gear icon redrawn from a traced reference SVG; screen-edge whitespace 16px → 20px [design]
- 2026-07-22 — Corrected whitespace pass: header buttons need text; fixed button-padding/tab-bar-label bugs [design]
- 2026-07-22 — Header buttons back to icons, and Settings gets an actual cog [design]
- 2026-07-22 — Settings cog traced from a second reference SVG; bucket-hat mark shown in-app, not just OS icon [design]
- 2026-07-22 — "Repeats" scoped to Leave-by mode only, not Leave-now/Arrive-by (§4)
- 2026-07-22 — No drive-mode "short dash to the car" umbrella workaround (yet) (§7)
- 2026-07-22 — Bottoms recommendation expanded from cold/wet-only to always-on (§7)
- 2026-07-22 — Web `JourneyMap` closes the last native-only-map gap (§9.2)
- 2026-07-22 — Location-picker pin seeded from the user's real location, not always Auckland (§4)
- 2026-07-22 — Live place-name label while dragging the pin, debounced against Geocoding cost (§5)
- 2026-07-22 — Journey Detail's map draws the real route, not a straight line (§9.2)
- 2026-07-22 — Fixed: new-location map picker opened on "Null Island," not Auckland [bug fix]
- 2026-07-22 — Web maps switched to CARTO Voyager/Dark Matter basemaps, theme-matched (§9)
- 2026-07-23 — Verified against live API keys: transit rejects waypoints (latent 400 bug), AT endpoint confirmed [bug fix, §2]
- 2026-07-23 — Hot-weather gear now resolves a real owned item, closing the 2026-07-20 deferral (§7.15)
- 2026-07-23 — UI/UX polish pass 2: typography tokens not retrofitted repo-wide; icons kept on emoji/Tabler [design]
- 2026-07-23 — Fixed: fresh git worktree can't run `expo start --web` (no `.env`/`node_modules`); COOP/COEP headers for `expo-sqlite` web worker [build/infra]
- 2026-07-23 — User-reported fixes batch: Today refresh throttle, suburb label, 12h/24h setting, Plan screen fixes [bug fix]
- 2026-07-23 — Follow-up polish on the fixes batch: hourly outlook cards, rain fill, return-section nesting [design]
- 2026-07-23 — Clarified carry-preference control; containerized forms; fixed back-button margin [design]
- 2026-07-26 — Plan screen: containerized sections, route timeline, fixed Add-a-stop bug, night icon, bookmark toggle [design]
- 2026-07-27 — Route-rail markers centred on the field box; origin pin, destination flag (§9.4) [design]
- 2026-07-27 — Hourly outlook rebuilt per-location with route ETAs; icons from raw WMO code (§9.5) [design]
- 2026-07-27 — Plan screen reordered (Mode before When); More modes removed; Preferences split; formal is now a labelled segmented control (§4.3, §9.6) [design]
- 2026-07-27 — Today gains an hourly forecast card + 48h/7-day panel, reversing the 2026-07-21 Plan-only call; Right now keeps stale data through refreshes (§4.2, §9.5) [design]
- 2026-07-27 — HorizontalStrip: forecast rows were unscrollable by mouse on web; side panels containerized (§9.5, §9.6) [bug fix]
- 2026-07-27 — Day labels inside the scrolling hourly rows; §9.1's severity→condition colour lookup finally built; header buttons given a target (§9.1, §9.5) [design]
- 2026-07-28 — Gear glyphs for gloves/hat/midlayer; generic gear copy is bare noun phrases and warmth-aware (§7, §9.3.1) [design]
- 2026-07-28 — Phase 19 sync bookkeeping: SQLite triggers, plus tombstones the spec never mentions (§13.7, §3.1)
- 2026-07-28 — Cloud sync excludes `app_settings` and gear photos (§13.7, §3.3)
- 2026-07-28 — Sync pull watermarks are server-clock, LWW is device-clock (§13.7)
- 2026-07-28 — Phase 19 built engine-first; backend provider deliberately unchosen (§13.7)
- 2026-07-28 — Phase 19 backend is Cloudflare Workers + D1 + Better Auth, not a BaaS (§13.7) [supersedes the line above]
- 2026-07-28 — Remote schema stores rows as opaque JSON, not mirrored tables (§13.7, §3.1)
- 2026-07-28 — Sync hardened against future-dated timestamps and unwritable rows (§13.7)
- 2026-07-28 — Gear photos sync as R2 objects, native-only, and never as row columns (§3.3, §13.7) [supersedes the photo exclusion above]
- 2026-07-28 — Web renders gear photos from R2 via blob URLs, not signed URLs (§3.3, §13.7)
- 2026-07-28 — Google Maps Android key moved into a dynamic app.config.js [bug fix, §9.2]
- 2026-07-29 — GPS lookups are time-bounded and prefer the last known fix [bug fix, §4, §5]
- 2026-07-29 — Dependency ceilings: jest, eslint and typescript majors are blocked by Expo's own presets [maintenance]
- 2026-07-29 — Removed unused react-native-dotenv; babel uses worklets/plugin; audit clean [maintenance]
- 2026-07-29 — wrangler.toml top-level keys must precede every [table] header [bug fix]
- 2026-07-30 — Migrated off expo-file-system/legacy; File/Directory must never be constructed at module scope [maintenance, §3.3]
- 2026-07-30 — Journey Mode: live follow-along is navigation UX, not the live tracking §13.8 rules out (Phase 22)
- 2026-07-30 — Journey Mode tracks foreground-only, with keep-awake and a resume re-snap (Phase 22)
- 2026-07-30 — Local-knowledge alerts default to a pre-departure briefing, not live nudges (§4.5, Phase 22)
- 2026-07-30 — SafeAreaView now comes from react-native-safe-area-context in all screens [bug fix, §9]
- 2026-07-30 — Web app is served by the sync Worker itself; COOP/COEP via public/_headers [§12, §13.7]
- 2026-07-30 — Renamed the project to bucket-hat; new D1 and R2, old data abandoned [maintenance]
- 2026-07-31 — Display name and all user-facing copy rebranded to Bucket Hat [maintenance]
- 2026-07-31 — Icon padding fixed for Android's safe zone; favicon made transparent [bug fix, §10.4]
- 2026-08-02 — Onboarding gains a welcome screen; the auth form moves out of Settings (§4.1, §13.7) [design]
- 2026-08-02 — Password reset built, reversing §13.7's "no reset flow" call (§13.7)
- 2026-08-03 — Shared button/layout styles; Journey Detail restructured (§9.2, §9.3, §9.6) [design]
- 2026-08-03 — Journey map origin marker carries the travel mode; planned journeys show route steps (§9.3) [design]
- 2026-08-03 — Weather sky background, day/night hourly blocks, two-list gear card (§9.1, §9.3, §9.5) [design]
- 2026-08-03 — Gear notes rewritten short; apparent-temp note states both figures (§7, §9.0.1) [design]
- 2026-08-03 — Saved journeys: a managed list, and Plan opens by asking (§4.3, §3.1)
- 2026-08-03 — Hourly cells: unique clip ids, both blocks tinted, blank line kept (§9.5) [bug fix, design]
- 2026-08-03 — Hourly cells commit to a light or dark surface, with measured icon colours (§9.5, §9.1) [design]
- 2026-08-04 — One hourly cell, one fact: droplet, millimetres and glyph agree (§6, §9.5) [bug fix]
- 2026-08-04 — Opening a saved location leads with its forecast; the edit form moves behind a disclosure (§4, §9.3.1) [design]
- 2026-08-04 — Per-location gear picks and notes are displayed, not fed to recommendGear() (§3.4, §7)
- 2026-08-05 — `ScreenSurface` puts the sky background on every screen; the weather tint stays Today's (§9.1, §9.2) [design]
- 2026-08-05 — Weather mood goes app-wide via `useTheme()`, from a published reading rather than per-screen fetches (§9.1.3) [supersedes the 2026-07-21 Today-only scoping]
- 2026-08-05 — `ScreenSurface` derives its safe-area edges from the navigation chrome, correcting the 2026-07-30 call (§9.2) [bug fix]
- 2026-08-05 — Displayed temperatures are the air temperature; "feels like" is stated, never implied (§6.2, §9.3) [design]
- 2026-08-05 — One `SidePanel` shell: slides from the right, widens with the viewport (§9.3, §9.5) [bug fix, design]
- 2026-08-05 — "None available" is a per-category fact, never inferred from the wardrobe being non-empty (§7) [bug fix]
- 2026-08-05 — Tab back gesture walks tab history; recommended picks open a read-only gear detail dialog (§4, §9.3) [bug fix, design]
- 2026-08-06 — A saved location repaints the whole app in its mood, and mood changes cross over ~400ms (§9.1.3) [supersedes the 2026-08-05 "a pinned reading never repaints the app"]
- 2026-08-06 — Locations and Gear are tab-nested stacks; their sub-views are real routes, not `useState` modes (§4, §9.2) [design]
- 2026-08-07 — Manual lat/lng fields removed; the web map wraps Leaflet's unwrapped longitude (§4, §2) [design, bug fix]
- 2026-08-07 — Back chip hugs the edge on a phone; Today's setup prompts collapse behind a disclosure (§9.2, §4.1) [design]
- 2026-08-07 — Condition pucks thinned by ground distance; planned directions condensed and collapsed (§9.3) [design]
- 2026-08-07 — Location and saved-journey labels are optional, defaulted at save time (§3.1, §4.3)
- 2026-08-07 — One `BottomSheet`, lifted by the keyboard's own reported height (§9.3) [bug fix, design]
- 2026-08-07 — Transit board/alight points are route data, drawn at every zoom (§9.3, §2)
- 2026-08-07 — Full-screen map renders a second JourneyMap rather than reparenting the embedded one (§9.3) [design]
- 2026-08-07 — Durations read as hours and minutes app-wide (§9.0.1) [design]
- 2026-08-07 — Condition pucks: suburb-scale spacing, offset off the route, never on a stop (§9.3) [design, supersedes the 700m spacing set earlier today]
- 2026-08-07 — Transit stop markers carry their vehicle glyph (§9.3) [design]
- 2026-08-07 — One `JourneyDirections` list per journey, leg-then-turn, replacing the per-leg disclosures (§9.3) [design, supersedes the per-leg StepList disclosure set earlier today]
- 2026-08-07 — Full-screen map has a planned mode and a recentre control that starts following (§9.3) [design]
- 2026-08-07 — Web location picker is an inline combobox, not a modal; nothing user-visible depends on RNW blur (§4.3, §9.3) [design, bug fix]
- 2026-08-09 — Consecutive transit walk steps merge into one named leg; polyline encoder added (§5.6, §2) [bug fix]
- 2026-08-09 — Rail lines use their full name, bus routes their number; leg fragments lose their article (§9.0.1) [bug fix]
- 2026-08-09 — Leg list rebuilt as a connected timeline with clock times (§9.3) [design]
- 2026-08-09 — Today's journey card summarises instead of listing every leg (§9.4) [design]
- 2026-08-09 — Map markers settle only after the map is ready; hint chip dodges each platform's own furniture (§9.2) [bug fix]
- 2026-08-09 — A journey opening with an unsittable wait defers its departure to the first service (§5.6) [design]
- 2026-08-09 — Mascot companion is responsive, not needy: no decay, no neglect state (§13.9) [design]
- 2026-08-09 — The visual refresh lands screen by screen, Journey Detail first (§9) [design]
- 2026-08-09 — Numbers are tabular; the type scale gains a display step and an eyebrow (§9.2) [design]
- 2026-08-09 — `tonal` is the accent's second weight; its label is derived, not the accent (§9.1, §9.6) [design, a11y]
- 2026-08-09 — Tab bar items sit on the content measure, not the window's (§9.2) [design, bug fix]
- 2026-08-09 — Disclosures use a real chevron; empty states lead with a primary action (§9.0.1, §9.2) [design]
- 2026-08-09 — The origin marker carries the departure mode, not the journey's dominant one (§9.3) [design, bug fix]
- 2026-08-09 — App-authored gear labels are title-cased; the user's own names are not (§9.0.1) [design]
- 2026-08-09 — Facts are separated by space, not by a dot (§9.2, §9.0.1) [design]
- 2026-08-09 — Today's journey card badges a climate-controlled leg (§9.4) [design]
- 2026-08-09 — The tab indicator is a proportion of its slot, with no maximum width (§9.2) [bug fix]
- 2026-08-09 — A hairline rule separates peer facts (§9.2) [design, supersedes today's "separated by space, not by a dot"]
- 2026-08-09 — The tab indicator spans its row; `top: 6` was double-counting the bar's padding (§9.2) [bug fix]
- 2026-08-09 — The day boundary is drawn through the hourly band, not as a gap in it (§9.5) [design]
- 2026-08-09 — Today's "Right now" card leads with the temperature, not its own title (§9.3.1) [design]
- 2026-08-09 — A diverging feels-like or notable wind lights up as a tonal fact chip (§9.3.1, §9.6) [design]
- 2026-08-09 — One tonal vocabulary for "out of the ordinary"; the UV and wash badges join it (§9.1, §9.6) [design]
- 2026-08-10 — The mascot is a kororā in the app's own bucket hat; art constraints drove the species (§13.9, §9.7) [design]
- 2026-08-12 — The mascot is Antony's supplied artwork with the wings carved out of the torso; a handoff README sits beside it (§13.9) [design, supersedes the 2026-08-10 hand-drawn kororā]
- 2026-08-12 — The engine reports its own conclusions as `Recommendation.signals` (§13.9, §7) [design]
- 2026-08-12 — Mascot motion splits across Reanimated and keyframes; the flippers can't reach the face (§13.9, §9.7) [design]
- 2026-08-12 — The mascot shifts his weight foot to foot; he never bobs (§13.9, §9.7) [design, supersedes the bob/sway in today's motion-split entry]
- 2026-08-12 — Idle is a bag of beats with rests in it, not a loop (§13.9, §9.7) [design]
- 2026-08-12 — A frozen snapshot keeps its mascot signals (§13.9, §3, §7.3) [design, bug fix]
- 2026-08-12 — The mascot stands on the card he belongs to; the swatch picker waits for the overlays (§9.7) [design]
- 2026-08-12 — The mascot floats over Today's cards and hops between them (§9.7) [design, bug fix]
- 2026-08-12 — The mascot's sleeves are their own draw pass, over the torso (§13.9) [design]
- 2026-08-12 — The mascot's default garment colour is orange, not neutral grey (§13.9) [design, supersedes §13.9's stated grey placeholder]
- 2026-08-12 — The mascot's hood draws over its own shoulders (§13.9) [design]

---

## 2026-07-19 — Advanced warmth threshold overrides (Section 3.6, 9.1.1)

**What**: added an opt-in "Advanced" Settings section exposing
`FREEZING_C` / `COOL_UPPER_C` / `WARM_OUTDOOR_C` (Section 7) as directly
editable numbers (`AdvancedWarmthThresholds`, Section 3.6), collapsed by
default.

**Why this needed a decision**: Section 7.5 explicitly rejected exposing
these thresholds directly, on the stated reasoning that "nobody will tune
correctly" — the feedback-driven calibration loop was chosen instead as
the only mechanism for personalizing warmth. This is a direct reversal of
that stated position, not an extension of it.

**Resolution**: kept the feedback loop as the default and primary path for
the vast majority of users — nothing about Section 7.5's calibration
system changed. The override is narrow, off/collapsed by default, requires
an explicit tap to expand, and ships with in-UI copy that actively points
back at the calibration loop ("Most people get better results from the
check-ins above"). Treated as a small, explicitly-scoped escape hatch for
power users who want it, not a replacement for the learned-offset approach.

---

## 2026-07-19 — `substitutesForMidlayer` scoped to jacket-absorbs-midlayer only (Section 3.6, 7.12)

**What**: added a single boolean field on `ClothingItem` letting one jacket
stand in for both itself and a midlayer, rather than building a general
mechanism for any item to substitute for any layer slot.

**Why this needed a decision**: the motivating case (a rain shell with a
built-in thin puffer lining) generalizes fairly naturally to "any item
could substitute for any other layer type" — e.g. a heavy midlayer that's
warm enough to skip a base layer, or a pair of trousers that's also
technically a base layer. That's a materially larger change: a general
substitution graph across all four `ClothingType`s, conflict rules for
when two substitutions overlap, and UI for expressing arbitrary
substitution relationships rather than one fixed toggle.

**Resolution**: scoped narrowly to the single case that was actually
requested and is genuinely common (a jacket doing double duty as its own
midlayer). Explicitly flagged in Section 7.12 as the same category of
scope decision as the multi-user (Section 2.2) and cloud-sync (Section
13.7) exclusions — a future contributor who wants general substitution
should give it its own fully-specced pass rather than extending this
boolean informally.

---

## 2026-07-20 — Hot-weather guidance kept as a note, not an item-matching feature (Section 7.15)

**What**: added a single note ("something breathable and light-colored
will feel better") when `apparentTempC >= HOT_C`, with no corresponding
`breathable` attribute on `ClothingItem` and no attempt to resolve a
specific item the way jackets/umbrellas/bottoms are resolved.

**Why this needed a decision**: every other piece of guidance in this
engine resolves to an actual owned item — that's the app's whole pitch
("recommends your real wardrobe, not generic advice"). A bare text note
with no matching item is a real inconsistency with that pitch, not a
neutral choice.

**Resolution**: accepted the inconsistency deliberately rather than
half-building a `breathable` tag/attribute system under time pressure. The
engine is otherwise entirely cold-direction (every threshold, every
constant, every piece of item-matching logic is about adding warmth), and
retrofitting a properly-considered hot-weather item-matching path — tag
taxonomy, `pickLayer()` changes, UI for tagging existing base-layer items —
deserves its own scoped pass rather than a rushed bolt-on here. Flagged
directly in Section 7.15's prose as a known gap and a natural next step,
not silently left implicit.

---

## 2026-07-20 — Severe-weather advisory is a single suggestion sentence, not a safety feature (Section 7.14)

**What**: added `Recommendation.severeWeatherAdvisory`, a one-sentence
suggestion to reconsider walking/cycling when a leg crosses
`SEVERE_WEATHER_SEVERITY` or `SEVERE_GUST_KPH`.

**Why this needed a decision**: it would be easy for this feature to grow
scope-creep toward something that reads as a genuine safety system — live
monitoring, push alerts as conditions change mid-journey, blocking the
"Plan journey" button, or integrating actual weather-warning feeds. None
of that was asked for, and this app has no business implying a level of
protective monitoring it doesn't actually do.

**Resolution**: deliberately kept to the same shape as every other note
in this engine — one sentence, computed once at planning/recompute time,
non-blocking, no persistence or dismissal state, no re-notification
mid-journey beyond the existing forecast-drift recompute (Section 5.2)
already re-running this same check. Explicitly tied in Section 7.14's
prose to the same stance Section 13.8 (hike mode) already states plainly:
this app recommends clothing from the user's own inventory, it is not a
safety app, and this advisory doesn't cross that line just because it
touches the word "severe."

---

## 2026-07-20 — Mascot companion built to Tier 1+2 only; photo-derived garment generation deferred (Section 13.9)

**What**: specced a mascot companion with weather-matched animations
(Section 13.9's state table) and swatch-based color tinting of its
clothing overlays (`ClothingItem.color`/`MascotSwatch`, Section 3) —
Phase 21. A third idea was considered and explicitly not specced: having
the mascot wear a lookalike rendering of the user's actual photographed
garment, either by segmenting/overlaying the real photo or by generating a
stylized illustration from it.

**Why this needed a decision**: the three ideas were proposed together as
one feature request, and it would have been easy to either half-build the
third tier alongside the first two, or silently drop it without saying so.
Both are worse than deciding explicitly.

**Resolution**: built Tiers 1 (animation) and 2 (swatch-color tinting)
fully — both are cheap, fully local/offline, and need no new runtime
dependency beyond two well-established RN libraries. Tier 3 was deferred,
for concrete reasons rather than "sounds hard": photo-segmentation-and-
overlay rarely produces a garment that convincingly wraps a 2D character's
pose without significant per-item illustration work, and AI-generated
restyling requires a per-item network call to an image-generation
service — cost, latency, and a hard network dependency that cuts directly
against this app's local-first design (Section 5.1, 5.8) for a purely
cosmetic feature. Treated as the same category of scope call as cloud
sync (Section 13.7) and hike mode's safety-feature boundary (Section
13.8) — a genuinely separate project, not a natural extension of Tiers
1+2, and one a future contributor should scope on its own rather than
bolt onto this phase.

---

## 2026-07-20 — Locations CRUD uses text/number fields, not map pin-drop or Places search (Section 4, "Locations" bullet)

**What**: Phase 2's `SavedLocation` add/edit form (`src/screens/locations/LocationForm.tsx`) takes label, address, and lat/lng as plain text/number inputs, rather than the "map pin drop or address search" the spec describes.

**Why this needed a decision**: both real alternatives have a hard dependency Phase 2 doesn't have yet. Address search means Google Places autocomplete, which is explicitly Phase 4 work (`docs/02-external-apis.md` §2, `docs/04-screens-navigation.md` §4 "Plan" bullet) — billing setup and the debounced-autocomplete wiring aren't in scope this early. Map pin-drop means `react-native-maps`, which has no web target; importing it here would break the web dev-mode smoke-check this project has been using to verify each phase in the browser (`expo start --web`), for a screen that doesn't strictly need a map to be functional.

**Resolution**: kept `SavedLocation` CRUD fully functional with text/number fields for now. `react-native-maps` gets its first real use in Phase 3 (Journey Detail's map, `docs/08-build-phases.md` phase 3), which is also the natural place to decide how to handle its web-target gap (conditional rendering, a web-only placeholder, etc.) once and reuse that pattern here too, rather than solving it twice. Address search moves to Phase 4 alongside the rest of the live-API wiring it actually depends on. Revisit this form once both exist rather than half-wiring either ahead of its dependencies.

---

## 2026-07-20 — Onboarding gate uses an explicit completed flag, not the "no Inventory/no SavedLocation" check (Section 4.1)

**What**: `needsOnboarding` (read in `App.tsx`/`RootNavigator`) is driven by a new `app_settings.onboarding_completed` flag (`src/db/repositories/settings.ts`), set once the onboarding flow finishes — skipped or not — rather than by querying whether any Inventory/SavedLocation rows exist yet.

**Why this needed a decision**: Section 4.1 defines "first launch" as "no `Inventory` rows and no `SavedLocation` rows at all," but the same section also says "a user can skip straight through and land on an empty Today tab; that's fine." Taken literally, the first definition means onboarding re-triggers on every subsequent launch for a user who skipped every step, since the data-presence condition is still true — which contradicts landing on Today being "fine." The two statements are in tension as written.

**Resolution**: read the first statement as describing *when onboarding is first shown*, and the second as the actual desired steady-state behavior afterward, and bridged the gap with an explicit flag rather than re-deriving "have we shown onboarding" from data that a fully-skipped run never writes. `needsOnboarding` is `!onboarding_completed`, set true unconditionally when the user reaches the end of the flow (finished or skipped through). This is a one-line interpretive call, not a structural change — worth flagging since a future contributor reading Section 4.1's data-presence sentence in isolation might "fix" this back to the literal reading and reintroduce the loop.

---

## 2026-07-20 — Plan screen's date/time picker is plain text fields (Section 4, "Plan" bullet)

**What**: `src/screens/plan/PlanScreen.tsx`'s "When" section is two text inputs (`YYYY-MM-DD`, `HH:mm`), defaulting to now, rather than a native date/time picker widget.

**Why this needed a decision**: `docs/01-tech-stack.md`'s dependency table doesn't include a date/time picker library (`@react-native-community/datetimepicker` or similar), and React Native itself dropped its old built-in `DatePickerIOS`/`DatePickerAndroid` components years ago — there's no picker available without adding a new dependency the spec doesn't call for. Same shape of gap as the map/geocoding decision above (Locations CRUD), and resolved the same way.

**Resolution**: plain text fields for now, matching the lat/lng precedent already set for `SavedLocation`. Functionally complete — `departTime` still parses correctly and defaults to "now" per §4.3 — just not the polished picker UI the spec's wording implies. Revisit if/when a date-picker dependency is deliberately added to the tech stack (most naturally alongside Phase 4's other UI-polish passes), rather than pulling one in ad hoc mid-Phase-3 for a single field.

---

## 2026-07-20 — Bus/train journeys with waypoints skip indoor dwell legs (Section 5.5)

**What**: `src/lib/planJourney.ts`'s `stepsToAssembledLegs()` only interleaves a waypoint's indoor dwell leg (`Journey.waypoints`, §3.5/§4.3.1) into the leg list for walk/cycle/drive modes. A bus/train journey with waypoints still routes through them (they're passed to Google as `intermediates`), but the resulting leg list has no separate indoor stop for them.

**Why this needed a decision**: Google's Routes API returns one leg per hop for WALK/BICYCLE/DRIVE (`origin→wp1`, `wp1→wp2`, …), which lines up 1:1 with our per-hop leg model — clean to interleave. TRANSIT mode instead returns one flat `steps[]` list for the whole trip mixing WALK/TRANSIT sub-segments, with no documented hop boundary once waypoints are involved, and (per Google's docs, unverified here — no live API key this session, see the Phase 4 kickoff conversation) transit routing's support for intermediate waypoints at all is uncertain. Guessing at hop boundaries from step count would be fragile.

**Resolution**: scoped narrowly — waypoints still fully affect the *route itself* (Google still routes through them), just not our leg list's presentation of them as separate indoor stops, for transit specifically. A multi-stop transit errand (bus to the bank, then the pharmacy, then work) is a narrow combination for a commute app; if it turns out to matter, revisit once a real Routes API key is available to confirm how Google actually behaves here, rather than guessing further now.

---

## 2026-07-21 — Phase 5's recommendGear() omits the annotation-gated wind/sun deltas and puddle risk (Section 7.8)

**What**: `src/lib/recommend.ts`'s Phase 5 `recommendGear()` implements Section 7 in full except the `windLeg`/`sunLeg` envDelta block and puddle-risk shoe override from Section 7.8. The stationary-wait aggravation (also introduced in the same "step 1.5" code block in Section 7's reference implementation, but covered by Section 7.9 rather than 7.8) is included now, not deferred.

**Why this needed a decision**: Section 7's reference code presents wind-tunnel, sun-exposure, and stationary-wait as one contiguous adjustment step, citing both §7.8 and §7.9 together — reading it in isolation, all three look like Phase 5 work. But `docs/08-build-phases.md`'s Phase 6 description explicitly lists "the wind/sun/reflection/puddle/rain-cover adjustments to `recommendGear()` (Section 7.8)" as Phase 6 work, with stated reasoning: those adjustments only ever fire when a leg is flagged `windEffect`/`sunEffect`/`highReflection`/`puddleRisk` — fields that don't exist yet because Phase 6 is what wires the `EnvironmentAnnotation` matching (and puddle risk's `recentPrecipMm6h`, needing the `past_days` Open-Meteo parameter Phase 6 also adds) that sets them. Writing that block now would be genuinely dead code, unlike the `hikeSamples`-in-Phase-1-schema precedent (that shape gets *read* correctly once Phase 20 exists; §7.8's block wouldn't even have real inputs to read until Phase 6).

**Resolution**: split by data dependency, not by section number. Stationary-wait aggravation needs only `JourneyLeg.isStationary` and `WeatherSnapshot.windKph`/`apparentTempC`, both real since Phase 4 — included in Phase 5. Wind-tunnel/sun-exposure/reflection/puddle-risk need annotation-matching and `recentPrecipMm6h`, both Phase 6 — deferred there, exactly as `docs/08-build-phases.md` Phase 6 already describes, so Phase 6 only has to *add* that block to an already-built function rather than reconcile a conflicting reading.

---

## 2026-07-21 — Annotation UI simplifications: no embedded-map repositioning, no swipe-to-delete, stepped radius chips, no row map thumbnails (Section 4.5)

**What**: Phase 6's `EnvironmentAnnotation` UI deviates from §4.5's wording
in four small ways: (1) editing an annotation from the Local knowledge list
repositions via lat/lng number fields, not "a small embedded map"; (2) list
rows delete via a per-row ✕ button (plus a delete action inside the edit
form), not swipe-to-delete; (3) the radius control is a stepped chip row
(50/100/150/200/250/300m, default 100), not a continuous 50–300m drag
slider; (4) list rows show an effect icon, not "a small static map
thumbnail centered on it."

**Why this needed a decision**: each is the same shape of gap already
logged for earlier phases rather than a new judgment: `react-native-maps`
has no web target (breaking the browser smoke-check this project verifies
every phase with — the exact reasoning in the "Locations CRUD uses
text/number fields" entry), no slider or swipe-gesture dependency is in
`docs/01-tech-stack.md`'s table (the same reasoning as the WarmthSlider
stepped-segments and plain-text date-picker entries), and a static map
thumbnail per row would need either a Maps Static API call (billing, a new
network dependency for pure decoration) or a live embedded map per row.

**Resolution**: kept every §4.5 behavior — add-in-context via map
long-press with live radius-circle preview (native), edit/delete/review
from the list, per-effect placeholder copy, the 4.1 empty state — with
those four presentation details simplified to match the established
precedents. The map long-press add flow itself IS built with the real
map circle preview, since Journey Detail's native map already exists;
only the list/edit screen avoids map dependencies. Revisit alongside the
same future pass the Locations entry already anticipates (if a map
pin-drop/slider dependency is ever deliberately added).

---

## 2026-07-21 — AT GTFS Realtime lookup keys are best-effort, not real AT GTFS ids (Section 5.6, Phase 7)

**What**: `transitService.getRealtimeDelay()` (`src/services/transitService.ts`)
makes a real network call to AT's trip-updates feed and matches a
`stop_time_update` by `routeId`/`stopId`. Those two values, as threaded
through from `routesService.ts`'s Google Routes parsing into
`planJourney.ts`, are Google's own route short name (`transitLine.nameShort`)
and departure-stop display name (`stopDetails.departureStop.name`) — not
AT's actual GTFS `route_id`/`stop_id`, which are separate internal
identifiers Google's transit response doesn't expose.

**Why this needed a decision**: Section 5.6 describes sizing the wait leg
"from the AT GTFS Realtime scheduled-vs-actual delta for that specific
departure," which in a fully-correct implementation means matching the
exact `trip_id` AT's feed uses. Building that match properly would require
importing and indexing AT's static GTFS feed (stops.txt/routes.txt/trips.txt)
to resolve Google's names/short codes to AT's real ids — a standalone data
pipeline, not a small addition to this phase, and the same order of scope
as the multi-user (§2.2) and cloud-sync (§13.7) exclusions already logged
here.

**Resolution**: implemented the service call for real (real fetch, real
auth header, real JSON parsing, proper `ServiceResult` error mapping) using
the best-effort name-based keys as-is, rather than leaving the whole
integration stubbed or half-faking a static-GTFS lookup under time
pressure. A mismatch (the very likely case until a real ids-resolution
pass exists) simply produces "no matching entity found," which
`getRealtimeDelay()` maps to the same `unreachable` result AT being
genuinely down would produce — §5.6 point 2's flat 5-minute fallback
already covers that path correctly, so the user-facing behavior degrades
gracefully rather than breaking. Revisit once a real AT subscription key
and static GTFS import are both in place to verify actual field shapes,
the same "unverified — no live key this session" caveat already logged for
the Google Routes waypoints-transit entry above.

**Also**: `RealtimeDelay.stopType` ("platform" vs "street-stop", used for
`JourneyLeg.waitContext`) is inferred purely from travel mode — trains
always "platform," buses always "street-stop" — rather than from GTFS stop
metadata, since the realtime trip-updates feed carries no `location_type`
data (that's static-GTFS territory too). A reasonable default per §5.6
point 1's own wording ("inferred from the AT GTFS stop type if available,
**otherwise default to transit-stop**"), just a smarter default than a
blanket transit-stop for both modes.

---

## 2026-07-21 — Phase 8 (leave-by notifications): freeze/recordWear via a
Journey-Detail fallback and a foreground listener, not a background task;
recurrence-pause cancellation deferred (no UI exists to pause one)

**What**: `src/lib/leaveBy.ts` implements §7.3/§7.16's "freeze
`RecommendationSnapshot` and call `recordWear()` at leave-by time" via two
triggers, not a single one: (1) `App.tsx` registers
`Notifications.addNotificationReceivedListener`, which fires the freeze
when the scheduled notification is actually delivered while the app
process is alive (foreground or backgrounded); (2) `JourneyDetailScreen`
calls `freezeIfDue()` on every load as a fallback, covering the case where
the app was fully killed and the listener never ran. `freezeIfDue()` is
idempotent (guarded by `recommendationSnapshot` already being set), so
either trigger firing first is fine.

**Why this needed a decision**: Expo's managed workflow (this project's
tech stack, `docs/01-tech-stack.md`) has no reliable way to run JS and
write to SQLite at a precise future moment when the app isn't running —
that needs a native background-task extension (`expo-dev-client` +
`expo-task-manager`/`BGTaskScheduler`), the same category of native-
complexity gap already logged for the home screen widget (§7.4) and
deferred there for the same reason. Silently shipping only the
listener-based path would mean wear tracking/History snapshots simply
never populate for a killed-app scenario, which is a real and common case
for a commute app (phone locked, app swiped away overnight).

**Resolution**: `RecommendationSnapshot`'s own doc comment already
anticipates exactly this gap — "frozen at leave-by time... or on first
History view of a past journey missing one" (`docs/03-data-models.md`)
— so the fallback isn't a new invention, it's implementing a case the
spec's own data model comment already called for. Journey Detail (not
History, which is still Phase 9's empty shell) is where it's wired for
now since it's the only screen currently reading real past Journeys;
revisit once Phase 9 builds History proper to make sure it also benefits
(it will, automatically, once History reads through `getJourney`/the same
repository layer — no additional wiring anticipated, but worth confirming
then).

**Also**: §7.3 also calls for cancelling a scheduled notification when the
user deletes a Journey or "turns off a recurrence's `active` flag." A
minimal delete-journey action (confirm-then-delete) was added to Journey
Detail specifically to make the deletion half of this reachable — no such
action existed anywhere before this phase. The recurrence-pause half is
**not** wired: no screen in any phase through Phase 7 exposes editing or
pausing an existing `RecurrenceRule.active` flag (Plan screen only sets
`active: true` once, at creation), so there is no UI trigger to attach a
cancellation call to. Building a recurrence-management screen is out of
Phase 8's stated scope ("Leave-by notifications"); revisit alongside
whichever future phase adds recurring-journey editing.

---

## 2026-07-21 — Fixed web bundling (`metro.config.js`), added `withTimeout()` as a defense-in-depth backstop, not the primary fix

**What**: added `metro.config.js` registering `"wasm"` on
`resolver.assetExts`, and extracted `App.tsx`'s inline startup-timeout
helper into `src/lib/withTimeout.ts`, applying it to every onboarding
step's DB write (`Step2HomeWork`, `Step4GearBasics`, `Step5CrashReporting`,
`OnboardingScreen.finish`).

**Why this needed a decision**: earlier in this project's history, `expo
start --web` failed to bundle at all with "Unable to resolve
./wa-sqlite/wa-sqlite.wasm" (`expo-sqlite`'s web backend imports a `.wasm`
binary Metro's default asset-extension list doesn't recognize), which was
treated as a pre-existing, unfixable environment limitation and worked
around with `App.tsx`'s `withStartupTimeout` — a timeout+fallback around
the *startup* `getDb()`/`isOnboardingCompleted()` calls only. That
narrower guard meant every *other* DB write in the app (onboarding steps,
eventually every screen) still hung indefinitely and silently on web,
which is what actually surfaced as "the crash-reporting Done button
doesn't work."

**Resolution**: the wasm resolution failure turned out to be a one-line
Metro config gap, not a structural web-incompatibility — pushing `"wasm"`
onto `resolver.assetExts` fixes bundling outright, and once fixed,
`expo-sqlite`'s web backend (OPFS-based) worked correctly with no
COOP/COEP-related errors in this dev environment (contrary to
`App.tsx`'s original comment speculating that headers would also be
needed — they weren't, at least not for local `expo start --web`).
**The `withTimeout()` extraction is kept anyway**, applied more broadly
than before, as a defense-in-depth backstop — a DB call hanging for some
other reason (a different browser's OPFS quirks, a future regression)
should still degrade to "onboarding step didn't save, but the button
isn't stuck" rather than freezing the UI silently, the same reasoning
`App.tsx`'s original guard was built on. This is belt-and-suspenders, not
a substitute for the real fix.

---

## 2026-07-21 — Phase 9 (History): JourneyDetailScreen now prefers `recommendationSnapshot` over a live recompute whenever one exists, not just when opened read-only from History

**What**: `GearRecommendationCard` gained a second render path (`snapshot: RecommendationSnapshot` prop, alongside its existing `recommendation: Recommendation` prop), and `JourneyDetailScreen` now renders from `journey.recommendationSnapshot` whenever it's set, falling back to the live `useRecommendation()` result only when it isn't — for every journey the screen opens, not only ones opened `readOnly` from the new History screen.

**Why this needed a decision**: docs/09-design-system.md §9.4.2 only describes this swap for History's detail view ("reuses the Journey Detail component from 9.3... swaps the live Recommendation for the frozen recommendationSnapshot fields where present"), which reads as History-scoped. But the Phase 8 entry above already flagged this exact gap and said it would resolve "automatically" once Phase 9 built History — that framing assumed Journey Detail would end up branching on `readOnly`/History-origin specifically. On inspection, `RecommendationSnapshot`'s doc comment (docs/03-data-models.md) states its purpose plainly: it exists so any past-journey view "reads this instead of re-running the live engine" — that's about the journey being in the past, not about which screen happens to be showing it. Gating the swap behind `readOnly` would leave a real bug: viewing an old journey directly (not through History — e.g. a `linkedReturnJourneyId` link, or Today's list before a journey's flagged past) would keep recomputing against whatever the inventory looks like *now*, silently misrepresenting what was actually recommended at leave-by time — exactly the drift `recommendationSnapshot` was built to prevent.

**Resolution**: scoped the swap to "does a snapshot exist," not "is this screen read-only" — the two are related but not identical (a journey can have a snapshot independent of being opened from History). `readOnly` itself stays narrow, used only to hide the return-trip Pressable (the one piece of UI §4.4 says doesn't apply to a past journey). Severe-weather/confidence banners still read the live `recommendation`, since `RecommendationSnapshot` doesn't carry those fields — a narrower, separate gap this pass doesn't attempt to close.

---

## 2026-07-21 — Phase 10 (Personalization): forecast drift re-check (§5.2) runs on app/screen foreground only, not the 3h/30min OS-scheduled background task; dev-menu triggers (§12.2) not built

**What**: `src/lib/forecastDrift.ts`'s `checkForecastDrift()` re-fetches weather and recomputes `recommendGear()` for a still-upcoming Journey, but is only ever invoked from two foreground triggers: `App.tsx`'s `AppState` "active" listener (checking every Journey departing within the next 24h) and `JourneyDetailScreen`'s existing focus effect (checking the one Journey currently open, alongside its existing `freezeIfDue()` fallback call). Similarly, `src/lib/calibration.ts`'s `runCalibrationDecayIfDue()` (§7.5.3) runs from the same `AppState` listener rather than a scheduled background job, and no dev-menu screen (§12.2) exists to trigger either manually.

**Why this needed a decision**: §5.2 describes "background-scheduled re-fetch... at a fixed lead time before departure: 3 hours out... and again at 30 minutes out," using `expo-task-manager` + `expo-background-fetch` for the 3-hour check specifically, with a foreground check as a stated supplement, not the primary mechanism. Building the real OS-scheduled version needs the same native background-task extension already identified as out of scope for this Expo-managed-workflow project — logged for §7.4 (home screen widget) and, most directly, the Phase 8 entry above for §7.3/§7.16's freeze/recordWear point, which resolved the identical gap ("Expo's managed workflow has no reliable way to run JS... at a precise future moment when the app isn't running") the same way: foreground-triggered coverage now, native extension deferred.

**Resolution**: applied the exact precedent the Phase 8 entry already set, rather than re-deciding it — foreground checks (on app open/resume and on Journey Detail focus) cover real usage (a commuter opens the app before leaving, which is when this matters most), while the unattended 3h/30min-before-departure case for a Journey the user never reopens is not covered without the native extension. `runCalibrationDecayIfDue()` and `checkForecastDrift()` are both written as plain exported functions specifically so a future `§12.2` dev-menu screen (itself not yet built — no dev menu exists anywhere in the app through Phase 10) can call them directly once it exists, rather than needing rework then. Revisit alongside whichever future phase adds `expo-dev-client` for the widget/leave-by gaps, since all three would share the same native background-task investment.

---

## 2026-07-21 — Phase 11 (Polish): the full §9.1 dark/light theme retrofit was built now, not deferred further; gear-card fallback text stays non-interactive (no "tap to add" wiring); rain-intensity gauge (§9.5) not built

**What**: Three related but separate calls made while working through Phase 11's design-system bullet (`docs/08-build-phases.md` phase 11, "map marker styling for weather badges... §9.1"):

1. Built out the theme system §9.1 actually describes — `src/theme/{tokens,useThemeStore,useTheme}.ts` plus a repo-wide retrofit of every screen/component's hardcoded hex colors to read `useTheme()`/`getStyles(theme)` — rather than treating Phase 11 as only the map-marker/annotation-pin styling its build-phase bullet names explicitly. `SettingsScreen.tsx` had an inline comment from Phase 5 stating plainly that "full app-wide re-theming... is Phase 11 Polish," so this wasn't a scope expansion, it was picking up a deferral this codebase had already flagged for itself.
2. Left `GearRecommendationCard.tsx`'s fallback text (e.g. "No suitable umbrella owned or available — consider a wind-rated one") as plain, non-interactive `Text`. §9.6 says gear-card fallback text "should read as an action... matching the empty-state CTA pattern" ("No shoes yet — add your first pair," which *is* a tappable `Pressable` on the Gear list screens). Read literally, this implies each fallback slot (layers/accessories/bottoms/shoes/umbrella) should be tappable and navigate to the relevant Gear add form.
3. Did not build the rain-intensity droplet gauge from §9.5 ("used in the hourly strip on Plan/Today") — it doesn't exist anywhere in the app; there's no hourly forecast strip on either screen to attach it to in the first place.

**Why these needed a decision**: (1) is a scope call, not a compliance gap, so it's logged for visibility rather than as a deviation. (2) and (3) are both real, spec-stated pieces of UI that are genuinely missing, surfaced while doing the §9.6 accessibility pass this same phase — worth being explicit that they were seen and left, not missed. Wiring (2) properly means `GearRecommendationCard` (currently a pure presentational component fed a computed `Recommendation`/`RecommendationSnapshot`, reused identically by the live Journey Detail view and History's frozen read-only view) taking an optional navigation callback per slot, routing to five different Gear add forms (jacket/midlayer/base, umbrella, shoes, bottoms, accessories) — a real feature addition, not an accessibility-label fix, and one that has to make a call about what "tap to add" even means from History's frozen, read-only context. (3) needs an hourly-forecast data source and UI (an "hourly strip") that Plan/Today don't currently have at all — building the droplet visual without that surrounding strip would be a decoration with nothing to attach to.

**Resolution**: (1) shipped in full this phase. (2) and (3) deferred — logged here rather than silently left as an unstated gap now that they've been specifically noticed during the accessibility pass. `GearRecommendationCard`'s existing fallback copy (already specific per-item guidance, e.g. naming the umbrella wind-rating shortfall) still reads reasonably as information even without being tappable, so this isn't a broken experience today, just short of the letter of §9.6's "double tap to add one" example. Revisit (2) as its own scoped pass — deciding History's read-only case first — and (3) alongside whichever future phase adds an hourly forecast strip to Plan/Today (not currently on any phase's list through Phase 12).

**Update, same day**: both (2) and (3) were picked up as follow-on scoped passes shortly after this entry, superseding the "deferred" resolution above for those two items — see the two entries immediately below.

---

## 2026-07-21 — §9.5 rain-intensity gauge: built as a Plan-screen-only hourly strip, not Plan+Today

**What**: Added `src/components/RainGauge.tsx` (the droplet-fill SVG, `react-native-svg` `ClipPath`, buckets none/low/med/high per `docs/06-weather-classification.md` §6's exact thresholds — probability < 20% → `none`, then precip < 0.5mm → `low`, ≤ 4mm → `med`, else `high`) and `src/components/HourlyStrip.tsx` (a horizontal `ScrollView` of gauges), wired into `PlanScreen.tsx` directly under the date/time fields, reading the selected origin + selected departure time. Not added to Today's "Right now" card.

**Why this needed a decision**: §9.5 says the gauge is "used in the hourly strip on Plan/Today," naming both screens, but doesn't specify whether that means one shared strip surfaced in two places, two independent strips, or just imprecise wording. Today's "Right now" card has its own explicit spec (§9.3.1: "no map, no leg list, no journey label, just current conditions... and the reduced recommendation" — a deliberately minimal single-point snapshot), which an hourly forward-looking row doesn't fit conceptually; Plan, by contrast, is exactly where knowing "does it rain in the next few hours" changes what the user actually does (pick a different departure time, grab an umbrella before leaving). Building both would mean either duplicating the fetch/render logic or over-engineering a shared abstraction for a second placement whose spec grounding is genuinely ambiguous.

**Resolution**: shipped as a `HourlyStrip` used once, on Plan, anchored to the currently-selected origin and departure time (omitted entirely — not a placeholder — when no origin is chosen yet or the typed date/time is invalid, same "don't render a placeholder" pattern used throughout this app). `src/services/weatherService.ts` gained `getHourlyForecast()`, a single-location sibling to the existing per-leg `getForecast()`, since Open-Meteo's response already includes the full hourly array — `getForecast()` was just discarding all but the nearest reading per point, so no new request shape was needed, only a new extraction path (`fetchOpenMeteoHourly()` factored out and shared between the two). Revisit adding a second strip to Today's card if a future pass decides §9.3.1's "just current conditions" framing should change — that's a scope call for whoever touches Today next, not implied by this entry.

---

## 2026-07-21 — Gear-card fallback text wired to "tap to add" (§9.6), scoped to the live recommendation only

**What**: `GearRecommendationCard.tsx`'s fallback slots (layers/accessories/bottoms/shoes/umbrella) now navigate to the matching Gear add form when tapped — `src/navigation/types.ts` gained a `GearAddTarget` param threaded through `MainTabParamList.Gear` → `GearScreen` → `ClothingList`/`ShoeList`/`UmbrellaList` → `ClothingForm`'s new `initialType` prop, triggered from `JourneyDetailScreen.tsx`'s live `recommendation` render path only.

**Why this needed a decision**: the entry above already laid out the two open questions — how "tap to add" should behave in History's frozen `snapshot` view, and whether it's worth the cross-screen navigation wiring at all. Resolved: `snapshot` mode stays non-interactive, since a past journey's frozen recommendation has nothing meaningful to "add" retroactively — `RecommendationSnapshot` doesn't even carry the `layerType`/slot-kind information needed to build a target. The live `recommendation` path does carry that information (`LayerPick`'s fallback shape already includes `layerType: ClothingType`), so wiring it there is a direct, non-speculative implementation of §9.6's literal example ("No umbrella owned — double tap to add one").

**Resolution**: implemented via `FallbackText`, a small module-level component (not nested in the card's render body, to avoid recreating it every render) that renders a plain `Text` when no `onAddGear` callback is supplied (the `snapshot` path never passes one) and a `Pressable` with an action-phrased `accessibilityLabel` when it is. `GearScreen`'s auto-open-add-form logic uses React's render-time "adjusting state when a prop changes" pattern rather than `useEffect` + `setState`, since this codebase's ESLint config enforces the `react-hooks/set-state-in-effect` rule (React 19) — the same pattern already established for `ClothingList`/`ShoeList`/`UmbrellaList`'s own auto-open props.

---

## 2026-07-21 — Phase 12: SQLite left unencrypted at rest; disclosed in the privacy policy instead of adding SQLCipher

**What**: `expo-sqlite`'s database file stays plain (no SQLCipher config plugin added), per §10.2's own explicit escape hatch ("enable SQLCipher if the agent wants encryption-at-rest; otherwise explicitly note in the privacy policy that data is stored unencrypted on-device").

**Why this needed a decision**: SQLCipher for `expo-sqlite` requires a config plugin that changes the native build (a `expo prebuild`/custom dev client dependency), which is the same category of native-complexity gap already logged repeatedly in this file (background tasks for §7.3/§7.4/§5.2) — it can't be verified against a real native build in this environment, and this app's managed-workflow precedent throughout has been to avoid native config-plugin additions that can't be smoke-tested here.

**Resolution**: took the spec's own named alternative — data stays unencrypted on-device, and `PRIVACY_POLICY.md` (added this phase, at repo root alongside `DECISIONS.md` rather than under `docs/`, which is reserved for the numbered build-spec files per `AGENTS.md`'s file index) states this plainly under "where it's stored." The data itself (home/work addresses, gear inventory) is personal but not high-sensitivity (no payment info, no third-party accounts), consistent with §10.2's own framing ("isn't especially sensitive, but... personal"). Revisit if a future phase already requires a custom dev client for another reason (e.g. the widget/background-task work flagged elsewhere in this file), since SQLCipher would then be a much smaller incremental addition to a build that already needs prebuild.

---

## 2026-07-21 — Phase 12: crash reporting wired as a real conditional gate with a local no-op provider, not a live Sentry SDK install

**What**: `src/lib/crashReporting.ts` exports `initCrashReportingIfEnabled()`, called once from `App.tsx` on startup and again from `SettingsScreen`'s toggle handler, reading the existing `crash_reporting_enabled` setting (already persisted since Phase 2's onboarding step). It calls through a small `CrashReportingProvider` interface (`init`, `captureException`, `close`) rather than importing `@sentry/react-native` directly.

**Why this needed a decision**: `docs/01-tech-stack.md` names "Sentry's Expo SDK (or equivalent)" and §10.5 describes gating `Sentry.init()` behind the stored preference. Installing the real native Sentry SDK needs a DSN from a real Sentry project this session has no account for, and — same reasoning as the SQLCipher entry just above — a native module addition that can't be exercised against a real native build (or even confirmed to bundle cleanly for the `expo start --web` smoke check this project relies on) in this environment. Shipping `Sentry.init(undefined)` or a hardcoded placeholder DSN would be worse than not wiring it: it would silently fail or, worse, actually transmit to whatever project a placeholder DSN happened to resolve to.

**Resolution**: built the real conditional-gating logic and scrub step (§10.5's location/label-scrubbing requirement) against a `CrashReportingProvider` interface, with a `NoopCrashReportingProvider` as the only implementation wired in for now — so the on/off preference, the "never initializes when off" guarantee, and the "no telemetry connection at all while opted out" property are all real and testable today. Swapping in `@sentry/react-native` later is a one-file change (`src/lib/crashReporting.ts`'s provider selection) once a real DSN exists, not a redesign. Explicitly not the same as "crash reporting isn't built" — the toggle, the init/no-init behavior, and the scrubbing are all implemented and unit-tested; only the actual telemetry transport is deferred pending a real vendor account.

---

## 2026-07-21 — Phase 12: bundle identifier is a placeholder; `PrivacyInfo.xcprivacy` is a best-effort draft, not Apple-verified; Google Cloud/App Store Connect/Play Console steps left as an explicit manual checklist

**What**: `app.json` sets `ios.bundleIdentifier`/`android.package` to `nz.co.commuteweatherplanner.app` — an invented reverse-DNS identifier, since no real organization/developer account identifier was specified anywhere in this project. `ios.privacyManifests` is filled in with a reasonable declaration (no tracking, precise-location collected for app functionality, not linked to identity) but does not attempt to declare Apple's "required reason API" entries (`NSPrivacyAccessedAPITypes`) for the specific system APIs `expo-sqlite`/`expo-file-system`/their transitive dependencies actually touch. `PRODUCTION_CHECKLIST.md` (added this phase) explicitly separates what's done in-code from what needs a real Google Cloud Console / App Store Connect / Google Play Console login to complete (key restrictions, budget alerts, hosting+linking the privacy policy URL, actually submitting a build).

**Why this needed a decision**: bundle/package identifiers can't be changed after a store listing is created against them, so inventing one is a real, consequential placeholder, not a cosmetic default — flagging it explicitly (rather than silently picking something and moving on) means whoever actually submits notices it before it's locked in. The `NSPrivacyAccessedAPITypes` declarations specifically require knowing the exact "required reason" API categories the final compiled binary touches, which in practice Apple determines from the actual linked frameworks — guessing at this without a real Xcode archive to check against risks writing a plausible-looking but wrong manifest, which is worse than clearly marking it unverified. Similarly, key restriction (needs a release keystore's SHA-1, which only exists after a real EAS build), budget alerts, and privacy-policy hosting are all actions inside third-party consoles this session has no credentials for and, more fundamentally, aren't code — no amount of repo work substitutes for someone with account access clicking through Google Cloud Console.

**Resolution**: shipped everything that's actually expressible as repo config (eas.json build profiles, app.json's bundle IDs/permissions/privacy manifest skeleton/icon, PRIVACY_POLICY.md content, STORE_LISTING.md draft copy, the crash-reporting gate, the export/import flow) as real and complete, and used `PRODUCTION_CHECKLIST.md` to make the remaining external-dashboard steps an explicit, itemized handoff rather than an implied "done" or a silently missing gap. Revisit the bundle identifier specifically before any real submission, since changing it later means a new store listing, not an edit.

---

## 2026-07-21 — "Paua Pop" visual identity redesign: full palette overhaul, requested and approved through a multi-round design review before any code changed

**What**: `src/theme/tokens.ts`'s `darkTheme`/`lightTheme` are rewritten from the original muted amber/teal/lavender scheme to "Paua Pop" — pōhutukawa pink, pāua teal/violet, kōwhai gold — and the app icon is replaced with an NZ-outdoors bucket hat illustration. This is a deliberate, requested visual identity change, not a bug fix or scope interpretation — logged here per this file's own header ("one entry per deliberate deviation... within the docs"), since it reverses specific named color values and an icon concept that were themselves spec'd in `docs/09-design-system.md` and `docs/10-production-readiness.md`.

**Why this needed a decision**: the original palette and umbrella/jacket icon concept were both explicit, considered spec content (§9.1's table, §10.4's icon-concept paragraph), not placeholders — replacing them is a real spec change, and the docs needed to change with the code rather than drifting out of sync with what's actually in `tokens.ts`.

**Resolution**: before touching any code, the new direction went through six rounds of visual review as published design pitches (palette + logo mark shown side by side, then full app-screen mockups, then live user feedback on the hat's shape/style across several iterations, then a "calm the UI down" pass, then a weather-reactive-tint concept, then the user's own reference artwork for the final mark) — each round's output was screenshotted and checked before presenting it, and the user picked/refined the direction explicitly at each step rather than this being an unreviewed unilateral change. Only once a specific final direction was approved ("time to update the files!") did `tokens.ts`, the icon assets, and `docs/09-design-system.md` actually change. `docs/09-design-system.md` §9.0/§9.1/§9.1.3 and `docs/10-production-readiness.md`'s icon-concept paragraph were updated in the same pass as the code, not left to drift.

---

## 2026-07-21 — §9.0's "no drop shadows" rule reversed to shadow-based card elevation, per explicit request

**What**: `cardElevationStyle()` (`src/theme/tokens.ts`) replaces the border used on `RightNowCard`, `JourneyCard`, and `GearRecommendationCard` with a shadow (`shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`, plus `elevation` for Android). §9.0's original text stated plainly: "Flat fills, no gradients or drop shadows."

**Why this needed a decision**: this is a literal, named reversal of an existing utilitarian-side principle, not a new component pattern layered alongside it — worth flagging explicitly rather than quietly overwriting the rule's own stated reasoning (glanceability/information density first).

**Resolution**: implemented exactly as asked ("instead of borders around content box components, just make the boxes stand out a little with shadows") — one shared `cardElevationStyle()` helper so every card gets identical elevation rather than each screen inventing its own shadow values, tuned separately per theme (`shadowOpacity: 0.35` dark / `0.1` light, since a light-mode shadow needs far less opacity to read as "lifted" rather than "smudged"). §9.0's text was updated to describe the new rule rather than left contradicting the code. The light theme's `surfaceRaised` still keeps its `border`-colored 1px outline on top of the shadow — that one wasn't about "no shadows," it's the pre-existing "white-on-off-white needs a seam" fix, which the shadow alone doesn't fully solve at every brightness/OS shadow-rendering combination.

---

## 2026-07-21 — Weather-reactive Today-tab tint scoped to the Today tab only, not Journey Detail

**What**: `useWeatherTheme()` (`src/theme/useWeatherTheme.ts`) — the mood-based tint (§9.1.3) — is wired into `TodayScreen`/`RightNowCard`/`JourneyCard` only. Journey Detail's map/leg list/`GearRecommendationCard` still read the plain `useTheme()` base palette regardless of that journey's own weather.

**Why this needed a decision**: the underlying idea ("the colours of the screen... reflect the weather/temperature of the journey") generalizes naturally to any screen showing weather-linked content, and Journey Detail is the screen with the most per-leg weather detail already on it — leaving it out could read as an oversight rather than a choice.

**Resolution**: scoped narrowly to what was actually designed and approved across the pitch rounds — every mockup shown was the Today tab specifically, using the *current* conditions (the "Right now" card's own weather reading) to set one mood for the whole screen. Journey Detail has a materially different shape of problem: a journey can span legs at very different temperatures (a cold morning walk into a warm afternoon return), so "which leg's mood wins" needs its own design decision (most naturally the current/nearest-upcoming leg, mirroring how the "Right now" card already prioritizes current conditions) that was never actually put in front of the user for approval. Revisit as a follow-on scoped pass rather than guessing at that answer now — `useWeatherTheme()` already accepts any single `WeatherSnapshot`, so wiring it into Journey Detail later needs no rework of the hook itself, just a decision about which leg's snapshot to pass it.

---

## 2026-07-21 — App icon traced from a user-supplied SVG rather than drawn from scratch

**What**: `assets/icon.png`, `android-icon-foreground/background/monochrome.png`, and `favicon.png` are generated from an SVG the user pasted directly into the conversation (after two earlier from-scratch attempts — a smooth-curve line icon and a straight-line/faceted rebuild — were both explicitly rejected as not matching the intended hat shape). The illustration's exact paths/fills/highlight details are reproduced unmodified; only the crop (tightened to the hat's bounding box), background (composited onto the app's own `bg` token instead of the source file's cream background), and a separate outline-only render (for `android-icon-monochrome.png`, Android 13+'s single-color themed-icon layer) were added.

**Why this needed a decision**: this is the app's primary brand mark generated from a third party's (the app owner's) supplied artwork rather than built from the spec's own icon-concept paragraph — worth recording that the source is external-supplied, not authored for this project from the §10.4 concept, in case the artwork's provenance/license ever needs checking before a real store submission.

**Resolution**: reproduced the supplied illustration exactly rather than "improving" or restyling it further, per the explicit instruction ("just try copy this attached image exactly") that followed two rejected from-scratch attempts. Flagged one real limitation rather than shipping it silently, before it was implemented: at very small render sizes (roughly under 30-40px — the range iOS uses for Settings/Spotlight-sized icon variants, well below the 1024px master or even the 48px favicon), this illustration's fold-line/highlight detail starts to blur into an unclear blob rather than a crisp glyph. It reads clearly from the favicon size (48px) up, which covers every place this repo actually renders it (`icon.png`, the Android adaptive-icon layers, `favicon.png`) — the small-OS-chrome case is a real but currently theoretical limitation worth knowing about before a real store submission, not something this pass needed to solve, since nothing in the app currently renders the mark smaller than that.

---

## 2026-07-21 — Onboarding collapsed to a single "where are you?" step; Home/Work, gear basics, and notification permission moved to a postponable setup checklist on Today

**What**: replaced the original 6-screen onboarding wizard (location-permission priming → Home/Work → live demo card → gear basics with self-report warmth → crash-reporting opt-in → notification permission) with one screen, `Step1Location.tsx` — use current location, type an address (real Google Places autocomplete, not the old lat/lng text fields), or skip outright. Finishing it (any path) drops the user straight onto Today. The gear-basics and notification-permission screens keep their exact original implementation but move to `src/screens/setup/` as standalone stack screens (`SetupGearBasics`, `SetupNotifications`) reached from a new dismissible `SetupChecklist` on the Today tab, not forced in sequence. The crash-reporting step is dropped entirely — it already defaulted off and was already changeable in Settings, so forcing it in onboarding added friction without adding a real choice. `LocationForm.tsx` (the full Locations CRUD add/edit form, previously plain lat/lng text fields per the 2026-07-20 "Locations CRUD uses text/number fields" entry) also gained the same real Places autocomplete, with lat/lng demoted to a collapsed "Advanced" section — closing that entry's deferral now that a `placesService.ts` exists to close it with.

**Why this needed a decision**: this is a direct, requested reversal of Section 4.1's explicit "5-step onboarding stack" (itself already amended once by this file's "Onboarding gate" entry) and Section 4's "Locations" bullet's plain-text-field precedent — not a bug fix or an ambiguous-wording judgment call. The request was explicit: demote lat/lng to a power-user setting, add real address autocomplete, let a user reach a working "simple weather app" experience with only a general location, and replace the rest of forced onboarding with postponable, resumable hints.

**Resolution**: built `placesService.ts` (Google Places API (New) autocomplete + place details, reusing `EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` rather than a second env var — see docs/02-external-apis.md) and a shared `AddressAutocomplete` component, used by both the new onboarding step and `LocationForm.tsx`. The captured onboarding location is stored as a new lightweight `app_settings.default_location` (lat/lng/label), deliberately *not* a `SavedLocation` — it's a fallback centre-point for `useRightNow()`'s "Right now" card (inserted into its existing device-GPS → Auckland fallback chain, now three-deep), not a place worth offering in Plan's origin/destination pickers. `SetupChecklist.tsx` computes each hint's done-state live from real data (any `SavedLocation`/`Journey`/inventory row; actual OS notification-permission status) rather than a stored flag, so it self-heals if the user adds things outside the checklist and never needs a second source of truth to stay in sync — "Not now" dismissals are the one thing that does need persisting (`dismissed_setup_tasks`, reset via a new Settings row), since indefinite postponement has no data-driven "done" state of its own. `docs/04-screens-navigation.md` §4.1 and `docs/02-external-apis.md`'s API table were updated in the same pass; `docs/03-data-models.md` was not touched, since `app_settings` is already documented there as a generic key/value table, not enumerated key-by-key.

**Left open**: Plan screen's origin/destination pickers still only search saved locations (`SavedLocationPicker.tsx`) — the free-text Google Places search Section 4's "Plan" bullet describes was never built (logged in the 2026-07-20 "Locations CRUD" entry as deferred to "Phase 4," but Phase 4 shipped without it). `placesService.ts`/`AddressAutocomplete` now exist and could close that gap directly, but wiring waypoints/origin/destination through free-text search is a separate, scoped UI change this pass didn't attempt — revisit as its own follow-on rather than folding it in here.

**Closed later the same day** — see the entry below.

---

## 2026-07-21 — AddressAutocomplete error visibility + race guard; map pin-drop closes the last "Locations CRUD" deferral

**What**: two follow-ups to the onboarding rework above, done in the same session once real usage surfaced a couple of gaps. First, `AddressAutocomplete.tsx` now (a) shows a distinct message when a search genuinely fails — network down, rate-limited, or Places unreachable — instead of looking identical to "no results found," and (b) tracks a per-search request id so a slow, stale response can't overwrite a faster, more recent one's results if the user types quickly. Second, a new `LocationPickerMap` component (native `react-native-maps` + a `LocationPickerMap.web.tsx` placeholder, same platform-split pattern `JourneyMap.tsx`/`JourneyMap.web.tsx` already established for the web dev-preview gap) lets a user tap-or-drag a pin instead of typing an address or raw coordinates, wired into both `LocationForm.tsx` and onboarding's `Step1Location.tsx` alongside the existing GPS/typed-address/skip paths. Confirming a pin calls a new `placesService.reverseGeocode()` (Google Geocoding API, same shared key) to fill in a human-readable address automatically.

**Why this needed a decision**: the map picker specifically closes the second half of the 2026-07-20 "Locations CRUD uses text/number fields, not map pin-drop or Places search" entry — that entry deferred map pin-drop because `react-native-maps` had no web target and no established workaround existed yet at Phase 2. Phase 3 (`JourneyMap.tsx`) later solved exactly that problem with a `.web.tsx` platform-split file, but nobody went back to retrofit `LocationForm.tsx` with it once it existed — this pass does, on the reasoning that a marker on a map is a friendlier way for a regular (non-technical) user to say "here" than typing decimal coordinates, which was the original spec's own framing for why map pin-drop was wanted in the first place (Section 4, "Locations" bullet).

**Resolution**: `LocationPickerMap` is a self-contained `Modal` (matching `SavedLocationPicker.tsx`'s existing self-contained-modal convention) rather than a bare map view the caller wraps — callers just pass `visible`/`initialCoords`/`onConfirm`/`onClose`. The web fallback (at the time this entry was written) was close-only, no map to drop a pin on — **superseded 2026-07-22, see the entry below: web now has a real map too.** Reverse geocoding failure is non-fatal — the pin's coordinates are still set and usable even if no address comes back, matching the same "coordinates are the source of truth, the label is best-effort" posture the rest of this form already had.

---

## 2026-07-21 — Closed three more long-standing gaps: Plan-screen free-text search, recurring-journey pause, and the §12.2 debug menu

**What**: asked "did we defer anything else?" after the entries above, then asked to close what's actually closeable without external/manual access (no GCP console, no real device build, no App Store history). Three real, code-only gaps got fixed in one pass:

1. **`SavedLocationPicker.tsx`** (the origin/destination/waypoint picker used throughout Plan) now embeds `AddressAutocomplete` — typed text filters the existing favorites-first saved-location list client-side *and* searches Google Places live, matching Section 4's "autocomplete against saved locations first... then free text via Google Places" exactly. A selected Places result becomes an ephemeral `SavedLocation`-shaped object (`id: newId()`, never persisted) rather than a real row — the same synthetic-location pattern `useRightNow.ts`'s "Current location" journey already established, so `planJourney.ts`'s `SavedLocation`-typed pipeline needed zero changes to accept it. This closes the "Left open" note two entries above.
2. **Journey Detail** now shows a "Repeats Mon, Wed, Fri — Pause/Resume" row for any journey that's part of a recurring series (the journey itself if it holds the `RecurrenceRule`, or its template fetched via `templateId` otherwise), toggling `RecurrenceRule.active` and cancelling that instance's scheduled leave-by notification when paused. `materializeTodaysJourneys()` already correctly skipped inactive templates and was already unit-tested for it (Phase 8) — the Phase 8 DECISIONS.md entry's own words were "no UI trigger to attach a cancellation call to," and this is that trigger, nothing more (still not a full recurring-journey *editing* screen, which that same entry ruled out of scope).
3. **The §12.2 debug/dev menu** — force any of the three `src/services/` modules to return a chosen error (exercising §5.1's offline fallback without a real outage), simulate an AT GTFS Realtime delay, manually run §5.2's forecast-drift check against any upcoming journey, and reset onboarding/theme/crash-reporting/default-location state to retest first-run flows without reinstalling. New `src/lib/devOverrides.ts`, one `if (__DEV__) {...}` check added at each service's single existing seam (§12.1's own stated design goal — "exactly one seam per API to intercept").

**Why these needed a decision**: none were bugs — each was a previously-logged, real gap (two explicitly named "Left open"/"no UI trigger" in earlier entries, one an entire unbuilt spec section) rather than something newly discovered. Closing them is a direct judgment call about scope, not a fix.

**Resolution / left open**:
- (1) and (2) are complete as scoped. (1)'s one honest limitation: a never-saved Places result has no stable id, so §5.1's 30-day cached-route-reuse fallback (keyed on `origin.id`/`destination.id`) can never match it — acceptable, since there's no identity to match against, not a bug.
- (3) is **not** fully built: §12.2 point 3, "fast-forward the current date used by recurrence materialization and History's date filter," was deliberately skipped. Every other point is a self-contained toggle read at one seam; this one needs every `new Date()` call site currently standing in for "now" (`materializeToday.ts`, `HistoryScreen`, `TodayScreen`, `leaveBy.ts`, and others) rewritten to read through one shared, overridable clock instead — a real cross-file refactor with real regression risk (a missed call site silently keeps reading the real clock and produces confusing, inconsistent dev-menu behavior), not proportionate to bundle in alongside four independent, low-risk toggles. Also chose a `__DEV__`-gated, visible "Debug menu" row in Settings over §12.2's "shake-to-open" suggestion — the spec offers shake-to-open and long-press as equally-valid examples ("common, low-effort entry points"), and a tappable row is easier to actually use while developing with no production-exposure difference, since `__DEV__` compiles to a literal `false` (and is dead-code-eliminated) in release builds either way.
- Still open after this pass, unchanged from the earlier "did we defer anything else" answer: the OS-scheduled background-task versions of forecast drift / leave-by freeze / the home screen widget (native `expo-dev-client` extension needed, ruled out of scope for this stack), the real Sentry telemetry transport (needs a real vendor account), and the manual/external `PRODUCTION_CHECKLIST.md` items (GCP console access, a real device/Xcode build, real prior-release artifacts to diff against) — none of these are closeable from inside this session regardless of effort.

---

## 2026-07-22 — Real web map picker (react-leaflet + OpenStreetMap); real navigation iconography

**What**: two requested polish passes on top of everything above. First, `LocationPickerMap.web.tsx` — previously a "map picker unavailable on web, use address search or Advanced coordinates" placeholder (2026-07-21 entry above) — is now a real, independently-implemented map: `react-leaflet` + OpenStreetMap tiles, click-or-drag a custom pin (inline SVG, no external marker-image assets), same header/hint/confirm layout as the native version. Second, `MainTabs.tsx`'s bottom-tab icons and Today/Locations header buttons (previously React Navigation's unstyled default tab icon and plain `<Text>Settings</Text>`/`<Text>History</Text>` buttons — that file's own comment had flagged this as a stand-in since Phase 1) now use a real 7-glyph icon set (`NavIcon.tsx`, same stroke-only/24×24-viewBox convention `ClothingTypeIcon.tsx` established), with tab-bar tint/background wired to theme tokens via `screenOptions`.

**Why these needed a decision**: web-map-picker's approach (Leaflet+OSM vs. Google Maps JavaScript API) and the "Settings gets a sliders icon, not a cog" call (Section 9.2.1 above) are both judgment calls with real alternatives, not mechanical fixes.

**Resolution**:
- **Map provider**: chose `react-leaflet` + OpenStreetMap tiles over adding Google Maps JavaScript API as a fourth Google Maps Platform product. Both are viable, but OSM tiles are free/keyless with no budget-alert exposure (docs/02-external-apis.md §2's existing billing-safety-net concern for the Google key), and this project has already shown a preference for free/keyless options where one exists (Open-Meteo over a paid weather API). `react-native-maps` genuinely has no web target at all — this is a real, separate implementation for web, not a shim.
- **CSS delivery**: Leaflet's stylesheet is required for the map to render correctly at all (tile positioning, marker anchoring, control layout) — vendored verbatim into `leafletCss.ts` and injected as an inline `<style>` tag at runtime, rather than `import "leaflet/dist/leaflet.css"` (no established precedent in this project for Metro bundling raw CSS imports — the existing `metro.config.js` precedent, `assetExts.push("wasm")`, solves a different problem and wasn't confirmed to extend cleanly to CSS-as-asset without a real production web build to verify against) or a CDN `<link>` (an unnecessary runtime dependency for something that should otherwise work fully offline once bundled). Verified interactively via Playwright: zoom controls, the custom marker, click-to-move, drag-to-move, and the confirm→reverse-geocode→finish-onboarding flow all work end-to-end; only the OSM tile imagery itself didn't load in the sandboxed dev environment used to verify this (outbound network to `tile.openstreetmap.org` blocked there, same class of restriction as this same sandbox's Open-Meteo calls) — a real deployed build has normal internet access and wasn't expected to hit this.
- **Icon set**: 7 glyphs (today/plan/locations/gear/settings/history/localKnowledge) previewed in isolation (a standalone HTML/SVG page, screenshotted) before wiring into the real app, given hand-authored SVG path coordinates are genuinely risky to get right blind — same lesson as this session's earlier bucket-hat-icon rounds, applied proactively this time instead of after a rejected attempt. Settings uses a sliders/equalizer glyph rather than a literal gear-cog specifically to avoid reading as a second reference to the "Gear" (clothing) tab — the two features share an unfortunate English-language collision ("gear" the settings metaphor vs. "Gear" the clothing inventory) that a literal cog icon would have made worse, not better. Locations' tab icon and Local knowledge's header icon intentionally share the same pin silhouette (Local knowledge's has an added sparkle badge) for visual continuity with `LocationPickerMap`'s own dropped-pin marker, rather than three unrelated pin designs across the app.

---

## 2026-07-22 — Gear icon redrawn from a traced reference SVG; screen-edge whitespace increased 16px → 20px

**What**: two more corrections on the same nav-polish thread. First, the "gear" (hanger) icon above — a hand-drawn hook — went through two more rejected freehand attempts (a curl, then a circle-loop) before the user supplied a reference SVG directly and said to stop guessing coordinates and use it verbatim. `NavIcon.tsx`'s `kind === "gear"` branch now renders that reference path (own viewBox, filled, only the color changed) instead of hand-drawn stroke primitives — the one filled glyph in an otherwise stroke-only set. Second, "buttons and borders are too close to edges": every screen/list/form's screen-edge padding or margin (previously a hardcoded `16` in ~20 separate `StyleSheet.create` calls, no shared constant existed) is now `20`; `MainTabs.tsx`'s bottom tab bar gained explicit `paddingTop`/`paddingBottom: 8`, and the header icon-button row's `gap` went `4`→`8` with a small trailing margin.

**Why this needed a decision**: (1) is a direct instruction to stop iterating and use the supplied asset as-is — not a judgment call, but worth logging *why* the two prior attempts failed (both were reasonable-looking in isolated preview screenshots but still read as "wrong" once the user compared them to a real hanger — hand-tracing a recognizable object from memory is fundamentally riskier than it looks, even with a preview step, when the reference itself was never actually consulted). (2) is a judgment call about scope: which `16`s are "screen-edge distance" (bump) versus "card-internal padding" (leave alone, per docs/09-design-system.md §9.2's own distinction between the two).

**Resolution**: screen-edge padding/margin values were bumped one full step on the existing 4px spacing grid (16→20, `4*5`) everywhere they represent distance from a screen/card/form to the *screen* edge — every `Tab`/`Stack` screen's outer container or list `contentContainerStyle`, `JourneyDetailScreen.tsx`'s several per-section `paddingHorizontal`/`margin` values (it has no single wrapping container), `GearRecommendationCard.tsx`'s card `margin` (not its `padding`), and both `LocationPickerMap` header rows. Left untouched: card-*internal* padding (`RightNowCard` 16px, matching §9.2's card-padding spec; `JourneyCard`/list-row "cards" already at 12px — a pre-existing, unrelated inconsistency not part of this complaint) and `Step1Location.tsx`'s `24px` (already more generous than the old 16px default, correctly proportioned for a single centered onboarding screen, not a list/form). `docs/09-design-system.md` §9.2 updated to `20px` to match. `GearScreen.tsx`'s internal Vehicles/Clothing/Shoes/Umbrellas sub-tab strip was deliberately left flush-edge — that's a full-bleed segmented control (each button already centers its own label within an equal `flex: 1` share), a different, intentional pattern from a screen/card margin, not an oversight.

---

## 2026-07-22 — Corrected the whitespace pass: header buttons need text, not just icons; fixed real button-padding and tab-bar-label bugs the screen-edge bump didn't touch

**What**: the screen-edge whitespace bump above solved the wrong-shaped problem in three specific ways the user then corrected:

1. **Header buttons went icon-only in the same pass** (see the iconography entry above) — the user wants text labels there, not just icons. `TodayHeaderButtons`/`LocalKnowledgeButton` (`MainTabs.tsx`) now render `<Text>Settings</Text>`/`<Text>History</Text>`/`<Text>Local knowledge</Text>` again, with proper `paddingHorizontal` this time (the pre-icon version had none).
2. **A real, separate bug**: the bottom tab bar's labels were being clipped — not just the "Today" label's descender, but (once actually measured) nearly the whole label down to a 7px-tall sliver. Root cause, confirmed via computed styles in a headless-browser inspection: React Navigation's default web tab-bar label wrapper renders with a fixed `height: 7px; overflow: hidden` that `tabBarLabelStyle`'s `fontSize`/`lineHeight` do not control on this platform — this session's earlier `paddingTop`/`paddingBottom`/`height` additions to `tabBarStyle` never had a chance to fix it, since the constraint lives on the inner label element, not the bar. Fixed by bypassing React Navigation's built-in label rendering entirely — each `Tab.Screen` now supplies its own `tabBarLabel` render function (a small `TabLabel` component with an explicit `lineHeight: 14`) instead of relying on `options.title` + `tabBarLabelStyle`.
3. **The actual "buttons too close to edges" example** the user meant all along: the empty-state "+ Add clothing" (and four siblings — Locations, Vehicles, Shoes, Umbrellas) CTA button had `paddingVertical` but no `paddingHorizontal` at all. It went unnoticed in the screen-edge pass because it only manifests visually inside an `alignItems: "center"` empty-state wrapper, where the button hugs its own text width instead of stretching — with zero horizontal padding, the border sits flush against the text. The screen-container padding bump was a real, separate improvement, but it didn't touch this — button-internal padding and screen-edge margin are two different things.

**Why this needed a decision**: (1) and (3) are direct corrections, not judgment calls. (2) is logged because it's a genuine platform bug independent of anything in scope for a "polish" pass, worth a permanent fix and record so a future pass doesn't reintroduce it by going back to `options.title`/`tabBarLabelStyle`.

**Resolution**: `addButton` in `LocationsScreen.tsx`, `ClothingList.tsx`, `ShoeList.tsx`, `UmbrellaList.tsx`, and `VehicleList.tsx` all gained `paddingHorizontal: 20`, matching the screen-edge unit. Verified all three fixes with the same headless-browser screenshot method used throughout this session — the tab bar labels render fully now (confirmed via `getComputedStyle` before/after, not just a visual glance, given how easy this specific bug was to miss by eye at a quick screenshot size), header buttons show real words, and the Gear tab's "+ Add clothing" button now has visible padding on all sides.

---

## 2026-07-22 — Header buttons back to icons, and Settings gets an actual cog

**What**: one more reversal in the same header-button thread — the text-label correction above got overridden again: icons for the header buttons after all, and specifically a real cog/gear-wheel glyph for Settings instead of the sliders icon this session chose earlier (see the nav-iconography entry above, "Settings uses a sliders/equalizer glyph rather than a literal gear-cog specifically to avoid reading as a second reference to the 'Gear' tab"). `TodayHeaderButtons`/`LocalKnowledgeButton` render `NavIcon` again; `NavIcon.tsx`'s `"settings"` case is now two concentric circles + 8 short radial ticks (a standard cog silhouette — center hole, ring, teeth), previewed in isolation against three candidate tooth styles/counts before wiring in, same as every other hand-drawn icon this session.

**Why this needed a decision**: this directly overrides the "avoid the Gear-tab collision" reasoning from the nav-iconography entry — worth flagging explicitly since a future pass might otherwise "fix" it back to sliders on the same reasoning that motivated it the first time. That reasoning wasn't wrong on its own terms, it was just not what was wanted here: an explicit ask for a cog beats an inferred-but-unstated risk of icon confusion.

**Resolution**: cog icon shipped as specified; icon-only header buttons restored. If the Settings/Gear visual-collision concern ever actually causes real user confusion, that's a reason to revisit the *Gear tab's* icon or label, not to quietly walk Settings back to sliders again.

---

## 2026-07-22 — Settings cog traced from a second reference SVG; the bucket-hat mark finally shown inside the app, not just as the OS icon

**What**: two more corrections. First, even the hand-drawn cog above wasn't quite right — the user supplied a second, more detailed reference SVG (a real "Settings" cog with 8 rounded/scalloped teeth, `stroke="#1C274C"`) and asked for it directly, same lesson as the hanger icon: stop hand-drawing recognizable objects, trace the reference. `NavIcon.tsx`'s `"settings"` case now renders that path verbatim (`stroke-width` kept at the reference's own `1.5` rather than forced to this file's usual `~1.8`, since it's copied geometry, not redrawn), with only the color swapped from the reference's hardcoded `#1C274C` to the `color` prop.

Second: "what happened to my bucket hat icon? it should be always shown in the left of the header" — the 2026-07-21 mascot-icon redesign (see that entry) only ever produced OS-level assets (`app.json`'s icon/adaptive-icon/favicon); it was never actually placed anywhere inside the app's own UI, which reads as "disappeared" from the user's side even though the assets always existed. Fixed by cropping `assets/android-icon-foreground.png` (the transparent-background Android adaptive-icon layer, not the opaque `icon.png`) down to its real content bounding box — that source has generous invisible padding baked in for Android's icon-mask safe zone, which would otherwise render as a tiny hat lost inside a mostly-empty box at header size — saved as `assets/header-logo.png`, and wired into `MainTabs.tsx` via `screenOptions.headerLeft` so it appears at the left of the header on all 4 main tabs (not per-screen, so it can't be forgotten on a future tab addition).

**Why this needed a decision**: (1) is the same class of correction as the hanger/first-cog rounds — logged for the pattern, not because it's a new judgment call. (2) is worth recording because the root cause (a real asset that was built but never actually surfaced in-app) is an easy mistake to repeat: "the icon exists in `assets/`" and "the icon is visible somewhere a user will see it" are different claims, and this session conflated them for nearly a full day of work before it was caught.

**Resolution**: both shipped as described; no native-only limitation here (unlike `LocationPickerMap`'s map, `<Image>` with a bundled asset works identically on web and native, verified via the same headless-browser screenshot method used throughout this session).

---

## 2026-07-22 — "Repeats" scoped to Leave-by mode only, not Leave-now/Arrive-by

**What**: the Plan screen's "When" section became a three-way Leave now /
Leave by / Arrive by selector (replacing a single date/time pair that was
always implicitly "leave at"). The existing "Repeats" toggle, which
materializes a recurring `RecurrenceRule.departTimeOfDay` daily, is now
only shown when "Leave by" is selected.

**Why this needed a decision**: "Leave now" has no fixed daily clock time
to repeat — "leave right away, every weekday" isn't a coherent recurrence.
"Arrive by" does have a plausible recurring interpretation ("get to work by
9am every weekday"), but materializing it correctly would mean re-solving
the arrival→departure estimate fresh each morning (duration/traffic vary
day to day), which the recurrence-materialization pipeline (Today tab)
doesn't do today — it just reads `departTimeOfDay` as a fixed string. That's
a separate, larger feature, not a natural extension of this change.

**Resolution**: Repeats is gated to `timeMode === "leave-by"` in
`PlanScreen.tsx`. Recurring "arrive by" journeys are out of scope until the
materialization pipeline can re-solve per-occurrence.

---

## 2026-07-22 — No drive-mode "short dash to the car" umbrella workaround (yet)

**What**: while making umbrella-fallback copy context-aware (rain-shell
substitute, covered-route note), a "you're driving, so you'll only be
exposed for a quick dash to the car" workaround was considered and
rejected for now.

**Why this needed a decision**: it's not buildable with what the pipeline
currently tracks. `planJourney.ts`'s `outdoor` flag is only ever true for
walk/cycle/stationary-wait legs — a `"drive"` leg is never `outdoor`, so no
weather is ever fetched for a pure-drive journey and `recommendGear()`'s
umbrella section (gated on `worstOutdoor`) never even evaluates for one.
Reacting to "you're driving" would need a synthetic walk-to-car leg
modeled into the route, which is a separate, larger routing change, not a
copy tweak.

**Resolution**: left out. If drive-mode weather/gear awareness is ever
built, this is the natural place to add the workaround.

---

## 2026-07-22 — Bottoms recommendation expanded from cold/wet-only to always-on

**What**: `recommendGear()`'s bottoms pick (`§7.13` in the docs) previously
only fired when conditions were wet+windy enough for rain trousers, or cold
enough for thermal ones — otherwise `Recommendation.bottoms` stayed
`undefined` and the card showed nothing. It's now unconditional, matching
how `shoes` already behaves: warm weather prefers a `"shorts"`/`"skirt"`
tagged item, cold prefers `"trousers"`, mild has no strong preference.

**Why this needed a decision**: the docs (`§7.13`) only ever described the
cold/wet trigger — always showing a bottoms row is a real behavior change,
not a bug fix, and worth a record so a future pass doesn't "restore" the
narrower gating thinking it regressed. The cold/wet-specific *notes* (rain
trousers warning, thermal fallback wording) still only fire under their
original conditions — only the unconditional *pick* is new.

**Resolution**: `TagChips.tsx` gained a `BOTTOMS_TAG_OPTIONS` set
(`shorts`/`skirt`/`trousers`/`cycling`/`formal`), wired into
`ClothingForm.tsx` for `type === "bottoms"` items. `pickCandidate()` in
`recommend.ts` is now called unconditionally for bottoms, with
`preferTags` chosen from `warmthLevel`.

---

## 2026-07-22 — Web `JourneyMap` closes the last native-only-map gap

**What**: `JourneyMap.web.tsx` was a placeholder (`"Map preview (native
only)"`) ever since Phase 3, because `react-native-maps` (the native
file's dependency) has no web target at all. It's now a real,
independently-implemented map — `react-leaflet` + OpenStreetMap tiles,
route polyline, per-stop pins, per-leg condition badges, and the
annotation-radius preview circle — mirroring `LocationPickerMap.web.tsx`'s
identical solution to the identical gap on a different screen.

**Why this needed a decision**: this was flagged as a hard technical wall
in earlier entries ("`react-native-maps` has no web target," repeated
across the Locations-CRUD, annotation-UI, and map-picker entries above) —
worth recording explicitly that it never actually was one; the wall is
`react-native-maps` specifically, not "maps on web" in general, and this
session closes the one remaining case nobody had gotten around to yet.

**Resolution**: `pinDivIcon`/`conditionDivIcon` factored out of
`LocationPickerMap.web.tsx`'s local `markerIcon()` into a new shared
`leafletIcons.ts` (both web maps now import from there, avoiding a second
copy of the same inline-SVG pin). Long-press annotation capture (no mouse
equivalent) maps onto a plain click, same substitution
`LocationPickerMap.web.tsx` already established for drag-vs-click. Framing
uses `map.fitBounds()` across all stops rather than a fixed zoom, since a
route can span much further than a single picked pin.

---

## 2026-07-22 — Location-picker pin seeded from the user's real location, not always Auckland

**What**: `LocationPickerMap` (native + web) previously opened on a
hardcoded Auckland-CBD fallback (`{ lat: -36.8485, lng: 174.7633 }`)
whenever the caller didn't already know real coordinates — i.e. every "add
a new location" and onboarding's map-pick path — regardless of whether the
user's actual location was knowable. `useRightNow.ts` (the Today weather
card) already had a GPS → saved-default-location → Auckland fallback
chain solving the identical problem; the picker just never reused it.

IP-based geolocation was raised as a possible extra fallback ahead of
Auckland, specifically avoiding a third-party API if possible. No such
option exists: resolving an IP to a location fundamentally requires either
an external lookup service or a bundled geo-IP database, both outside
"no third party" scope, and GPS (already covered) is strictly more
accurate than either would be. The chain stays GPS → saved default →
Auckland.

**Why this needed a decision**: reusing `useRightNow.ts`'s chain required
extracting it into a shared, callable function first (previously inlined
in that hook) — a small refactor, not just a picker-side fix. The
IP-geolocation question also needed an explicit answer rather than silent
omission, since it was asked about directly.

**Resolution**: new `src/lib/approximateLocation.ts` exports
`resolveApproximateLocation()`; `useRightNow.ts` now calls it instead of
its own inline copy. Both `LocationPickerMap.tsx`/`.web.tsx` call it
whenever `initialCoords` isn't supplied, showing a brief loading spinner
in place of the map until it resolves (simpler than re-centering an
already-mounted map, and typically near-instant — an SQLite read or an
already-granted GPS fix). A resolved real location also opens a bit more
zoomed out than the Auckland fallback (native `latitudeDelta`/
`longitudeDelta` `0.08` vs `0.05`; web `zoom={12}` vs `13`) — room to drag
to a nearby spot without immediately panning, which the generic Auckland
starting point doesn't need.

---

## 2026-07-22 — Live place-name label while dragging the pin, debounced against Geocoding cost

**What**: the location picker never told the user what place they were
pointing at until after confirming — no feedback while dragging/clicking,
and onboarding's "Use my current location" GPS button labeled its result
the bare string `"Current location"` since it never reverse-geocoded at
all. Both now resolve and show a real place name: the picker live-updates
a label as the pin settles, and the GPS button reverse-geocodes before
calling `onDone`, falling back to the old generic string only if that
lookup fails.

**Why this needed a decision**: `reverseGeocode()` is a billable Google
Geocoding API call — firing it on every intermediate drag/click position
(rather than once the pin has actually settled) would multiply cost for
no benefit, so this needed a deliberate debounce, not just a naive
"call it on every marker move."

**Resolution**: both `LocationPickerMap.tsx`/`.web.tsx` wait 700ms after
the marker stops changing before calling `reverseGeocode`, with a
request-id guard (same pattern `AddressAutocomplete.tsx` already uses) so
a slow, stale response can't overwrite a faster, more recent one's label.
`onConfirm` now optionally passes the already-resolved label through to
its caller (`LocationForm.tsx`, `Step1Location.tsx`), which reuse it
instead of calling `reverseGeocode` a second time on confirm — only
falling back to a fresh call if the live resolution never completed (e.g.
a very fast confirm tap).

---

## 2026-07-22 — Journey Detail's map draws the real route, not a straight line

**What**: both `JourneyMap.tsx` (native) and the new `JourneyMap.web.tsx`
only ever drew a straight `Polyline` through `stops` (origin/waypoints/
destination) — never the actual road/track-following geometry, even
though Google Routes already returns real per-leg polylines and this app
already decodes them elsewhere (`conditionMarkersFor()` calls
`decodePolyline()` just to find each leg's midpoint). This wasn't a
Leaflet/web limitation — the native map had the identical gap, since
neither version was ever given the real geometry to draw.

**Why this needed a decision**: fixing this meant deciding how to handle
legs with no polyline of their own (indoor waypoint dwells, synthesized
stationary waits) when concatenating per-leg geometry into one path,
rather than a single code change.

**Resolution**: `JourneyDetailScreen.tsx` now builds
`journey.legs.flatMap((leg) => leg.polyline ? decodePolyline(leg.polyline) : [])`
and passes it to both `JourneyMap` implementations as a new `routePath`
prop, which they draw instead of the straight `stops` line (falling back
to the old straight-line behavior only if `routePath` is empty — e.g. no
live route data). Legs without their own polyline simply contribute
nothing to the path rather than a straight-line bridge — the points
immediately before/after them are already at essentially the same
location (the stop/wait point), so the combined line still reads as
continuous.

---

## 2026-07-22 — Fixed: new-location map picker opened on "Null Island," not Auckland

**What**: `LocationForm.tsx`'s "Add a location" flow opened the pin-drop
map centered at `(0, 0)` — a point in the Gulf of Guinea — instead of
seeding from the user's approximate location (or the Auckland fallback)
like every other picker entry point already did.

**Why this needed a decision**: worth recording because the actual root
cause was two bugs stacked on top of each other, and the more interesting
one wasn't in the map code at all. `LocationForm.tsx` computes
`initialCoords` for the picker from its `lat`/`lng` text fields via
`Number(lat)`/`Number(lng)` — but `Number("")` evaluates to `0`, not
`NaN`. For a brand-new location, those fields start empty, so the
existing `!Number.isNaN(latNum)` check passed and `initialCoords` was
explicitly `{ lat: 0, lng: 0 }` — which `LocationPickerMap` correctly (by
its own logic) treated as "the caller already knows real coordinates,"
skipping `resolveApproximateLocation()` entirely rather than falling back
to it. Diagnosed by temporarily logging `resolveApproximateLocation()`'s
internal branches — the giveaway was that opening the picker produced no
log output at all, meaning the resolution chain was never even called for
this entry point, only for onboarding's map-pick path (which never passes
`initialCoords`). The same `Number("")` bug also affected `canSubmit`,
meaning a location could theoretically be saved with `(0, 0)` coordinates
if a user filled in label/address but never set real coordinates.

**Resolution**: added a `hasValidCoords` check in `LocationForm.tsx` that
requires the `lat`/`lng` fields to be non-empty strings (`.trim() !== ""`)
in addition to the existing NaN check, used for both `initialCoords` and
`canSubmit`. Separately, `approximateLocation.ts`'s
`resolveApproximateLocation()` and the GPS-only `useCurrentLocation()` in
`Step1Location.tsx` both now treat an exact `(0, 0)` result from GPS or
the saved `default_location` setting as invalid and fall through to the
next source in the chain — a genuine defense-in-depth measure independent
of the `LocationForm.tsx` bug, since some browsers/WebViews are known to
resolve geolocation with `(0, 0)` instead of rejecting when the underlying
location provider fails silently.

---

## 2026-07-22 — Web maps switched to CARTO Voyager/Dark Matter basemaps, theme-matched

**What**: `LocationPickerMap.web.tsx` and `JourneyMap.web.tsx` both used
raw OpenStreetMap "Standard" raster tiles — busy, highly-saturated, the
same dense style OSM.org itself uses. Both now use CARTO's free, keyless
basemap tiles instead: "Voyager" (muted, clean) in light mode, "Dark
Matter" (dark, minimal) in dark mode, chosen automatically from
`useTheme()` — the same theme-matched pattern already used everywhere
else in this app, rather than a single fixed style regardless of the
app's own light/dark setting.

**Why this needed a decision**: (1) picking a specific alternative tile
provider/style is a real judgment call, not a mechanical fix; (2) Dark
Matter's default label contrast (muted dark-grey on near-black) was too
low to read comfortably against this app's own dark UI, needing a
deliberate fix rather than shipping it as-is.

**Resolution**: new `src/components/leafletBasemap.ts` exports
`basemapFor(isDark)`, returning the tile URL + shared CARTO/OSM
attribution string for either style — used by both map files so the
provider choice lives in one place. `detectRetina` added to `TileLayer`
for sharper tiles on high-DPI screens (a genuine "modern" win beyond just
the style swap). Dark Matter's legibility problem is fixed with a CSS
filter (`filter: brightness(1.35) contrast(0.85)`), scoped to
`.leaflet-tile-pane` specifically (not the whole map container, so
Leaflet's own UI chrome — zoom buttons, attribution — stays unaffected)
via a `cwp-dark-basemap` class conditionally applied to `MapContainer`,
appended to the existing vendored stylesheet in `leafletCss.ts`. Worth
being explicit about the ceiling here: raster tiles are flattened images,
so this is a uniform brightness/contrast adjustment across the entire
tile layer — there's no way to selectively recolor just the label text
within a raster basemap; a fully custom label color would need a
vector-tile style (e.g. MapLibre GL), a materially bigger dependency
change that wasn't in scope. Same free/keyless posture as the OSM tiles
this replaces — no new billing/API-key surface, same "reasonable use"
expectation already relied on. Verified visually in both themes on both
map screens.

---

## 2026-07-23 — Verified against live API keys: transit rejects waypoints (was a latent 400 bug), AT endpoint confirmed

**What**: with real `EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` and
`EXPO_PUBLIC_AT_SUBSCRIPTION_KEY` now available, exercised the two
integrations that prior sessions never could without keys — Google Routes
TRANSIT-with-waypoints and the AT GTFS Realtime feed — and closed both
"unverified, no live key" caveats with observed behavior.

**Google Routes transit + waypoints (supersedes the 2026-07-20 entry).** The
earlier entry deferred this on the stated assumption that "Google still
routes through the waypoints via `intermediates`" for transit, and only our
own leg-list presentation skipped the indoor dwell legs. **That assumption
was wrong.** A live `computeRoutes` with `travelMode: TRANSIT` and a
non-empty `intermediates` returns HTTP 400 *"Intermediate waypoints are not
supported for TRANSIT travel mode."* Since `routesService.computeRoute`
previously sent `intermediates: (params.waypoints ?? []).map(...)` for *all*
modes, a transit journey with a waypoint would 400 and fail the whole plan
(degrading to the offline fallback) — a latent bug, not just a
presentation gap. **Fix**: `computeRoute` now sends `intermediates: []` for
transit, so a transit journey with waypoints succeeds and is routed
origin→destination directly, with the waypoints simply not honoured. This is
a known limitation (multi-stop transit errands aren't a v1 target — same
narrow-combination reasoning the original entry gave); properly honouring
transit waypoints would need splitting into per-hop `computeRoutes` calls, a
separate larger feature left for later. The `parseTransitSteps` single-leg
assumption (`route.legs?.[0]`) was confirmed correct: transit always returns
exactly one leg with a flat `steps[]` mixing WALK/TRANSIT, and since
intermediates are impossible there is never a multi-leg transit response.
Verified the real `transitDetails` shape matches the existing parser
(`stopDetails.departureStop.name`, `arrivalStop.name`, `departureTime`,
`transitLine.name` — note AT trains carry `name`, e.g. "Sth", but no
`nameShort`, which the `nameShort ?? name` fallback already handles —
and `vehicle.type: "HEAVY_RAIL"`, which maps to `train` via the existing
`=== "BUS" ? "bus" : "train"` rule).

**AT GTFS Realtime endpoint + shape (supersedes the 2026-07-21 entry's
"unverified — no live key" caveat, keeps its best-effort-matching design).**
The endpoint discrepancy is resolved: `api.at.govt.nz/realtime/legacy/tripupdates`
(the constant the code already used) returns HTTP 200 with live data; the
`gtfs/v3/...` path named in the old header comment and docs/02 404s for this
subscription. Corrected the comment and docs/02 §2 to the verified endpoint;
auth is the `Ocp-Apim-Subscription-Key` header. The real feed shape matches
the existing parser exactly: `response.entity[].trip_update`, with
`stop_time_update` returned as a **single object** (not the GTFS-spec array),
carrying a coded `stop_id` (e.g. `"9703-949ea191"`) and `arrival`/`departure`
`delay` in seconds — the object-or-array normalization and `arrival.delay ??
departure.delay` read are both correct. Added a unit test using the exact
live single-object shape. **Per the user's explicit scope choice, kept the
best-effort name-based matching + 5-minute fallback; did NOT build a static
GTFS id-resolution pipeline.** The live data confirms *why* that fallback is
the honest default: AT's real ids (`route_id` like `"PINE-210"`, `stop_id`
like `"9703-949ea191"`) bear no relation to the Google display strings
threaded in (route name `"Sth"`, stop name `"Waitematā Train Station"`), so
matches essentially never land and delays degrade cleanly to the flat
5-minute wait — exactly as designed. (Also observed: the `?route_id=` query
param doesn't actually filter AT's legacy feed — it returns the whole feed
regardless — but the code scans all entities anyway, so this is harmless and
left as-is.)

**Still open, unchanged (not unlocked by keys):** honouring transit
waypoints via per-hop calls; the static-GTFS id pipeline for real AT delay
matching; and everything the earlier entries already list as needing a
native `expo-dev-client` build, a real Sentry account, or GCP-console
access. Separately flagged to the user (a GCP-console task, not code): the
Google key is currently unrestricted and has no budget alert — docs/02 §2
calls for a $5 NZD budget alert and bundle-ID restriction before wide use.

---

## 2026-07-23 — Hot-weather gear now resolves a real owned item (closes the 2026-07-20 deferral)

**What**: `recommendGear()` now resolves the user's own breathable/light top
in hot conditions (`apparentTempC >= HOT_C`) instead of only emitting a text
note — closing the gap logged in the 2026-07-20 "Hot-weather guidance kept
as a note" entry, which flagged it as a real inconsistency with the app's
"recommends your real wardrobe" promise and a natural next step.

**Why this needed a decision**: at the lowest warmth level the layer plan is
empty (`layerPlanForWarmthLevel(0) === []`), so there was no slot to attach a
pick to — the original reason it stayed a note. The fix adds a `breathable`
tag to base-layer (top) items (`BASE_TAG_OPTIONS`, wired into `ClothingForm`)
and, when it's hot, resolves a base top with `preferTags: ["breathable"]`.

**Resolution**: deliberately conservative to avoid over-recommending — a pick
is only surfaced when the user *owns a breathable-tagged top*; otherwise it
falls back to the same guidance note as before rather than inventing a base
layer for someone who only ever tags jackets. When a breathable top is owned
it's named in both the layer list and a note ("your Linen Tee will breathe
better than a heavier top"). Scoped to the lowest warmth level
(`layerTypes.length === 0`), so an AC-contrast summer journey (which forces a
packable mid-layer) is unaffected. Only cold-direction warmth item-matching
existed before; this is the first warm-direction pick. No new `ClothingType`
or engine restructure — reuses the existing `pickCandidate`/`preferTags`
machinery. Unit-tested both paths (owned breathable top named; note fallback
when none owned).

---

## 2026-07-23 — UI/UX polish pass 2: typography tokens not retrofitted repo-wide; map/pin markers kept on emoji icons; clothing icon set sourced from Tabler Icons

**What**: three related scope calls made during a design-focused polish pass (HCI/frontend-designer framing): (1) added real typography/spacing/radius tokens (`src/theme/typography.ts` — `TYPE`/`SPACING`/`RADIUS`) matching `docs/09-design-system.md` §9.2's documented scale, which had never actually been built as code despite the doc describing it — every screen was hardcoding its own raw numbers. Only applied to files this pass otherwise touched (the new `FormRow` component, `GearRecommendationCard`, `SettingsScreen`), not retrofitted across the whole app. (2) Replaced emoji icons with real SVG components (`WeatherIcon`, `ModeIcon`, `EffectIcon`, `ActionIcon`, all in the same 24×24/`strokeWidth 1.8` line-icon convention `NavIcon.tsx`/`ClothingTypeIcon.tsx` already established) everywhere those conditions/modes/effects/actions render as plain React Native `Text`+emoji — except `JourneyMap.tsx`/`.web.tsx`'s map markers (weather condition markers and `EnvironmentAnnotation` pins), which keep the emoji `icon` fields (`WeatherCondition.icon`, the new `EFFECT_MARKER_EMOJI` table). (3) Replaced `ClothingTypeIcon.tsx`'s jacket/base/shoe/umbrella/sunglasses/accessory paths — the originals didn't read clearly at a glance, the jacket glyph in particular not looking like a jacket — with paths adapted from Tabler Icons (github.com/tabler/tabler-icons, MIT, no attribution required), rather than hand-redrawing them again.

**Why these needed a decision**: (1) a full repo-wide token retrofit (every screen's hardcoded font-size/spacing/radius literal) is a mechanical but large change touching dozens of files with no functional bug being fixed — real scope creep for a pass that also had four other substantial goals, and risks regressions in files this pass had no other reason to touch. (2) map markers render into a native `react-native-maps` `Marker` child / a Leaflet HTML-string icon respectively — both fundamentally different rendering paths from the RN component tree the other icon call sites use, so embedding a real SVG there is materially more implementation work for a small pin/marker glyph than the same swap anywhere else. (3) `ClothingTypeIcon.tsx`'s own file comment previously described its hand-drawn paths as an intentional, considered design (docs/09-design-system.md §9.3), so replacing them — rather than tweaking — needed to be a stated call, and picking an external source is the kind of judgment call (which library, which license, why not redraw again) this log exists for.

**Resolution**: (1) `TYPE`/`SPACING`/`RADIUS` exist now as real, importable tokens and every file this pass touched was built against them; a future pass doing pure token-migration work (no other functional change) is the natural place to extend that to every remaining screen, rather than bundling it here. (2) `WeatherCondition.icon` and the new `EFFECT_MARKER_EMOJI` lookup (`src/screens/local-knowledge/effectMeta.ts`) are kept specifically for map-marker use — every other consumer (`RightNowCard`, `JourneyCard`, `LegRow`, the Local knowledge list, `AnnotationForm`) now uses the real icon components instead. Revisit map markers if/when the map layer itself gets more design investment. (3) `ClothingTypeIcon.tsx`'s file comment now documents which kinds are Tabler-derived (jacket/base/shoe/umbrella/sunglasses/accessory/vehicle) vs. hand-drawn (midlayer/bottoms — simple enough silhouettes not to need an external source), and only path geometry was reused — the component still applies its own `strokeWidth`/colour at render time, not Tabler's source styling.

---

## 2026-07-23 — Fixed: a fresh git worktree can't run `expo start --web` (no `.env`, no `node_modules`); added COOP/COEP headers for `expo-sqlite`'s web worker

**What**: this session ran inside a git worktree (`.claude/worktrees/ui-ux-polish-components-f1d52f`), a separate working directory that shares git history with the main checkout but **not** untracked files. Two untracked things the app depends on were missing here and had to be diagnosed and fixed mid-session: (1) no `.env` (so `EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` was unset — address autocomplete silently returned nothing), and (2) no `node_modules` directory at all in this worktree. (2) was the more serious one: Node's module resolution walks up parent directories to find `node_modules`, so ordinary `import`/`require` calls (and thus the main app bundle, `tsc`, and `jest`) all worked fine by resolving into the main checkout's `node_modules` — but `expo-sqlite`'s web backend fetches its DB Worker script via a literal server-relative URL (`/node_modules/expo-sqlite/web/worker.bundle`), which Metro's dev server maps straight onto disk **under this worktree's own root**, not via Node's resolution algorithm. With no local `node_modules`, that specific request 404'd, the Worker never loaded, and `getDb()` (`src/db/index.ts`) hung forever waiting on a response that would never come — since that promise is memoized, the *first* hang broke every DB read for the rest of the session (Today's cards, the map picker's location resolution, all of it), which is what actually surfaced as "the map isn't loading" and "Today content isn't loading." Separately (and not the actual cause of the hang, but a real secondary gap found while investigating): `window.crossOriginIsolated` was `false` in this dev server, so `SharedArrayBuffer` — which `expo-sqlite`'s worker protocol uses for its synchronous message channel — was unavailable.

**Why this needed a decision**: none of this is a code bug in the app — it's environment setup specific to working in a worktree, easy to hit again (this exact worktree, or any future one) and non-obvious to diagnose (the symptom is a silent, indefinite hang with no thrown error, not a crash), so it's worth a durable note rather than re-diagnosing from scratch next time.

**Resolution / how to fix, for the next worktree that hits this**:
- **Missing `.env`**: copy (or better, symlink) the real `.env` from the main checkout into the new worktree — it's gitignored, so a fresh worktree never gets one automatically:
  ```bash
  cp "<main-checkout>/.env" "<worktree>/.env"
  ```
- **Missing `node_modules`**: create a directory junction pointing at the main checkout's `node_modules` (an actual `npm install` per worktree also works, but duplicates the entire dependency tree for no benefit here since this is the same `package-lock.json`). On Windows, a plain symlink (`mklink /D`) needs elevated privileges; a junction (`mklink /J`) doesn't — created from PowerShell (Git Bash mangled the target path when passed through `cmd //c`, an unrelated quirk worth knowing about):
  ```powershell
  cmd /c 'mklink /J "<worktree>\node_modules" "<main-checkout>\node_modules"'
  ```
  Restart the dev server after creating it — Metro caches module resolution at startup.
- **`crossOriginIsolated: false`**: added a fix in `metro.config.js` regardless, since it's a real gap independent of the `node_modules` issue and cheap to keep — patches `http.ServerResponse.prototype.writeHead` to add `Cross-Origin-Opener-Policy: same-origin` / `Cross-Origin-Embedder-Policy: credentialless` to every response. Metro's own `server.enhanceMiddleware` config hook was tried first and looked like the "proper" fix, but only wraps Metro's bundle-serving middleware — the HTML document itself is served by a separate Expo Router manifest middleware that never passes through it (verified directly: the JS bundle response got the headers, the HTML document didn't). `credentialless` (not `require-corp`) was chosen so third-party resources this app loads (CARTO map tiles, Google Places/Routes responses) don't need to opt in with their own `Cross-Origin-Resource-Policy` header to keep loading.
- Both the `.env` copy and the `node_modules` junction are local-machine state, not tracked by git — they don't affect other worktrees, collaborators, or CI, and need to be redone if this worktree is ever deleted and recreated.

---

## 2026-07-23 — User-reported fixes batch: Today refresh throttle, real suburb label, 12h/24h time setting, placeholder contrast, Plan screen (dead "More modes" alert, hourly-strip detail/legend, frozen gear-card icons, user-editable return time + rain-shower suggestion)

**What**: a single batch of eight user-reported issues, fixed together:

1. **`useRightNow.ts`** — `RightNowCard` refetched weather/recommendation on every Today-tab focus with no staleness check. Added a module-level cache (`fetchedAt` timestamp, 5-minute `REFRESH_INTERVAL_MS`) — a focus within the window reuses the cached `RightNowState` instead of re-hitting Open-Meteo.
2. **"Example — Auckland"** (`RightNowCard.tsx`) was a hardcoded string shown only for the Auckland GPS/default-location fallback, not a real place name. `placesService.ts` gained `reverseGeocodeSuburb()` (parses `address_components` for `sublocality`/`locality`, falling back to the formatted address's first segment), called once per location resolve in `useRightNow.ts` and rendered unconditionally (real location or fallback alike) as `suburb`.
3. **24h vs 12h time.** Every `toLocaleTimeString(undefined, {...})` call site let the device/browser locale silently decide the format. Added `TimeFormatPreference` (`db/repositories/settings.ts`, mirroring `ThemePreference`'s shape exactly) defaulting to `"12h"`, a `useTimeFormatStore` Zustand store (mirroring `useThemeStore`) so every screen re-renders together on change, and a shared `src/lib/formatTime.ts` used by all 5 call sites (`RightNowCard`, `JourneyCard`, `HistoryRow`, `LegRow`, `HourlyStrip`) instead of each formatting independently. New Settings "Time format" section, same segmented-control pattern as Appearance.
4. **TextInput placeholders** rendered at close to the same opacity/color as real input text on web (no `placeholderTextColor` set, so it fell back to RN-web's default). Added `placeholderTextColor={theme.textSecondary}` to every `TextInput` missing it (~15 files) — `AddressAutocomplete.tsx` already had this right and was the pattern copied.
5. **"More modes" button did nothing.** It was wired to `showAlert(...)`, which on web routes to `window.alert()` — not literally broken, but `window.alert` is a blocking synchronous dialog that's unreliable across embedded/automated browser contexts (confirmed: no dialog appeared in this session's own preview browser) and was already a poor fit for calmly informational copy per the voice guide (§9.0.1 — no interruptive "Oops"-style modals). Replaced with a plain inline disclosure (tap toggles a `Text` note below the row) — no alert dependency at all, so it can't silently fail to appear.
6. **Hourly rain strip** (`HourlyStrip.tsx`/`RainGauge.tsx`) showed an unlabeled row of bare rain droplets — no section heading, no indication of what the droplet height meant, no non-rain condition info. Added a "Hourly outlook" title, extended `HourlyReading` (`weatherService.ts`) with `precipMm`/`windKph` so each hour can run through the existing `classifyWeather()`, gave `RainGauge` an optional condition icon (`WeatherIcon`) and temperature above the droplet, and added a compact two-row legend (droplet-fill buckets: Dry/Light/Moderate/Heavy; condition icons: Sunny/Cloudy/Windy/Storm) below the strip.
7. **Frozen `GearRecommendationCard` snapshot view had no icons**, unlike the live view — not a routing bug (confirmed: both outbound and return journeys use the identical `snapshot ?? recommendation` branch in `JourneyDetailScreen.tsx`, keyed only on whether that journey's own leave-by time has passed), just a real, pre-existing gap: `RecommendationSnapshot.layerNames` was flat strings with no type info to pick an icon from. Added an optional `layerTypes?: ClothingType[]` field (index-matched to `layerNames`, additive/backward-compatible — old rows without it just render icon-less exactly as before), populated in `toRecommendationSnapshot()` (`wearTracking.ts`) from the live `Recommendation` at freeze time. Accessory/shoe/umbrella icons in the snapshot branch needed no new data at all — `accessoryIconKind()` already works from the name string alone, and shoe/umbrella icons are fixed kinds.
8. **Return-trip time was a hardcoded `+8h` mock**, never actually user-editable despite the toggle implying it was a real setting. Added return date/time `TextInput`s (same `YYYY-MM-DD`/`HH:mm` pattern as the outbound fields), seeded once to `+8h` from the outbound time when the toggle is switched on (editable freely from there), plus a new `findRainWindowNear()` (`src/lib/weather.ts`) that scans the destination's hourly forecast for the nearest med/high-rain run within 2 hours of the chosen return time and — if found — shows a non-blocking inline suggestion ("Rain expected 5:00 pm–6:00 pm near your return time — consider leaving before/after…"), reusing `HourlyStrip`/`getHourlyForecast` rather than inventing a second data path.

**Why these needed a decision**: (5) is the only one where the "obvious" read (button is dead) turned out to be a different problem (an unreliable alert mechanism) than it first appeared — worth recording since a future contributor re-diagnosing "More modes" from scratch might reach for `Alert.alert` compatibility again instead of just removing the alert dependency outright. (7) needed confirming there wasn't a *routing* bug (return trip vs. outbound trip rendering different components) before deciding a *data* gap was the real fix — a wrong diagnosis here would have "fixed" the wrong branch. (8) is a real feature addition (a rain-window scan didn't exist anywhere in the codebase before this), not a bug fix, so it's flagged as new engine surface, same as any other `src/lib/weather.ts` addition would be.

**Resolution**: all eight shipped in the same pass; `findRainWindowNear()` got 5 unit tests (`weather.test.ts`) alongside the existing table-driven style for `classifyWeather`/`rainIntensityBucket`. No DB migration needed anywhere (`app_settings` is a flat key/value table; `RecommendationSnapshot` is a JSON blob column) — both new fields are purely additive. Verified live in the browser: suburb label, throttled refetch (cache reused within 5 minutes), time-format toggle propagating instantly across Today/Plan without a reload, placeholder contrast, the inline "More modes" note, the hourly legend + per-hour icons, and the return-trip rain suggestion actually firing against a real forecast window.

---

## 2026-07-23 — Follow-up polish on the fixes batch above: card-separated hourly outlook, lighter light-rain fill, return-section visual nesting, and a real isolation check for the rain-shower suggestion

**What**: four related refinements to the same-day fixes batch:

1. **`HourlyStrip.tsx`** — the outlook (title + scrollable droplet row) now sits in its own elevated card (`cardElevationStyle`, `surfaceRaised`), with the "Key" legend rendered *below and outside* that card under its own small "KEY" heading, instead of both blending into one flat block.
2. **`RainGauge.tsx`** — "low" (Light) intensity now fills at reduced opacity (0.45) instead of the same full-strength `conditionRain` blue "med" (Moderate) uses — the two were previously indistinguishable except by fill height. Opacity rather than a second hex value, so it stays in sync with `conditionRain` automatically in both themes if that token ever changes.
3. **`PlanScreen.tsx`** — the "Plan return trip too" toggle and its return-time content (date/time fields, the return leg's own `HourlyStrip`, the rain suggestion) now share one card (`returnCard`), with the expanded content separated from the switch row by an internal divider rather than the toggle and a separately-margined block underneath it. The shared card boundary is what reads as "this belongs to this toggle" — same reasoning as Settings' Advanced-disclosure body staying inside its own section.
4. **`findRainWindowNear()`** (`src/lib/weather.ts`) had a real logic bug, caught by the user rather than by the unit tests written for it: it suggested "leave before X or after Y" for *any* nearby med/high rain run, including one that ran off the edge of the fetched data — i.e. possibly just the visible slice of a longer, non-isolated rain spell, where leaving earlier *or* later would still mean getting wet. Fixed to only surface a suggestion when the rain run has a confirmed dry (or low-intensity) reading immediately before its start *and* immediately after its end — a genuine isolated shower with an escape route on both sides. `PlanScreen.tsx`'s fetch window was widened by `RETURN_RAIN_FETCH_PADDING_HOURS` (2h) beyond the actual `RETURN_RAIN_LOOKAROUND_HOURS` search radius specifically so a shower sitting near the edge of the lookaround window still has real data past it to confirm dryness against, rather than failing the isolation check purely for lack of fetched hours.

**Why this needed a decision**: (4) is the interesting one — the original 5 unit tests all passed and looked reasonable in isolation (nearest-rain-run-within-range is a sensible-sounding rule), but none of them constructed a case where the "found" run wasn't actually bounded by dry weather, so the bug shipped clean through tests and typecheck. Worth recording as a reminder that a function returning a *plausible* value isn't the same as a function whose stated behavior (in this case, "safe to leave earlier or later") is actually true of every value it can return — the test suite needed cases designed to catch the claim, not just the mechanics.

**Resolution**: 4 new unit tests added specifically for the non-isolated cases (rain running off the start of the data, off the end, continuous rain spanning the target, and a control case confirming an isolated shower is still found correctly when a separate non-isolated spell exists further away). All 9 `findRainWindowNear` tests and the full 270-test suite pass; `tsc --noEmit` clean. Verified live: the outlook card and legend separation, the visibly lighter "Light" droplet fill, the return section's shared-card nesting, and — for the isolation fix — that a continuous multi-hour rain spell no longer produces a "leave before/after" suggestion while a genuine isolated shower still does.

---

## 2026-07-23 — Clarified the carry-preference control, containerized the gear/location/annotation forms into sections, and fixed the header back button's edge margin

**What**: three more user-reported usability issues:

1. **The "avoid spares" carry-preference control was unclear.** Both `PlanScreen.tsx` and `SettingsScreen.tsx` rendered it as a single Pressable chip that silently cycled between two states on tap, showing only its *current* state's raw value name ("No preference" / "Avoid spares") with no label explaining what the control even was — PlanScreen's copy had no heading or description at all. Replaced in both places with a proper two-option segmented control (matching the Appearance/Time-format/Wind-sensitivity segment pattern already used elsewhere), both options always visible, plus a label ("Spare layer" on Plan, "Carrying a spare layer" on Settings, unchanged) and a plain-language one-line description of what it does (§7.9: whether `recommendGear()` suggests packing a removable layer for AC-contrast rides). Relabelled the two options themselves too — "Pack a spare" / "Skip it" — since the old labels were the internal `CarryPreference` value names verbatim, not a description of the choice.
2. **Gear/location/annotation add-edit forms read like a flat website form**, not a mobile screen — one long unbroken column of labels and inputs with no visual grouping (`ClothingForm`, `ShoeForm`, `UmbrellaForm`, `VehicleForm`, `LocationForm`, `AnnotationForm`). Added `src/components/FormSection.tsx` (title + card, same visual language as `SettingsScreen`'s `sectionCard`) and grouped each form's fields by what they're actually deciding together — e.g. `ClothingForm`: "Basics" (photo/name), "Type & warmth", "Properties" (waterproof/windproof/packable/tags); `LocationForm`: "Location" (label/address/map picker/advanced coordinates), "Preferences" (favorite/climate override); `AnnotationForm`: "What's special about this spot?", "Range", "Details". Primary Save/Cancel actions and destructive/secondary actions (delete, mark unavailable) deliberately stay outside the cards, at the bottom, unboxed — those are page-level actions, not part of any one section's decision.
3. **The header back button sat flush against the screen's left edge** on web — no built-in safe-area inset the way a native header usually provides. Added `headerLeftContainerStyle: { paddingLeft: 20 }` to `RootNavigator.tsx`'s shared `screenOptions`, matching the 20px screen-edge margin used everywhere else in the app (§9.2) — one change covers every pushed screen's header consistently, rather than patching `HeaderBackButton.tsx` itself (which has no way to know it's specifically the header's *left* edge that needs the inset).

**Why these needed a decision**: (1) is worth noting because the bug wasn't the underlying logic (the engine-level `CarryPreference` behavior was already correct and tested) — it was purely a labeling/discoverability gap that's easy to miss in review since the control "works," it's just unclear what it does. (2) is a real design-system extension (a new shared component), not a one-off fix, so it's logged as a pattern other forms should follow going forward rather than a per-file tweak.

**Resolution**: all three shipped together. `tsc --noEmit` and the full 270-test suite pass (no logic changes, so no new tests needed). Verified live: the segmented spare-layer control on both Plan and Settings with visible descriptions, all six forms rendering their fields as distinct elevated cards (confirmed via computed style — real background/radius/shadow per section, not just visual spacing), and the back button's left edge sitting at the standard 20px margin instead of flush against the screen edge.

---

## 2026-07-26 — Plan screen: containerized into sections, route timeline visual, fixed a real "Add a stop" bug, night icon for the hourly outlook, bookmark toggle for "Save this route"

**What**: five more Plan-screen fixes, found while extending the previous pass's form-containerization work to `PlanScreen.tsx` itself (it was the one form-like screen the earlier "containerize the forms" pass hadn't reached):

1. **`PlanScreen.tsx` containerized** into `FormSection` cards — "Route" (start/stops/destination), "When" (time mode, date/time, hourly outlook, repeats), "Mode" (mode chips, more-modes disclosure), "Preferences" (formal occasion, spare layer, save-this-route). The return-trip block keeps its own existing custom card (already a card, already had its own toggle-driven disclosure) rather than being force-fit into `FormSection`.
2. **Route timeline visual** — origin/stops/destination previously rendered as an unordered stack of independent picker fields (destination even rendered *before* the waypoint rows, despite waypoints sitting geographically between origin and destination). Reordered to Origin → Stops → Destination and added a left-hand rail: a filled dot for the origin, an outlined dot per stop, a pin icon for the destination, connected by a dashed vertical line — so the row of separate fields reads as one continuous route.
3. **"Add a stop" was a real bug, not just a missing visual.** `addStop()` required an existing saved location to seed the new row with (`setWaypoints(current => [...current, locations[0]])`) and, when none existed, fired a `showAlert()` — which, per the earlier "More modes" entry, is a `window.alert()` on web that's unreliable in some browser contexts. For anyone without saved locations yet (e.g. a fresh install), tapping "Add a stop" did visibly nothing. Fixed by letting a waypoint start `undefined` — the exact same "unset until chosen" convention origin/destination already used, which `SavedLocationPicker` already renders correctly (a placeholder, not a crash). `waypoints` is now `(SavedLocation | undefined)[]`; unset entries are filtered out immediately before either `planJourney()` call.
4. **Hourly outlook showed a bright sun icon at 9pm.** `weatherIconKindFor()` only ever looked at `classifyWeather()`'s label, with no notion of time-of-day — a "Dry" reading at any hour rendered as `sun`. Open-Meteo's hourly response already includes `is_day` (used elsewhere for `WeatherSnapshot.isDaylight`) but `HourlyReading` never captured it. Added `isDaylight: boolean` to `HourlyReading`, added a new `moon` `WeatherIconKind` (crescent + sparkle, same hand-drawn stroke convention), and gave `weatherIconKindFor()` an optional second `isDaylight` parameter that swaps `sun`→`moon` when explicitly `false`. Parameter is optional so `RightNowCard`/`JourneyCard`/`LegRow` (all built from a "right now" `WeatherSnapshot`, where the sun icon is only ever wrong for a few minutes around actual sunrise/sunset) needed no changes — this is scoped to the hourly outlook specifically, per the reported issue; those other call sites are a natural follow-up if it turns out to matter there too, not done here. Added a "Clear" entry next to "Sunny" in the legend.
5. **"Save this route" was a bare `Switch`**, inconsistent with the fact that what it actually does is bookmark the route for reuse (the saved-route chips at the top of Plan). Replaced with a tappable bookmark icon (outline when off, solid `accentWalk` when on) — same toggle mechanic as the favorite-star pattern already used on saved locations. Added a `bookmark` kind to `ActionIcon.tsx` and generalized its existing `filled` prop (previously hardcoded to only work for `"star"`) to a small `FILLABLE_KINDS` set covering both.

**Why these needed a decision**: (3) is the one worth flagging specifically — it looked like it could be a simple "add a visual" request, but tracing `addStop()` turned up a genuine functional bug with a real root cause (an alert mechanism already known to be unreliable, per the earlier "More modes" entry), not just missing polish. (4)'s scoping decision (hourly outlook only, not the other weather-icon call sites) is a deliberate narrow fix matching what was actually reported, logged so a future pass doesn't have to re-derive whether the other call sites were considered and rejected, or just never noticed.

**Resolution**: all five shipped together. `tsc --noEmit` and the full 270-test suite pass. Verified live: Route/When/Mode/Preferences section cards rendering with real backgrounds, a dashed connector line spanning the route rail, "Add a stop" immediately inserting a placeholder "Stop 1" row (confirmed against a fresh install with zero saved locations — the exact case that used to fail silently), the moon icon rendering for a 1am reading vs. the sun icon for an 11am reading in the same strip, and the bookmark icon switching from outline to solid-`accentWalk`-filled on tap.

---

## 2026-07-27 — Maps pass: native route framing, web click/scroll hijacking, shared picker state, locate button, themed basemaps

**What**: a reported "the maps aren't working very well and aren't very
polished" pass over both map surfaces — Journey Detail's route map
(`JourneyMap.tsx` / `.web.tsx`) and the location picker
(`LocationPickerMap.tsx` / `.web.tsx`, used by `LocationForm.tsx` and
onboarding's `Step1Location.tsx`), plus the Plan screen's route rail that
the map markers now echo. Eleven changes, in rough order of how
badly each one hurt:

1. **The native route map never framed the route.** It opened on
   `initialRegion` = the *first stop* with a fixed `0.05` delta and never
   moved again, so anything longer than a couple of kilometres ran off the
   edge, and a re-plan (forecast drift) or a newly saved annotation
   couldn't move it at all — `initialRegion` is mount-only. The web map has
   had `fitBounds()` since it was written; the native side was simply never
   given the equivalent. Now: `initialRegion` is computed from the whole
   route's extent, `onMapReady` plus an extent-keyed effect call
   `fitToCoordinates()` with edge padding, and the framed set includes
   saved annotations sitting *off* the path, not just the path itself.
2. **The first fit no longer animates, on either platform.** Fitting over
   the top of the initial region with an animation means the map visibly
   lurches from "zoomed in on the origin" to the real route on every open —
   and stays mis-framed until the animation finishes, which in a
   backgrounded tab can be a long time. Only a later re-fit (a re-plan, a
   new spot) animates, where the movement is the information.
3. **A plain left-click on the web route map opened the add-a-spot sheet.**
   Section 4.5's capture gesture is a long-press on native; the web file had
   mapped it onto `click`, so every attempt to click the map at all threw
   the annotation sheet open uninvited. Moved to `contextmenu` — right-click
   on a desktop, press-and-hold on a touchscreen — and added a hint chip on
   *both* platforms, since neither gesture is one anybody guesses at
   (Section 4.5's flow previously had no affordance anywhere on the screen).
4. **Scroll-wheel over the web route map hijacked the page scroll.** That
   map sits inside Journey Detail's vertical scroll view; Leaflet's default
   `scrollWheelZoom` meant scrolling past it zoomed the map instead. Off now
   — zoom buttons, double-click and pinch all still work.
5. **Annotation overlays were nested inside a plain `<View>`** on the native
   map (one wrapper per annotation, holding its `Circle` + `Marker`). Both
   platform backends do recurse into non-map children via `reactSubviews`,
   but that is the legacy paper path — RN 0.86 is Fabric-only, and
   `RNMapsMapView`'s `mountChildComponentView` hands a plain view straight
   through, so this was at best relying on an unspecified fallback.
   Flattened into two direct passes, the shape the web map already used.
6. **A "use my current location" button** on both pickers. The picker
   dropped you at a seeded pin with no way back to yourself — pan away
   looking for a spot and your own position was unrecoverable without
   cancelling out and reopening. Unlike the existing seeding chain (which
   never prompts, by design — `approximateLocation.ts`), this is an explicit
   user action, so it may ask for the permission, and it recenters the map,
   which a tap or drag deliberately does not.
7. **The picker's status line stopped jumping.** It rotated between a
   spinner, a resolved address, and *nothing at all* if the lookup failed —
   three different heights, so the map jumped on every pin move, and a
   failed reverse-geocode left no confirmation of anything. Now always
   exactly one line: the address if there is one, the coordinates otherwise.
8. **Native basemaps follow the app theme.** The web maps have swapped CARTO
   Voyager for Dark Matter with the theme since they were written; a native
   map in the dark theme was a white rectangle. `mapDarkStyle.ts`
   (Android/Google `customMapStyle`) plus `userInterfaceStyle` (iOS/Apple,
   which ignores `customMapStyle` entirely) covers both. Leaflet's own
   chrome — the zoom stack and attribution strip, hardcoded white in the
   vendored stylesheet — is themed to match in `leafletCss.ts`.
9. **Start, stops and destination were the same marker.** All three rendered
   as one teardrop pin (`pinDivIcon` on web, `pinColor` on native), so a
   multi-stop journey was a row of identical markers with nothing saying
   which end was which or what order the middle ones came in. They now reuse
   PlanScreen's route-rail vocabulary — a filled dot for the origin, an
   outlined dot for each stop, the pin kept for the destination — so the rail
   the journey was built on and the map it's read back from say the same
   thing. The map's stops are additionally numbered, which the rail doesn't
   need: down a page the stops are already in reading order, but scattered
   across a map "which stop is this" has no other answer.
10. **The Plan screen's route rail broke above every marker.** Each marker
    was pushed to its 34px baseline by a `marginTop` on the marker itself,
    so the dashed line simply stopped at the bottom of one row and restarted
    34px into the next — a ~50px hole above every dot, and the destination
    was worse still: it had no dashed segment in its own row at all, so the
    pin floated under a 50px void *and* sat 34px higher than every dot above
    it. That offset now comes from a lead segment *above* each marker
    instead, dashed for anything the route arrives at and blank for the
    origin (nothing precedes the start of a route), with a negative top
    margin bridging `FormSection`'s 12px row gap. Every gap in the rail is
    now the same 4px, origin to destination.
11. Smaller: a route-line casing so the stroke stays legible where it crosses
   same-colored roads; `tracksViewChanges` managed rather than left on
   (custom-view markers re-rasterize every render otherwise, which is what
   made the native map stutter); `title`/`accessibilityLabel` on every
   marker, so a condition badge says which leg it belongs to instead of
   being an unexplained colored dot; `toolbarEnabled={false}`,
   `moveOnMarkerPress={false}` and pitch/rotate off on native; safe-area
   insets on the picker's full-screen modal (its header sat under the
   notch); a double-click on the web picker no longer drags the pin to
   wherever you were zooming; and `LocationForm`'s "Pick on map" is a real
   bordered button rather than a bare text link between two full-width
   fields.

**Why these needed a decision**:

- **`contextmenu` over a hand-rolled long-press timer** for (3). A
  press-and-hold timer on `mousedown` would mimic native more literally, but
  `contextmenu` *is* the browser's long-press: it already fires on
  touch-hold, it's what users reach for, and it costs no timing threshold
  that has to be tuned against drag-to-pan. The cost is that it's
  undiscoverable on desktop, which is what the hint chip is for.
- **`ResizeObserver` rather than a window `resize` listener** for
  re-measuring the web maps. Leaflet measures its container once at mount
  and renders grey gutters if that size later changes. The window event
  fires *before* react-native-web has re-laid the flex box out, so a fit
  driven by it measures the old size and leaves the route running off the
  edge — observing the element is the only ordering that works.
- **A shared `useLocationPicker.ts`** rather than leaving the two platform
  files with their own copies of seeding plus debounced geocoding. They had
  already drifted: web reset off `visible` with cancellation, native off
  `Modal`'s `onShow` without. Adding the locate button to both would have
  been a third copy of the same logic.
- **Borrowing the rail's shapes for the map markers** rather than inventing
  a third set for (9). The rail and the map are two views of the same route
  — the shapes are the only thing that can carry that across, since nothing
  else about the two screens looks alike. It also fixes the vocabulary in
  one place: a future fourth surface has an obvious thing to copy.
- **Fixing (10) for every marker, not just the destination**, which is what
  was actually reported. Adding a lead segment under the pin alone would
  have left it as the one marker on a continuous line while the dots above
  kept their holes — a *new* inconsistency, in the name of fixing an old
  one. The cause was the same `marginTop` in all three cases, so it was one
  fix applied three times, not scope creep.
- The `0.05`/`0.08` and `12`/`13` seeded-vs-fallback zoom split from the
  2026-07-22 picker entry above is **kept**, not superseded by the
  route-framing work — it's about the *picker's* starting point, which is a
  single pin with no extent to fit against.

**Resolution**: new `src/lib/mapGeometry.ts` (pure framing/color helpers, 19
unit tests — `regionForCoordinates` is the native counterpart to
`fitBounds`, and `boundsKey` replaces `JSON.stringify`-ing a thousand-point
polyline on every render just to detect a change that only its bounding box
can express), `src/components/useLocationPicker.ts`,
`src/components/useLeafletCss.ts` (both web maps carried a byte-identical
copy of the stylesheet-injection effect), `src/components/mapDarkStyle.ts`,
and a `crosshair` kind on `ActionIcon`. `tsc --noEmit`, `expo lint` and the
full suite (829 tests, 67 suites) pass.

Verified live in the browser against a real planned Auckland journey: the
route framed with symmetric insets at both 1265px and 375px container widths
with every marker inside the box (it opened centered on the origin before);
the real Google-routed polyline drawn with its casing; on a Home → Work →
Home route, three visibly distinct stop markers — an 18px filled accent
circle, a 20px outlined circle reading "1", and the teardrop pin — each with
its own `title` tooltip, alongside the weather-colored condition badges;
left-click and scroll-wheel both inert over the map; right-click opening the
sheet and rendering the radius preview in `annotationPin`; the hint chip
hiding itself while that sheet is open. On the Plan rail with three stops,
every gap measured 4px from the origin dot to the destination pin (it was
4px inside a row and ~50px between rows). On the picker: tiles and dark
chrome (zoom stack
`#1F2447`, dark attribution), a single click moving the pin and re-resolving
the address, a double-click *not* moving it, the locate button at 44x44
above Leaflet's panes, and the confirm to address to lat/lng handoff into
`LocationForm` with no second Geocoding call.

Two things could **not** be verified in that environment and rest on reading
alone: everything native (no simulator here — items 1, 5, 8 and the native
half of 2, 9 and 11), and the `ResizeObserver` re-fit, because the headless
preview pane never composites a frame and both `ResizeObserver` callbacks
and `requestAnimationFrame` are delivered on the frame loop. The framing
maths behind the native fit is what `mapGeometry.test.ts` covers directly.

---

## 2026-07-27 — Route-rail markers centred on the field box; origin pin, destination flag (§9.4)

**What**: PlanScreen's origin/stop/destination markers now sit on the vertical
centre of each picker's input field instead of 34px down (its top edge), and
the route's two ends are a teardrop pin (origin) and a flag in a filled disc
(destination) — replacing the filled accent dot that used to mark the origin,
on the rail, on `leafletIcons.ts` and on `JourneyMap.tsx`'s native markers.

**Why**: the 34px baseline the 2026-07-26 timeline entry established reads as
each marker labelling the *gap above* its input rather than the input itself.
And with a circle for every stop, a third circular shape gave the route's ends
the least distinctive silhouettes on the map. The flag went to the origin
first and was moved: a flag reads as a *finish* line, so it belongs at the end.

**Resolution**: the offset is now derived from two named constants in
PlanScreen (`PICKER_FIELD_CENTER_Y`, `MARKER_BOX`) rather than a literal, and
every marker is centred in one shared fixed-height box, so a future marker of
any size needs no new lead-height maths. `PICKER_FIELD_CENTER_Y` encodes
SavedLocationPicker's label+field metrics — re-derive it there, don't nudge
individual spacers. The flag lives in `ActionIcon` as `flag` and is on
`FILLABLE_KINDS` because a hollow banner is illegible at marker size; the
three surfaces that draw it are listed in `flagDivIcon`'s comment and must
stay in step. Note the native map inverts which end gets a custom view: the
origin is now the platform `pinColor` marker and the destination the custom
flag badge, so a single-coordinate journey renders as a plain pin.

---

---

## 2026-07-27 — Hourly outlook rebuilt per-location with route ETAs; icons resolved from the raw WMO code (§9.5)

**What**: the Plan screen's single unlabelled origin strip is now one card per
location — origin and each stop showing the one hour they're there, the
destination a full strip — plus a right-side "Full outlook" panel with every
location's 12 hours and a single shared key. Icons come from a new
display-only `hourlyIconKindForCode` keyed on the raw WMO code, the key lists
only conditions actually on screen, and wet hours show mm.

**Why**: the old strip silently showed the origin with nothing naming it, which
for anything longer than a short hop describes the wrong place. Separately,
`classifyWeather` collapses WMO 0/1/2 into "Dry" and all frozen precipitation
into its `code >= 61` rain branch — correct for choosing clothing, wrong for a
forecast row where partly cloudy drew a bright sun and snow drew raindrops.

**Resolution**: `classifyWeather` is deliberately untouched — `recommend.ts`
branches on those exact labels and severities — so the outlook has its own
resolver in `WeatherIcon.tsx` and the two are allowed to disagree. Per-location
ETAs come from `useRouteEtas`, a debounced `computeRoute` call; Google Routes
is billed per request, so it is gated on a complete route and memoised on a
signature of the inputs. Two traps found while building it, both worth knowing
before touching this again: a raw `new Date()` in render made that signature
change every render so the debounce never fired (fixed by `useNowBucket`), and
Google rejects a past `departureTime` outright, so the bucket must round *up*.
When no ETA can be computed — transit, or a failed route — every location falls
back to the departure hour and the card says so rather than implying precision.

---

---

## 2026-07-27 — Plan screen reordered (Mode before When); "More modes" removed; Preferences split; formal occasion is now a labelled segmented control (§4.3, §9.6)

**What**: Mode now sits above When. The "More modes" disclosure is gone. The
single Preferences card is split into "Dress code" and "Spare layer" sections,
with "Save this route" moved to the bottom of the page beside Plan journey. The
formal-occasion switch became a two-option segmented control with a hint.

**Why**: mode decides trip duration, and the When section's hourly outlook is
computed from that duration — choosing the time first meant choosing it against
an outlook the next tap invalidated. "More modes" only ever disclosed that hike
mode doesn't exist yet, which tells the user nothing actionable (it replaced a
dead alert on 2026-07-23; the alert was the bug, the disclosure was never worth
keeping). The Preferences card mixed two recommendation inputs with a
save-afterwards toggle. And "Formal occasion" was a bare switch naming an
occasion without ever saying what it changes.

**Resolution**: the dress-code hint states what §7.10 actually does — prefer a
formal-type shoe, bias layers toward `formal`-tagged items, skip the wind-chill
layer — so the copy has to change if that logic does. One trap found while
doing this and worth knowing repo-wide: react-native-web silently drops
`accessibilityState` for `accessibilityRole="button"` *and* `"checkbox"` —
neither `aria-pressed`, `aria-selected` nor `aria-checked` reaches the DOM, so
selection was conveyed by fill colour alone, which §9.6 rules out. Selected
state is now carried in `accessibilityLabel` on all three controls. Prefer that
over `accessibilityState` for any new toggle here until RNW is verified to emit
it. `MODE_LABEL` keeps its `hike` entry: the type still includes it (Phase 20),
it just has no chip.

---

---

## 2026-07-27 — Today gains an hourly forecast card and a 48h/7-day panel, reversing the 2026-07-21 Plan-only call; Right now keeps its reading through refreshes (§4.2, §9.5)

**What**: Today now has a second weather card — the next 8 hours for the
current suburb, with a right-side panel holding a 48-hour strip and a 7-day
list. The Right now card no longer blanks to a spinner when its cached reading
goes stale; it keeps showing the stored reading and its "as of" stamp while a
refresh runs behind it. Adds a 15-minute auto-refresh while Today is focused
and pull-to-refresh.

**Why**: this directly reverses the 2026-07-21 entry that kept the hourly strip
off Today on the grounds that §9.3.1 frames Right now as "just current
conditions". That entry explicitly left the call to whoever touched Today next
— this is that pass, and it was user-requested. Right now keeps its narrow
scope; the forecast lives in its own card rather than being folded into it.
Separately, `loading: true` on every stale refetch threw away a perfectly good
reading the user could still act on, in exchange for a spinner.

**Resolution**: `loading` is now the cold start only — it is set in exactly one
place, the initial empty state — and background updates use `refreshing`, which
drives pull-to-refresh and an "updating…" suffix but never clears the card. A
failed refresh keeps the stale reading rather than surfacing an error. The
15-minute cadence is derived from Open-Meteo's published model table (checked
2026-07-27: GFS/HRRR/UKMO/AROME hourly, ICON 3-hourly, IFS/GEM 6-hourly), so
nothing displayed changes faster than hourly and polling harder buys nothing;
re-derive from that table rather than tuning the number by feel. All three
cards are fed by one `getLocalOutlook()` call — current snapshot, 48h hourly
and 7 days come out of a single response the shared fetch was already pulling,
so the cards cannot disagree about the weather. Note `past_days=1` is on that
request for `recentPrecipMm6h`, so the daily block leads with yesterday and is
filtered to today onward.

---

---

## 2026-07-27 — HorizontalStrip: forecast rows could not be scrolled with a mouse on web; side panels containerized (§9.5, §9.6)

**What**: every horizontal forecast row now renders through `HorizontalStrip`,
a platform-split component. Native is a plain horizontal `ScrollView`; the web
build adds wheel-to-scroll and click-drag-to-pan. Both side panels' sections
are now separate bordered cards rather than runs of text on one background.

**Why**: with `showsHorizontalScrollIndicator={false}` the rows were genuinely
unusable with a mouse — a wheel only scrolls a horizontal container with shift
held, drag doesn't pan a scroll container at all, and there was no visible bar
to grab. The row was scrollable in principle and unreachable in practice. An
earlier attempt to fix discoverability with a "swipe across" hint addressed the
wrong half of the problem: it said scrolling was possible without making it so.

**Resolution**: the web handler yields the wheel at either end so the page can
still scroll past the row, with a 1px tolerance — `scrollWidth`/`clientWidth`
are integers while `scrollLeft` is fractional, and exact equality left the row
one sub-pixel short of its maximum, swallowing the gesture forever. Drag is
mouse-only; touch and pen already pan natively and hijacking them would kill
momentum scrolling. Panel section cards use fill *and* border because
`surface` and `surfaceRaised` are both `#FFFFFF` in the light theme, where only
the border separates them. Separately, `LocalForecastCard` resolves its own
`useWeatherTheme` instead of taking TodayScreen's pre-computed value the way
JourneyCard does — taking the prop rendered it in the dark mood palette while
the light theme was active, measured in the DOM (`#1C2C4A` against white
neighbours). The cause of that divergence was not identified; if JourneyCard
ever shows the same symptom, this is the known-good pattern.

---

---

## 2026-07-27 — Day labels inside the scrolling hourly rows; §9.1's severity→condition colour lookup finally built; header buttons given a visible target (§9.1, §9.5)

**What**: every hourly row now renders through `HourlyForecastRow`, which
splits readings into day groups and puts the day's name at the head of each
group. Weather icons take a condition-derived colour from a new
`theme/conditionColor.ts`. Header buttons sit on a tinted disc, and the
`settings` glyph gained an explicit `fill="none"`.

**Why**: the rows had no date anchor at all, so hour 30 of a 48-hour strip was
unplaceable. Colour-wise, §9.1 has always said to "map classifyWeather()'s
severity (0–4) directly to the active theme's condition* tokens via a lookup
array" — the lookup was never written, so every surface drew its icons in one
flat `textSecondary` and the forecast read as a grey grid with nothing to catch
the eye.

**Resolution**: day labels live *inside* the scrolling content rather than
pinned above the row, so each tracks its own hours — scroll to the next day and
its label arrives over that day's first column, midnight. A sticky label would
need measurement plumbing neither platform gives cheaply, and a single label
above the strip goes stale the moment you scroll. Colour is keyed on the
rendered icon kind, not severity: the rows resolve glyphs from the raw WMO code
(`hourlyIconKindForCode`), so severity would have coloured the new
partly-cloudy and snow glyphs by whichever bucket their code lands in.
`conditionColorForSeverity` exists alongside it for callers that genuinely
start from severity. Two traps worth knowing: `uvBadge` and `conditionLight`
are the same `#FFD23F` in the dark theme, so clear-day and partly-cloudy-day
must not both use a yellow; and severity 0 maps to the deliberately muted
`conditionDry`, which made Right now's hero icon *dimmer* than the plain
`textPrimary` it replaced — that card colours from its glyph instead. The
`settings` fill fix is cross-platform: an unset `fill` inherits `none` from the
root `<Svg>` on web but paints solid black in react-native-svg, which is why
the cog measured near-white in the browser and was reported as black on device.

---

---

## 2026-07-28 — Gear glyphs for gloves/hat/midlayer; generic gear copy is bare noun phrases and warmth-aware (§7, §9.3.1)

**What**: `accessoryIconKind` now resolves gloves and hats to their own glyphs
instead of falling through to a backpack, and `midlayer` is a long-sleeved
jumper rather than an abstract gilet outline. The Right now card's picks are a
labelled "What to wear" subsection of chips. `GENERIC_LAYER_TEXT` became
`genericLayerText(type, warmthLevel)` — bare noun phrases that change with the
temperature.

**Why**: the cold-weather line "Consider gloves/a hat — it's cold out" drew a
*bag*, because only sunglasses were ever matched. The old copy was also
warmth-blind — "A jacket will do the trick" read the same at 1°C and 14°C — and
phrased as observation rather than instruction, so the reader had to translate
it. Under a "What to wear" heading, "Wear a" was then saying the verb twice.

**Resolution**: matching order in `accessoryIconKind` matters, because both
engine strings name more than one garment ("sunglasses/a hat", "gloves/a hat")
— sunglasses and gloves are tested first so the hat glyph is left for text that
only says hat. Copy keys off the same `warmthLevel` that picked the slots, so
words and plan can't drift; `COLD_STACK_LEVEL` is the one threshold to move.
Warmth level 0 previously produced *no* layer line at all, so hot days said
nothing about tops — it now emits "Single layer — it's hot". Two tests pin both
ends of the scale, since the hot branch is unreachable by hand in an Auckland
winter. Icon shapes went through several rejected attempts, worth not repeating:
fingered gloves turn to mush at 15px (mitt with the thumb as part of one
continuous outline reads best — a thumb drawn as a separate stroke leaves the
body's edge between them and looks detached); a beanie needs height and a flush
ribbed band or it reads as a serving dome; and a midlayer with short flared
sleeves is indistinguishable from `base`. Tabler's jacket and shoe were tried
as hand-drawn replacements and reverted — the originals were better.

---
## 2026-07-28 — Phase 19 sync bookkeeping: SQLite triggers, plus tombstones the spec never mentions (§13.7, §3.1)

**What**: migration `004_sync_metadata.ts` adds `updated_at` to the ten synced
tables and a `sync_tombstones` table, and maintains both with SQLite triggers
(`AFTER INSERT/UPDATE` stamp, `AFTER DELETE` tombstone) rather than by editing
the ~30 write functions in `src/db/repositories/*`, which are unchanged.

**Why**: §13.7 specifies "last-write-wins per row" without saying what "last"
is measured against, and never mentions deletes at all. Neither is optional:
LWW needs a per-row modification timestamp, and without tombstones a delete on
one device is silently resurrected by any peer that still holds the row.

**Resolution**: triggers were chosen over hand-stamping so a future write path
(or a targeted UPDATE like `updateClothingWearTracking()`) gets sync
bookkeeping automatically — a forgotten hand-stamp doesn't fail loudly, it
syncs the row with a wrong timestamp. The `WHEN NEW.updated_at IS OLD.updated_at`
guard lets a pull write a remote timestamp without the trigger stomping it;
the one gap (supplying the timestamp the row already has re-stamps it) is
only reachable via a no-op write and is pinned by a test. Don't add a synced
table without adding it to `SYNCED_TABLES` in that migration.

---

## 2026-07-28 — Cloud sync excludes `app_settings` and gear photos (§13.7, §3.3)

**What**: `SYNCED_TABLES` omits `app_settings`, and `photo_uri` is listed in
`DEVICE_LOCAL_COLUMNS` (`src/lib/sync/localChanges.ts`) so a pull never
overwrites it. Everything else in the ten tables syncs.

**Why**: §13.7 says nothing about either. `app_settings` holds device-local
preferences (theme, 12h/24h, crash-reporting opt-in, onboarding state) which
would be wrong to propagate — a phone's dark-mode choice is not a laptop's.
`photoUri` is a local `file://` path under documentDirectory; the *file*
doesn't travel with the row, so accepting a peer's path yields a reference to
something that was never on this device.

**Resolution**: scoped deliberately, not deferred by oversight. Syncing the
images themselves is a separate piece of work (object storage, upload/download
lifecycle, orphan cleanup) that every candidate backend can support; until
then each device keeps its own photos and the rest of the row syncs normally.
If it's built, add it as its own pass rather than widening `DEVICE_LOCAL_COLUMNS`
semantics — that constant means "never travels", not "not yet".

---

## 2026-07-28 — Sync pull watermarks are server-clock, LWW is device-clock (§13.7)

**What**: `SyncBackend.pull(since)` filters on a stamp the *backend* assigns on
write, while last-write-wins compares the `updatedAt` the *device* wrote. The
two clock domains are kept separate, documented on the interface, and modelled
by `MemoryBackend`'s `serverStamp` field.

**Why**: found while testing delete propagation — filtering a pull on
device-written timestamps looks correct and passes casual testing, but any
device whose clock runs behind the server has its writes excluded from every
later pull, making them permanently invisible to that user's other devices.

**Resolution**: any concrete adapter must keep a backend-maintained
`server_updated_at` (trigger or `DEFAULT now()`), index it, and filter on it.
`updated_at` stays the client's value and is used only for conflict
resolution. The engine's own tests run against `MemoryBackend`, so pointing
that suite at a new adapter is the check that it got this right.

---

## 2026-07-28 — Phase 19 built engine-first; backend provider deliberately unchosen (§13.7)

**What**: the sync engine, its local SQLite half, the `SyncBackend` interface
and a full `MemoryBackend` reference implementation are built and tested (12
tests); no vendor SDK is installed and no concrete adapter exists yet.

**Why**: §13.7 names Supabase or Firebase, but Supabase's free tier pauses a
project after ~7 days of inactivity and requires a *manual* dashboard resume —
no auto-wake on request — which is disqualifying for a portfolio project meant
to stay reachable. The usual GitHub Actions keep-alive doesn't rescue it
either, since GitHub disables scheduled workflows after 60 days without new
commits. Appwrite is strictly worse (same 7-day clock, runtime traffic doesn't
count, 90-day deletion).

**Resolution**: evaluation left Firebase (no idle pause, auth included, NoSQL)
against Turso or Cloudflare D1 paired with Better Auth (SQL end-to-end, needs a
thin two-endpoint API). All sync intelligence is client-side precisely so this
stays a one-file decision. Whoever picks: implement `SyncBackend`, honour the
clock-domain rule above, and run the engine suite against it.

---
## 2026-07-28 — Phase 19 backend is Cloudflare Workers + D1 + Better Auth, not a BaaS (§13.7)

**What**: `worker/` holds a Hono Worker fronting D1, with Better Auth for
accounts; supersedes the same-day "backend provider deliberately unchosen"
entry. Auth is email+password with the `bearer` plugin, not §13.7's
preferred magic link.

**Why**: §13.7 named Supabase or Firebase, but Supabase's free tier pauses
after ~7 days idle and needs a *manual* dashboard resume, which is
disqualifying for a portfolio project. Firebase clears that bar but its JS
SDK has ongoing Expo auth-persistence problems and the native SDK needs a
dev build — and this repo already has one feature (`dataExport.ts`)
crippled on web by exactly that kind of native-only dependency.

**Resolution**: the client talks to the Worker with plain `fetch`, so web
and native share one code path and no vendor SDK. Magic link was dropped
because it needs an outbound email provider — a second vendor and API key —
for a single-user app; the password-reset flow §13.7 wanted to avoid simply
isn't built (`sendResetPassword` unset). Bearer tokens rather than cookies
because React Native has no cookie jar. Swapping to magic link later is a
plugin change plus one screen, with the sync layer untouched.

---

## 2026-07-28 — Remote schema stores rows as opaque JSON, not mirrored tables (§13.7, §3.1)

**What**: D1 holds `sync_rows(user_id, table_name, row_id, updated_at,
server_updated_at, data)` with `data` a JSON blob the Worker never parses,
rather than ten tables mirroring the local schema.

**Why**: mirroring would make every additive migration in `migrations/`
require a matching remote migration, and the failure mode when someone
forgets is silent — the column just stops syncing, with no error anywhere.
Sync is row-level and schema-agnostic by design, so the Worker has no need
to understand the columns.

**Resolution**: `migrations/005_*` and beyond need no remote change at all.
The accepted cost is that D1 can't be queried per-field — the remote
database is a sync relay, not a queryable copy, and SQLite on the device
stays the source of truth for every read. If a future feature genuinely
needs server-side queries over user data, that's when mirrored tables earn
their keep; nothing in Phase 19 does.

---

## 2026-07-28 — Sync hardened against future-dated timestamps and unwritable rows (§13.7)

**What**: `runSync()` caps the push watermark at now + 5 minutes, discards
a stored watermark already beyond that, and `applyRemoteChanges()` catches
per-row write failures instead of letting them propagate.

**Why**: both were found by running the real app against the real Worker,
not by unit tests. A row dated 2032 (left by a manual test) pushed this
device's watermark into the future, after which every new local edit read
as "already pushed" — the device silently stopped uploading while still
reporting successful syncs. Separately, one row that failed to write threw
out of `runSync`, rejected `syncNow()`, and left the sign-in button
spinning forever; because the watermark never advanced, every later sync
refetched the same row and died on it again.

**Resolution**: three regression tests pin all of it
(`syncEngine.test.ts`). The 5-minute tolerance is deliberate — exact
now() comparison flakes, since SQLite's clock and JavaScript's can invert
by a millisecond, and real peers drift by seconds. Treat "sync reports
success but nothing uploads" as the failure mode to protect against first;
it is far worse than a wasted request.

---
## 2026-07-28 — Gear photos sync as R2 objects, native-only, and never as row columns (§3.3, §13.7)

**What**: photos move through their own `/photos` endpoints backed by R2,
reconciled by `src/lib/sync/photoSync.ts` after row sync. Migration 005 adds
a device-local `gear_photo_sync` table. `photo_uri` is now withheld from the
push payload as well as protected on pull. Supersedes the same-day "cloud
sync excludes gear photos" entry, which scoped them out pending this work.

**Why**: a row is small JSON that changes often and needs last-write-wins; a
photo is ~100 KB of JPEG written once and then immutable. Folding photos
into rows would base64-inflate every image into the row payload and re-send
it whenever any field on that item changed. There's also no conflict to
resolve — an item either has a photo or it doesn't.

**Resolution**: re-capture is detected by file mtime, because PhotoPicker
overwrites `gear-photos/{itemId}.jpg` in place so the path never changes.
The upload scan is driven off the database, not a directory listing, so an
orphaned file left by gear deleted while offline is never re-uploaded.
Deleting gear deletes its photo, handled in the push handler so it happens
regardless of which device issued the delete. Photo failures are counted,
never fatal — gear rows feed the recommendation engine, photos are
decoration. Native-only: `expo-file-system` reports `documentDirectory` as
null on web, so there is no local file to upload and nowhere to put a
download; web reports a skip rather than an error.

---

---

## 2026-07-28 — Web renders gear photos from R2 via blob URLs, not signed URLs (§3.3, §13.7)

**What**: `src/lib/sync/remotePhotoCache.ts` + `useGearPhoto.ts` let the web
build display gear photos by fetching `/photos/:itemId` with the bearer
token and handing the browser a `blob:` URL. Native is untouched and still
renders the local file. Partially supersedes the same-day entry that made
photos native-only — capture and local storage still are; display no longer
is.

**Why**: photos are captured on a phone but the web build has no local photo
storage at all (`documentDirectory` is null), so gear synced to a desktop
appeared permanently pictureless — which undercut the reason cloud sync was
wanted in the first place. An `<img>` can't send an `Authorization` header,
so something had to give.

**Resolution**: rejected signed URLs, the obvious alternative, because a
token in a query string leaks into browser history, referrer headers and
any intermediary's logs; fetching with the header keeps the credential in
one place. A per-account manifest is fetched once and cached so a
thirty-row gear list costs one request instead of thirty 404s, concurrent
requests for the same item coalesce, and blob URLs are revoked on sign-out
so one account's images can't outlive its session. Don't switch to signed
URLs without revisiting that reasoning.

---
## 2026-07-28 — Google Maps Android key moved into a dynamic app.config.js [bug fix, §9.2]

**What**: added `app.config.js`, layered over `app.json`, solely to inject
`android.config.googleMaps.apiKey` from the environment at build time.

**Why**: `react-native-maps` renders through the Google Maps SDK on Android,
which reads its key from `com.google.android.geo.API_KEY` in the manifest.
The key was never set, so opening the location picker hard-crashed the app
on a real device. It went unnoticed through every prior session because all
testing ran on web, where `LocationPickerMap.web.tsx` uses Leaflet and needs
no key. The value can't live in the committed `app.json`, and only a dynamic
config can read from `process.env`.

**Resolution**: prefers `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, falls back to
`EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` — matching the existing single-key
approach — so the two can be split later without touching the file. Warns
at build time when an Android build has no key, rather than shipping a
crash. Note `expo config --type public` deliberately strips
`android.config`; use `--type prebuild` to verify it, or you'll conclude
the config isn't applied when it is. iOS is untouched: nothing passes
PROVIDER_GOOGLE, so it renders with Apple Maps and needs no key.

---
## 2026-07-29 — GPS lookups are time-bounded and prefer the last known fix [bug fix, §4, §5]

**What**: new `getPositionWithinTimeout()` in `approximateLocation.ts` tries
`getLastKnownPositionAsync()` first, then races `getCurrentPositionAsync`
against an 8s timeout. All three GPS call sites now use it
(`resolveApproximateLocation`, `useLocationPicker.useCurrentLocation`,
`Step1Location.useCurrentLocation`).

**Why**: `getCurrentPositionAsync` resolves only once the device actually
gets a fix and has no timeout of its own, so indoors it can hang more or
less forever. Every call site blocks UI on it. Reported as "the Locations
screen's Pick on map button doesn't work": the modal did open, but sat on
its loading spinner because `seed` never resolved. Onboarding's identical
picker looked fine only because permission isn't granted yet at that point,
so the GPS branch is skipped entirely.

**Resolution**: last-known-first means the common case returns instantly
rather than merely being bounded. The race doesn't cancel the underlying
request — expo-location exposes no cancellation — it just stops the caller
waiting on it. Accuracy dropped to `Balanced`, since a commute start point
doesn't need metre precision and high accuracy is the slow path. Nine tests
cover it. Don't add a fourth bare `getCurrentPositionAsync` call site;
route it through the helper.

---
## 2026-07-29 — Dependency ceilings: jest, eslint and typescript majors are blocked by Expo's own presets [maintenance]

**What**: everything Expo governs is aligned to SDK 57 (`expo install --check`
clean, doctor 20/20) and all in-range non-Expo updates are applied. Four
majors were tried and reverted, and should not be re-attempted without
first checking the blocker named here:

- **jest 30** — `jest-expo@57.0.3` depends on jest *29* internals
  (`@jest/globals`, `babel-jest`, `jest-snapshot`, all `^29.2.1`). Bumping
  puts two jest majors in one tree. Blocked until jest-expo ships for 30.
- **eslint 10** — the `eslint-plugin-react` bundled inside
  `eslint-config-expo` calls `context.getFilename()`, removed in 10.
  Fails at rule-load time. Note the peer range says `>=8.10`, which is
  misleading; the peer range is not evidence of compatibility.
- **typescript 7** — `tsc` alone passes, but `ts-api-utils` (via
  `@typescript-eslint`) reads `TypeFlags.Intrinsic` and crashes, so lint
  dies and CI fails. Kept at 6 in *both* packages deliberately; the worker
  could run 7 today since it has no lint, but version skew across two
  packages in one repo is worse than being a major behind on a
  typecheck-only tool.
- **better-sqlite3 13** — dropped its prebuilt binaries: the install
  script changed from `prebuild-install || node-gyp rebuild` to bare
  `node-gyp rebuild`, so `npm ci` fails without a compiler. Stays on 12.x.
  Test-only dependency; nothing gained by compiling it in CI.

**Why**: an Expo project's dependency graph is only as new as its presets.
"Latest" is the wrong target for anything Expo pins — `expo install --check`
is the authority. It currently wants `reanimated@4.5.1` and
`worklets@0.10.1` where npm reports 4.5.3 and 0.11.3 as latest.

**Resolution**: verify major bumps by running the whole CI sequence from a
clean `npm ci`, not just `tsc`. Two of the four above pass `tsc` and fail
lint or install — checking only the typechecker would have shipped them.

---

## 2026-07-29 — Removed unused react-native-dotenv; babel uses worklets/plugin; audit clean [maintenance]

**What**: `react-native-dotenv` deleted (installed, never imported, not in
`babel.config.js` — the project uses Expo's own `EXPO_PUBLIC_*` inlining).
Babel now names `react-native-worklets/plugin` directly rather than
`react-native-reanimated/plugin`, which as of Reanimated 4 is a one-line
shim re-exporting it. `npm audit` is **0 vulnerabilities** in both packages,
via `overrides` pinning `brace-expansion ^5.0.8` and `uuid ^11.1.1`.

**Why**: both advisories were transitive and build-time only —
brace-expansion via eslint→minimatch, uuid via
expo-sharing→@expo/config-plugins→xcode (iOS prebuild tooling). Confirmed
neither appears in the 1.7 MB web bundle before overriding them, so the
overrides buy a clean audit rather than fixing shipped exposure. Worth
knowing which it is: a red audit number on a dev-only transitive is not the
same risk as one in app code.

**Resolution**: `@typescript-eslint/parser` is now an explicit devDependency.
It was previously only reachable because npm happened to hoist it out of
`eslint-config-expo`; regenerating the lockfile nested it instead and lint
died with 668 "Cannot find module '@typescript-eslint/parser'" errors from a
clean install. Declaring it directly makes lint independent of tree shape.

---

## 2026-07-29 — wrangler.toml top-level keys must precede every [table] header [bug fix]

**What**: `workers_dev` and `preview_urls` sat below `[[r2_buckets]]` and
were therefore parsed as fields *of that bucket*, not as Worker settings.
Moved above the first table header, with a comment saying why placement
matters.

**Why**: TOML assigns bare keys to the most recently opened table. wrangler
accepted the file silently for several deploys and only flagged it after a
version bump, as "Unexpected fields found in r2_buckets[0]". The practical
consequence: `preview_urls = false` never applied, so every deployed version
had its own public hostname serving a live auth endpoint against the
production database — the exact thing that setting was added to prevent.

**Resolution**: treat a wrangler config warning as a failure, not noise.
When adding a top-level Worker setting, put it at the top of the file.

---
## 2026-07-30 — Migrated off expo-file-system/legacy; File/Directory must never be constructed at module scope [maintenance, §3.3]

**What**: `PhotoPicker.tsx`, `dataExport.ts` and `photoSync.ts` now use the
modern `File`/`Directory`/`Paths` API instead of `expo-file-system/legacy`.
Every instance is built inside a function — `photoDir()`,
`gearPhotosDir()`, `exportStagingDir()`, `importStagingDir()` — never as a
module-scope constant.

**Why the lazy accessors are load-bearing**: on web `expo-file-system` is
unsupported, `Paths.document`/`Paths.cache` are stubs, and
`new Directory(...)` **throws on construction** ("this.validatePath is not a
function"). At module scope that exception escapes the import, so every
screen that transitively imports the file dies — the entire web bundle
rendered blank. The legacy API was forgiving here: `documentDirectory` was
merely `null`, which produced a useless path string rather than an
exception. Caught by loading the web app, not by tsc, lint, or 348 tests,
all of which passed while the app was completely broken.

**Other shape differences worth knowing**: `exists`, `lastModified`,
`create()`, `write()` and `delete()` are synchronous; only `text()`,
`base64()`, `bytes()`, `copy()` and `move()` are async. `create()` on a file
takes `overwrite`, on a directory `idempotent` — they are not
interchangeable, and `Directory.delete()` has neither, so it needs an
`exists` guard. `copy()` accepts `{ overwrite: true }`, which is why no
delete-then-copy dance is needed for re-capture.

**Unit change**: legacy `modificationTime` was **seconds**; modern
`lastModified` is **milliseconds** (and `modificationTime` is now itself
deprecated). Migration 006 clears `gear_photo_sync.uploaded_file_mtime`
because the stored values are in the old unit — see that file for why one
redundant upload per existing photo is the intended consequence.

---

## 2026-07-30 — SafeAreaView now comes from react-native-safe-area-context in all screens [bug fix, §9]

**What**: the seven screens that imported `SafeAreaView` from `react-native`
now import it from `react-native-safe-area-context`, matching what
`LocationPickerMap.tsx` already did.

**Why**: React Native's `SafeAreaView` is deprecated *and* iOS-only — a
plain `View` on Android. So on Android these screens applied no inset at
all, which is a real rendering bug on devices with a cutout, not just a
lint concern.

**Resolution**: no per-screen `edges` needed, deliberately. React Navigation
provides each screen a safe-area context already reduced by the header and
tab-bar heights, so the context version computes 0 top inset inside a
header'd stack screen and the real inset inside a `headerShown: false` one.
Hand-picking edges per screen would duplicate that arithmetic and go stale
whenever a screen's header option changes. Verified on web (insets are 0
there, so no visual change) and by navigating the header'd and headerless
variants; the Android inset improvement follows from React Navigation's
documented behaviour rather than from a device check.

---
## 2026-07-30 — Web app is served by the sync Worker itself; COOP/COEP via public/_headers [§12, §13.7]

**What**: `worker/wrangler.toml` gained an `[assets]` block serving
`worker/public` (the `npm run build:web` output) with
`not_found_handling = "single-page-application"` and `run_worker_first` for
the API paths. `public/_headers` at the repo root — copied into the export by
Expo automatically — sets `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: credentialless`.

**Why the headers are mandatory, not hardening**: the web build's database is
`expo-sqlite`'s wa-sqlite WASM backend, which needs SharedArrayBuffer, which
browsers only expose to a cross-origin isolated document. Without them the
page loads and then cannot open its database at all — no gear, no locations,
no journeys — a failure that looks nothing like a missing HTTP header.
`metro.config.js` sets the same pair for local dev, but its own comment notes
it only runs inside the Expo CLI process, so production had to set them
separately. They live in `_headers` rather than Worker code because
`_headers` applies to static assets, and Worker code can't add headers to a
response it never handles.

**Why one Worker rather than two**: the site is then same-origin with its own
API, so there is no CORS preflight and no `TRUSTED_ORIGINS` entry to keep in
step with the deployed URL. Verified live: `crossOriginIsolated === true`,
onboarding completes (which writes to SQLite), OPFS holds the `expo-sqlite`
store, and `/sync/pull` returns 401 rather than an asset.

**Same-origin base URL fallback**: `src/services/syncApiBase.ts` returns `""`
on web when `EXPO_PUBLIC_SYNC_API_URL` is unset. `.env` is gitignored, so a
cloud build has no value for it — without the fallback the deployed site
would report "sync isn't configured in this build" while a local build worked
perfectly. Note the guards had to become `url === undefined`: the fallback is
an empty string, so the previous `if (!url)` checks would have rejected it as
unconfigured. Verified by building with `.env` hidden and deploying that
bundle.

---
## 2026-07-30 — Renamed the project to bucket-hat; new D1 and R2, old data abandoned [maintenance]

**What**: Worker, D1 database, R2 bucket, npm package names, EAS slug, URL
scheme and both platform bundle identifiers are now `bucket-hat` /
`bucket-hat-photos` / `nz.co.buckethat.app` / `buckethat`. The Worker is
served from `https://bucket-hat.anthonyy.workers.dev` (the workers.dev
subdomain also changed, from `ant-jo-yuen` to `anthonyy`).

**Why the data wasn't migrated**: D1 databases and R2 buckets cannot be
renamed in place, so matching names meant new resources either way. The
existing contents — one account, six synced rows, one photo — were
unreachable regardless: the account password was lost and §13.7's decision
to skip a password-reset flow means there is no recovery path. Migrating
rows nobody can authenticate against would have preserved nothing of value.
The old `commute-weather-planner` D1 and `commute-weather-planner-photos`
bucket are left in place to be deleted by hand.

**That lost password is worth treating as a signal**, not a one-off: it is
the second time the missing reset flow has cost something. §13.7 chose
email+password without reset to avoid depending on an email provider. If
this app is ever used by anyone else, that decision needs revisiting before
it costs them their data too.

**Consequences of the identifier rename, all deliberate**: the Android
package change makes this a different application to the OS and to EAS — the
build already on the phone must be uninstalled rather than upgraded, EAS
issues fresh credentials (so the SHA-1 recorded in PRODUCTION_CHECKLIST.md is
void and must be re-read after the next build), and the Google Maps key
restriction must be re-pointed at the new package. Secrets are per-Worker, so
`BETTER_AUTH_SECRET` had to be set again on `bucket-hat`; it is not inherited.

**Left alone deliberately**: the user-facing display name is still "Commute
Weather Planner", in app.json, STORE_LISTING.md and the permission strings.
"Rename the project" was read as the project's identifiers rather than its
branding — renaming what users see is a product decision, not a refactor.

---
## 2026-07-31 — Display name and all user-facing copy rebranded to Bucket Hat [maintenance]

**What**: `app.json`'s `name`, the three OS permission strings, the in-app
single-user disclosure, the export filename (`bucket-hat-export-*.zip`), the
import error copy, `PRIVACY_POLICY.md`, `STORE_LISTING.md` and the spec docs
all now say "Bucket Hat". Completes the 2026-07-30 rename, which had
deliberately stopped at identifiers.

**Why it was split**: renaming identifiers is a refactor; renaming what users
read is a product decision, so it was raised separately rather than assumed.

**Fixed while in there** — the privacy policy's opening paragraph still
claimed "there are no accounts, no sign-in, and no server run by us that your
data passes through", which the same document then contradicted further down
in the sync section added on 2026-07-28. That's a privacy policy, so an
inaccurate summary is worse than an incomplete one. It now states the
on-device default and points at the sync section for what an account changes.
The "there is no account" line under *What we collect* had the same problem
and is now conditional. Whenever the sync surface changes, re-read this
document's opening two paragraphs specifically — they summarise claims made
in detail elsewhere and will drift silently.

**Not renamed**: the app icon and header logo are artwork, not copy, so they
still show the old umbrella mark. The `nz.co.buckethat.app` identifiers and
`bucket-hat` resource names are unchanged from yesterday.

---
## 2026-07-31 — Icon padding fixed for Android's safe zone; favicon made transparent [bug fix, §10.4]

**What**: `icon.png` content reduced from 78% to 62% of the canvas, and both
`android-icon-foreground.png` and `android-icon-monochrome.png` from 66% to
53%. `favicon.png` regenerated with no background, cropped tight to the hat,
at 256px.

**Why the adaptive icon mattered most**: Android guarantees only the inner
**66%-diameter circle** of an adaptive icon is visible; launchers mask to
circles, squircles and rounded squares. The hat spanned 66% of the *width*,
and its widest point is the brim — which sits below centre, where the circle
has already narrowed. So it was being clipped on exactly the devices that use
a circular mask. Now the furthest opaque pixel is at 88% of the safe radius.
A square preview will not show this; it has to be checked numerically.

**The favicon's background was actively wrong**, not merely unnecessary: a
tab sits on browser chrome that is light or dark by user theme, so a baked-in
navy square reads as a misaligned box rather than as the mark. Transparency
was produced by flood-filling the navy inward from the four corners, not by
matching that colour globally — the hat's outline is near-black and
numerically close to the navy, so a global match punches holes through the
linework. Expo's export downsamples it to a 48px `.ico`; verified the
deployed file still has zero alpha in all four corners.

**Docs corrected too**: `PRODUCTION_CHECKLIST.md` still described the icon as
"a flat, geometric amber umbrella silhouette", the pre-2026-07-21 concept.
`docs/10-production-readiness.md` had the bucket hat right and now carries
both sizing rules as well.

---

## 2026-07-30 — Journey Mode: live follow-along is navigation UX, not the live tracking §13.8 rules out (Phase 22)

**What**: Journey Detail gained an active "following" state — a
transport-mode-shaped location puck, a follow camera, traveled-route
dimming, collapsing completed legs, a live ETA, off-route detection,
turn-by-turn steps, and in-journey weather/gear alerts.

**Why**: `docs/13-extended-features.md` §13.8 says "GPS breadcrumb
recording, and any kind of live tracking or safety check-in feature" is out
of scope, which reads at first glance as forbidding this outright. That
clause sits inside hike mode's scope list and is about *safety* features —
the app "is not a hiking safety app" — whereas this is navigation UX on the
existing commute flow, and it was explicitly requested.

**Resolution**: built as a new Phase 22, with §13.8's actual line intact: no
background location, no persisted breadcrumbs (position is never written to
SQLite), no check-in, and no safety framing in any copy. A future
contributor wanting any of those still needs the separate scoped phase
§13.8 asks for — this entry does not open that door.

---

## 2026-07-30 — Journey Mode tracks foreground-only, with keep-awake and a resume re-snap (Phase 22)

**What**: `watchPosition()` in `approximateLocation.ts` runs only while
Journey Detail is focused and journey mode is on; it stops on blur, unmount
and arrival. No `ACCESS_BACKGROUND_LOCATION`, no `expo-task-manager`, no iOS
`UIBackgroundModes`.

**Why**: every function this feature was asked for — puck, follow camera,
collapsing legs — is visual and only has value while someone is looking at
the screen, so background tracking buys nothing for them. It would only
matter for alerting, and leave-by notifications (Phase 8) already schedule
those from a timeline known at plan time.

**Resolution**: foreground-only, with `expo-keep-awake` while following so
the screen staying on is the normal case, and a one-shot re-snap on
`AppState` → active so returning to a backgrounded app never shows stale
progress. Adding background later means changing `watchPosition()` alone —
don't add a second subscription site, same rule the 2026-07-29 GPS entry set
for one-shot lookups.

---

## 2026-07-30 — Local-knowledge alerts default to a pre-departure briefing, not live nudges (§4.5, Phase 22)

**What**: a new `annotation_alert_mode` setting (`off` / `briefing` /
`live`) controls how saved `EnvironmentAnnotation` spots reach the user,
defaulting to `briefing` — a card listing the spots on this route, shown
before departure. Journey Detail also has a per-trip "Quiet" button.

**Why**: firing a nudge at every marked windy corner is the kind of thing
that makes someone disable a feature outright, so which of the three
behaviours should be the default was a real call rather than an obvious one.

**Resolution**: `briefing` wins by default because it's non-intrusive and
works with the phone in a pocket, where live alerts by definition don't;
`live` is opt-in. The per-trip mute is session-only and deliberately does
**not** write the setting — one tap while walking must not silently change a
global preference. Keep that split if either control is extended.

---

## 2026-08-02 — Onboarding gains a welcome screen; the auth form moves out of Settings (§4.1, §13.7)

**What**: a welcome screen (mark, name, tagline, three what-it-does lines)
now sits in front of §4.1's "where are you?" step, which was restyled but
not otherwise changed. Signing in is offered there and from Settings, both
routing to a new `src/screens/auth/` flow rather than the form that used to
live inside AccountScreen.

**Why**: §4.1's rework cut onboarding to one step, which left the app
opening on a request for the user's location with nothing having named the
app or said what it does. Adding a screen to a flow that was deliberately
shortened needed justifying rather than assuming.

**Resolution**: the welcome screen asks for nothing and adds no required
step — onboarding is still one forced step, with an introduction in front
of it. It is not a re-opening of the wizard question: anything that wants
data from the user belongs on Today's SetupChecklist, as before. Signing in
returns to the location step rather than skipping it, since `app_settings`
(and so `default_location`) is excluded from sync.

---

## 2026-08-02 — Password reset built, reversing §13.7's "no reset flow" call (§13.7)

**What**: `sendResetPassword` is now wired to Resend's HTTP API, with
request/reset screens on the client, and a public `/api/config` endpoint
reporting whether a given deployment can actually send email. The emailed
link lands on the web build's `/reset-password`, and carries the raw token
too so it can be typed into a phone.

**Why**: §13.7 chose email+password specifically to avoid depending on an
email provider, accepting "make a new account" as the recovery path. That
cost this project its stored data twice (2026-07-30), which that entry
already flagged as needing revisiting before anyone else was affected.

**Resolution**: the dependency is optional, not assumed — with
`RESEND_API_KEY`/`RESET_EMAIL_FROM` unset the Worker behaves exactly as it
did before, `/api/config` reports `passwordReset: false`, and the app hides
the flow and says plainly that a lost password can't be recovered. Don't
make the provider mandatory; extend the capability flag instead if a second
optional server feature ever appears.

---

## 2026-08-03 — Shared button/layout styles; Journey Detail restructured (§9.2, §9.3, §9.6)

**What**: added `src/theme/commonStyles.ts` (content/action width caps, card,
field and screen shapes) plus `AppButton`/`FormActions`, and migrated every
screen's bespoke button styles onto them. Journey Detail gained a
`JourneySummary` card and a single width-capped body column, with the
feedback prompt moved above the delete action.

**Why**: §9.2 only ever specified type, spacing and radius, so a dozen
screens each declared their own `saveButton`/`cancelText`/`addButton` — all
subtly different, several below §9.6's 44pt minimum, and all of them
stretching to whatever width the viewport gave them. §9.3's layout also
never said what identifies the journey you're looking at, and nothing did.

**Resolution**: `AppButton` (block width capped at `ACTION_MAX_WIDTH`,
centred) and `FormActions` are now the only sanctioned way to render an
action; new screens read layout shapes from `commonStyles` rather than
re-deriving them. Onboarding was left alone apart from the width cap, per
the 2026-08-02 entry.

---

## 2026-08-03 — Journey map origin marker carries the travel mode (§9.3)

**What**: the origin/current-location marker on both journey maps is now a
disc holding the journey's dominant travel-mode glyph (`originMode` prop,
`modeDivIcon` on web, `originMarker` on native); the destination keeps the
flag and stops keep the numbered dot. Planned journeys also render each
leg's turn-by-turn steps under its leg row (`StepList` gained a planned
variant).

**Why**: reverses the 2026-07-27 call that gave the origin the teardrop pin
"because a teardrop already means a place" — which is exactly the problem:
every saved location is a teardrop, so the one marker that means "you, about
to set off" said nothing about the trip. §9.3 also only ever showed steps
while following, leaving a planned journey with no route instructions at all.

**Resolution**: the glyph comes from `modeIconPaths.ts`, the same source the
Journey Mode puck uses, so the marker you set off from and the puck that
replaces it are the same vehicle — keep those three in step. `originMode` is
optional; callers that omit it (the location picker) still get the pin.

---

## 2026-08-03 — Weather sky background, day/night hourly blocks, two-list gear card (§9.1, §9.3, §9.5)

**What**: `ScreenPattern` is now a sky — tinted gradient, one diffuse sun
glow, two soft cloud banks — instead of the dot grid; hourly strips tint the
hours between sunset and sunrise as one continuous block (`nightTint` token,
`RainGauge`'s `isNight`/run flags); the gear card renders owned picks with
their own photos in one list and missing picks in a dashed hint box carrying
`GENERIC_PICKS_NOTE`; PlanScreen's route rail starts with the travel-mode
glyph, matching the map.

**Why**: the dot grid (2026-07-23) read as generic app texture in a weather
app, and §9.5's strip gave day and night hours identical treatment, so "when
does it get dark" had to be read off the hour labels. The gear card's four
sections in three type sizes mixed what you own with what you don't.

**Resolution**: the background stays decoration — under 0.2 alpha, no hard
edges, `pointerEvents="none"`; if it ever competes with a card it's wrong.
Night tinting is never the only signal (each cell says "after dark" to a
screen reader, §9.6). Keep the rail, both map origin markers and the puck on
`modeIconPaths.ts` — four places, one glyph set.

---

## 2026-08-03 — Gear notes rewritten short; the apparent-temp note states both figures (§7, §9.0.1)

**What**: every `notes` string in `recommendGear()` was tightened to one
clause. The apparent-temp divergence note now reads "Feels like 8°C, not
10°C — dressed for that", and the warmup-discount note dropped its duration
and temperature entirely ("Walking will warm you up — going one layer
lighter").

**Why**: §9.0.1 asks for one clause per line, but these had grown into full
explanations — the warmup note repeated the leg duration and temperature
that the leg row directly beneath it already shows, and the divergence note
described a gap without ever giving the number it was about.

**Resolution**: a note states the thing the rest of the screen can't already
show. Don't restore the minutes/°C to the warmup line — they're on the leg
row; if the threshold behind that discount ever needs surfacing, that's the
debug menu's job (§12.2), not the card's.

---

## 2026-08-03 — Saved journeys: a managed list, and Plan opens by asking (§4.3, §3.1)

**What**: `SavedRoute` gained `isFavorite`/`waypointIds`/`recurrence`
(migration 007, additive), a Saved journeys screen (favourites pinned, star,
rename, forget, and Leave now / Pick a time / Set up repeats), a Plan screen
that opens on "take a saved journey or plan a new one" in place of the old
chip row, and a "Save this journey" action on Journey Detail.

**Why**: §4.3 spec'd saved routes as a chip strip only, and left "Save as a
route" from Journey Detail unbuilt — so a trip taken often had to be
re-entered every time, and nothing could be favourited or repeated without
rebuilding it by hand.

**Resolution**: a saved journey still stores no date, time or weather — that
is what keeps it valid indefinitely (§4.3), and `recurrence` here is a
*preferred* pattern pre-filled into Plan, never a schedule: only a real
`Journey` materializes occurrences or fires notifications (§7.3). Every
action on that screen ends at Plan rather than planning directly, so the
live routing/weather calls stay in one place (§5). Don't add a "plan it now"
shortcut that bypasses Plan.

---

## 2026-08-03 — Hourly cells: unique clip ids, both blocks tinted, blank line kept (§9.5)

**What**: `RainGauge`'s droplet clip path is now keyed on `useId()` rather
than the hour label; daylight hours take their own `dayTint` wash instead of
showing the card through them; a dry hour renders a space rather than an
empty string; the droplet outline is one continuous set of cubics.

**Why**: hour labels are not unique — the Today card, its 48-hour panel and
both Plan outlooks can each mount a "3pm" column at once, and SVG ids are
document-global, so rain fills clipped to the wrong droplet or not at all.
An empty `<Text>` has no glyphs and collapses to zero height, which is what
made the night blocks come out ragged. And a transparent daylight cell is at
its darkest in dark mode, which is backwards.

**Resolution**: any SVG id inside a repeated component needs `useId()` —
there are no other id-generating components today, but this is the trap.
Both day and night are opaque fills; keep them that way rather than
reintroducing "absent means transparent".

---

## 2026-08-03 — Hourly cells commit to a light or dark surface, with measured icon colours (§9.5, §9.1)

**What**: `src/theme/hourlyPalette.ts` replaces the `dayTint`/`nightTint`
tokens added earlier today. A day cell is a light surface (`#E8EDFA`) taking
the *light* token set; a night cell is a dark one (`#1E2549`) taking the
*dark* set — in both app themes — with per-glyph overrides for the few
colours that still don't carry, each measured against its own background.

**Why**: tinting the day block a mid navy put the blue half of the condition
palette on a blue background at ~1.4:1, so the rain icons vanished exactly
when it was raining. No single mid-tone fixes it: `sun` is a gold needing a
dark backdrop, `rain` a blue needing a light one.

**Resolution**: worst-case glyph contrast is now 4.9:1 (night) and 4.6:1
(day), verified in the DOM rather than by eye. If a `condition*` token
changes, re-measure both cells — the overrides are keyed to specific
backgrounds. §9.1's "components never import darkTheme/lightTheme" still
holds: this lives in the theme layer, which is the one place allowed both.

---

## 2026-08-04 — One hourly cell, one fact: the droplet, the millimetres and the glyph agree (§6, §9.5)

**What**: `rainIntensityBucket()` dropped its `precipProbabilityPct`
parameter and is now a pure function of the millimetres, and
`outlookDisplay.iconKindFor()` reconciles the WMO-code glyph against that
bucket — a wet glyph on an hour with measurable rain, overcast on one
without. Snow and storm glyphs are never rewritten.

**Why**: §6 gated the bucket on probability first, so an hour at 20%
probability filled the droplet with 0.0mm forecast (fill, no number) and an
hour with a real 0.1mm at 15% emptied it (number, no fill). Separately,
Open-Meteo's code reports the dominant *sky* condition, so a cloud glyph
routinely sat above a printed amount. Three signals for one hour, disagreeing
in every combination.

**Resolution**: the amount is the source of truth for all three, because it's
the number the user reads; probability is displayed nowhere in this app
(§9.0.1 bans "60% chance" phrasing) so it shouldn't silently decide what the
gauge shows. Verified in the DOM: 0 mismatches across 24 cells. Don't
reintroduce a second wetness signal — reconcile in `iconKindFor` instead.

---

## 2026-08-04 — Opening a saved location leads with its forecast (§4, §9.3.1)

**What**: tapping a saved location now opens a detail screen whose first
content is the Today tab's own `RightNowCard` + `LocalForecastCard`, pinned to
that location's coordinates; the label/address/coordinates/preferences form it
used to open directly into is collapsed behind a "Location & preferences"
disclosure.

**Why**: §4 only ever described Locations as CRUD, so "open a location" meant
"edit a location." But a saved place's weather is the thing worth checking
repeatedly and its address is the thing you set once, so the screen was
leading with the rarer question.

**Resolution**: `useRightNow(fixedCoords?)` gained an optional pinned-location
mode (its cache is now a Map keyed by place, so Today and a location can't
clobber each other's reading) and `LocationForm` an `embedded` prop that drops
its own ScrollView. Both cards are reused verbatim — a saved location's
forecast and the current-location forecast are the same question about
different coordinates, so don't fork a second card design for this screen.

---

## 2026-08-04 — Per-location gear picks and notes are displayed, not fed to the engine (§3.4, §7)

**What**: `SavedLocation` gains `preferredGearIds` (ids across clothing/shoes/
umbrellas) and free-text `notes`, editable under the location form's
Preferences section and rendered as a card under the forecast on the location
detail screen. Migration 008, additive.

**Why**: §3.4 gave a location exactly one engine-read property
(`hasReliableClimateControl`), and §7 defines `recommendGear()` purely over
weather, inventory and calibration. Letting a per-place pick override the
engine's own would cut across the calibration loop (§7.5), the availability
and warmth-target logic, and the "why was this picked" reasoning — a real
§7 change, not a §3.4 one.

**Resolution**: these are the user's standing choices shown *next to* the
engine's picks, never merged into them, and the form says so in as many words.
Free text is deliberate too: an `EnvironmentAnnotation` is a structured signal
the engine matches (§7.8), this is a human reminder about a named place — don't
collapse the two. Wiring preferred gear into `recommendGear()` is a scoped §7
task if it's ever wanted, not an informal extension of this.

---

## 2026-08-05 — ScreenSurface puts the sky background on every screen (§9.1, §9.2)

**What**: new `src/components/ScreenSurface.tsx` — safe-area inset, themed
background colour and `ScreenPattern`, in one root component. Every screen now
uses it instead of re-declaring `{ flex: 1, backgroundColor: theme.bg }` and
(mostly) omitting the pattern. Gear's sub-lists and the wrapped screens'
scroll containers dropped their own opaque fills so the pattern shows through.

**Why**: ScreenPattern's own header claimed it was "the wash behind every
screen", but only Today, onboarding and auth rendered it — so most of the app
was a flat slab. Making it universal touches the 2026-07-21 call that scoped
the weather-reactive tint to the Today tab.

**Resolution**: the background *shape* is now universal; the mood *colour*
still isn't. `tint` is opt-in and only TodayScreen passes it, so §9.1.3's
weather-reactive palette remains the Today tab's alone — the 2026-07-21 entry
stands. A new screen should render `ScreenSurface` as its root and never
`ScreenPattern` directly, or it gets two skies.

---

## 2026-08-05 — Weather mood goes app-wide, from a published reading (§9.1.3)

**What**: `useTheme()` now merges the current weather mood onto the base
palette, so every screen, card, form, header and tab bar tints with the
weather — not just Today's cards. The reading comes from a new
`useAmbientWeatherStore`, which `useRightNow` publishes to when it resolves
the *user's own* location; a pinned reading (a saved location in another
suburb) deliberately does not repaint the app. `patternTint` joined
`MoodOverride`, so the sky now varies too — it never did before, which made
Today's `tint` prop a no-op.

**Why**: this reverses the 2026-07-21 call scoping the mood to the Today tab,
on explicit request. The stated worry was API cost of a live reading per
screen; there is none, because no screen fetches — they read a value Today
already fetched, through the same 15-minute cache.

**Resolution**: exactly six palettes (3 moods × light/dark), pinned in
`mood.test.ts`, merged objects cached by base+mood so `theme` identity holds
still for `useMemo`/`getStyles`. Ambient is null until the first reading
lands, which resolves to the plain base palette. `useWeatherTheme(reading)`
survives for cards showing weather that isn't here-and-now, and falls back to
ambient rather than to base so a loading card never disagrees with the screen
behind it. Don't add a weather fetch to a screen to get its mood — publish to
the store instead.

---

## 2026-08-05 — `ScreenSurface` derives its safe-area edges from the navigation chrome, correcting the 2026-07-30 call (§9.2) [bug fix]

**What**: `ScreenSurface` now computes `edges` itself from
`HeaderShownContext` and `BottomTabBarHeightContext` — skipping "top" when a
header is drawn above and "bottom" when a tab bar sits below — and all 25
per-screen `edges` props are gone. The top inset had been applied twice on
every header'd screen, showing as a fixed band under the header that could
not be scrolled away.

**Why**: the 2026-07-30 entry claimed React Navigation hands each screen a
context already reduced by header and tab-bar heights. It does not; nothing
in these packages overrides `SafeAreaInsetsContext`. That entry's instinct
was still right — hand-picking edges per screen duplicates the arithmetic
and goes stale when a screen's header option changes — so the fix keeps its
principle and repairs its mechanism, rather than reversing it outright.

**Resolution**: screens pass no `edges`; the prop survives only as an escape
hatch for a screen deliberately drawing under chrome the contexts cannot
see. The derivation is a pure exported `chromeAwareEdges()` covered by
`ScreenSurface.test.ts`, because the web build reports every inset as 0 and
so can never distinguish a right edge set from a wrong one — that is exactly
how the original bug shipped "verified". Never treat a green web check as
safe-area verification. Chrome insets are also not the tail whitespace at
the end of a scroll: that is `scrollContent`'s `paddingBottom`, lives inside
the ScrollView, and is deliberate — don't reach for an inset to get it.

---

## 2026-08-05 — Displayed temperatures are the air temperature; "feels like" is stated, never implied (§6.2, §9.3) [design]

**What**: every temperature the app renders is now `tempC`. The Right now
card states `apparentTempC` beside it as a labelled "Feels like N°",
emphasised when the gap reaches `FEELS_LIKE_DIVERGENCE_C`, and adds a wind
figure. Journey Detail's leg badges and Today's journey chips switched from
`apparentTempC` to `tempC`. The hourly columns gained a per-hour wind speed.

**Why**: §6.2 makes `apparentTempC` the engine's input, and the cards had
quietly adopted it as the *displayed* figure too. An unlabelled "5°C" is
read as the air temperature by anyone cross-checking another weather app, so
the app looked wrong rather than differently informed. Worse, the leg badge
printed the apparent figure directly above recommendGear()'s note "Feels
like 8°C, not 12°C" — the badge showed 8 while the note called 12 the number
it wasn't.

**Resolution**: engine input and display figure are now separate concerns —
don't "fix" a card back to `apparentTempC` to match the recommendation, as
the gap is the note's job to state (§9.0.1). `FEELS_LIKE_DIVERGENCE_C` lives
in weather.ts and `recommend.ts` derives its note threshold from it, so a
card can never emphasise a gap the engine stayed silent about. Wind is shown
unconditionally on the Right now card and per hour, but stays gated at
`HIGH_WIND_KPH` on leg badges where a column of twelve would be noise.

---

## 2026-08-05 — One `SidePanel` shell: slides from the right, widens with the viewport (§9.3, §9.5) [bug fix, design]

**What**: new `src/components/SidePanel.tsx` owns the shell both reference
panels were building identically — backdrop, header, scroll body, block
style. It slides in from the right and its width grows with the viewport
(760px max, up from a flat 420). The hourly strip gained a `bleed` prop so it
runs to its card's edges, and `WeatherKey`'s rows share one swatch box and a
label column.

**Why**: three reports at once, all consequences of the same duplication.
`animationType="slide"` on Modal only ever translates up from the bottom, so
a panel laid out against the right edge flew in from the floor; React Native
offers no right-hand variant, so the animation has to be hand-driven. The
420px cap left a narrow ribbon on desktop. The strip's tinted day/night runs,
inset inside an already-rounded card, read as a card drawn inside a card —
loudest on a phone, where the card is nearly the whole screen.

**Resolution**: don't add a fourth copy of the shell — extend `SidePanel`.
`sidePanelWidth()` is exported and unit-tested specifically for monotonicity:
the obvious `viewport < breakpoint ? 0.86 : 0.55` shrinks the panel by 200px
as the window crosses the breakpoint, which only shows up while actively
dragging a window edge. Bottom sheets (`SavedLocationPicker`,
`UnavailabilitySheet`) stay sheets — they interrupt to take an answer, where
these are read alongside what they cover.

---

## 2026-08-05 — "None available" is a per-category fact, never inferred from the wardrobe being non-empty (§7) [bug fix]

**What**: `layerGapFor()` replaces the wardrobe-wide `clothing.length === 0`
check with three per-category states — `none-owned` (generic advice),
`none-available` (owned but all marked unavailable) and `none-suitable`.
Copy leads with the slot: "Jacket — none available, layer up or pick up the
pace to stay warm". A `none-available` category also adds a note naming the
toggle that caused it. Bottoms and waterproof shoes take the same treatment.

**Why**: the old flag was global, so adding a single midlayer flipped it for
every slot and the card began asserting "No available jacket for these
conditions" to someone who had never entered a jacket. That reverses the
burden of proof: only the user marking gear unavailable can make "none
available" true, and everything else is the app inventing a wardrobe it was
never told about. The previous behaviour was deliberate — a test asserted it
by name — but it conflated "you own none" with "yours are all in the wash".

**Resolution**: never widen a gap check back to the whole wardrobe; owning
one category says nothing about another. `isGenericAssumption` stays tied to
`none-owned` only, so the "generic picks" note still means what it says. Both
states are pinned by their own tests. Umbrellas keep a flat check because
they are a single category, where the two questions genuinely coincide.

---

## 2026-08-05 — Tab back gesture walks tab history; recommended picks open a read-only gear detail dialog (§4, §9.3) [bug fix, design]

**What**: `MainTabs` sets `backBehavior="history"`. Today's pick chips render
the §3.3 40px thumbnail (was 20px), cap their width and let their label wrap,
and an owned pick is now tappable, opening `GearDetailSheet` — a centred
read-only dialog with a large photo and the item's properties.

**Why**: React Navigation's tab default is `firstRoute`, which sent every
Android back gesture to Today from wherever you were, so back never meant
"back". Separately, a 20px photo is too small to recognise your own jacket
by, which is the entire reason the card shows a photo instead of a category
glyph — and a chip with no width cap pushed long fallback copy past the
card's edge.

**Resolution**: the dialog is deliberately read-only. Editing stays in the
Gear tab's forms, which own validation, photo replacement and the
unavailability sheet — duplicating any of that here would mean two places to
keep correct. It is a centred dialog rather than a `SidePanel` because it
details the chip you just tapped; side panels are for reference material read
alongside a screen. Case enum values with `sentenceCase()` at the data level,
never `textTransform: "capitalize"`, which is per-word and renders composed
values as "8 Of 10".

---

## 2026-08-06 — A saved location repaints the whole app in its mood, and mood changes cross rather than cut (§9.1.3)

**What**: `useAmbientWeatherStore` gained an `override` slot that wins over
the ambient reading; the saved-location detail screen publishes its suburb's
weather there while open, so the background, sky, header and tab bar take
that mood alongside the cards. Mood changes now fade — `useMoodTransition.ts`
slices the crossing 8 ways over ~1.8s and `useTheme()` returns the blend — as does `useWeatherTheme()` for a card whose mood is the one the
app is crossing to, so the cards don't snap while the chrome fades.

**Why**: this reverses the previous day's explicit call that a pinned reading
never repaints the app, on request. Tinting only the cards was the worse half
of both options: two blue rectangles on a warm screen read as a rendering
fault rather than as "it's cold there". Cutting between two full-screen
palettes in one frame read as a glitch, hence the cross-fade.

**Resolution**: exactly one override holder at a time, last-writer-wins,
released on *blur* rather than unmount so leaving the tab releases it too. The
mood switches in one step: cross-fading it was built twice — a per-frame JS
blend, then a single `Animated.Value` painting `Animated.View`s — and removed
both times, on the user's call after testing each on a device. The reason is
the palette, not the animation: between the dark palettes `bg` moves 11 RGB
units mild→cold against `accentWalk`'s 251, so the tokens covering large areas
cannot read as a gradient, and the one that can only appears on text and icons.
Re-measure that table before rebuilding this; if the mood should read more
strongly, widen the background tokens in `moodOverrides` instead. Every card
also reads `useTheme()` now — the per-card `useWeatherTheme()` hook is gone,
because a card resolving its own mood during render repainted a commit ahead
of chrome waiting on the override, which lands from an effect.

---

## 2026-08-06 — Locations and Gear are tab-nested stacks; their sub-views are real routes (§4, §9.2)

**What**: the Locations detail/add views and all four Gear add/edit forms were
`useState` modes that replaced their list in place. They're now routes on a
native stack nested inside each tab (`LocationsStack`, `GearStack`), with one
`GearItem` route discriminated by kind serving all four gear types.

**Why**: a mode isn't reachable by the system back gesture, doesn't unmount
when you leave, and has to hand-roll its own back control — so swiping back
from an open location or gear item did nothing (or dropped you out of the
tab), and the weather-mood override only released when the on-screen back
button was tapped.

**Resolution**: nested inside the tab, not pushed onto the root stack, so the
tab bar stays and this is still the Locations tab one level down. Header
chrome comes from one shared `themedHeaderOptions` factory; `headerParts.tsx`
holds the logo and header buttons because MainTabs ↔ stack imports were a
cycle. Add a sub-view as a route from now on — the mode pattern is gone from
these two tabs and shouldn't come back.

---

## 2026-08-07 — Manual lat/lng fields removed; the web map wraps Leaflet's longitude (§4, §2)

**What**: the "Advanced — set exact coordinates" disclosure and its two inputs
are gone from `LocationForm`; coordinates are now only ever set by address
search or a dropped map pin, and held as internal state. Separately,
`LocationPickerMap.web.tsx` wraps the longitude Leaflet hands it, and
`useRightNow` no longer reports `refreshing` during a cold start.

**Why**: the coordinate fields read as visual noise on a form whose other two
fields are plain English, and both paths that set them already work. The
longitude wrap is a real bug: Leaflet reports longitude *unwrapped* across
world copies, so the short pan west from Auckland to the Americas yields
+286 rather than −73.99 and Google's Geocoding API answers `INVALID_REQUEST`
— verified against the live API — which read as the web map not recognising
anywhere in the USA. `react-native-maps` normalises this, so native was fine.

**Resolution**: wrapped where the coordinate enters the app, not where it's
sent, so an out-of-range longitude can't be stored on a location and break its
weather fetches later; pinned in `wrapLng.test.ts`. Note the removal leaves the
map picker as the *only* way to save a location outside New Zealand, since
address search is region-restricted (`placesService.ts`) — if that becomes a
problem, widen the region codes rather than restoring the fields, and read the
`getSeason()` caveat there first.

---

## 2026-08-07 — Back chip hugs the edge on a phone; Today's setup prompts collapse behind a disclosure (§9.2, §4.1)

**What**: `HeaderBackButton`'s left inset is now viewport-dependent —
`BACK_INSET_NARROW` (6) below `CONTENT_MAX_WIDTH`, the old 20 above it — and
`SetupChecklist` renders its cards behind a `▸ Suggestions to personalize (N)`
disclosure, closed by default.

**Why**: the flat 20px inset from 2026-07-23 was chosen to line up with the
content margin, which reads as a control adrift from the corner on a phone
where nothing else competes for it. The setup prompts pushed Today's actual
answer — what the weather is doing — below the fold on every visit.

**Resolution**: the inset rule is pinned in `HeaderBackButton.test.ts`
(monotonic across the breakpoint); the disclosure keeps the count in its
header so collapsed never means hidden. Both are scoped to these two places —
don't generalise the inset into a token without re-measuring the wide case.

---

## 2026-08-07 — Condition pucks thinned by ground distance; planned directions condensed and collapsed (§9.3)

**What**: `thinBySpacing()` (mapGeometry) drops condition markers within
`MIN_CONDITION_MARKER_SPACING_M` (700m) of the last one kept, keyed on the
condition so a clear→rain crossing always survives. `condenseSteps()`
(navigationSteps) folds sub-25m non-decision steps into the next one, and
`StepList`'s planned view sits behind a per-leg "Directions" disclosure.

**Why**: a routed walk is one leg *per turn*, so a walk across town drew a
dozen identical weather pucks over the route line, and dumped sixty step rows
under a four-leg journey. Both are display problems, not data problems.

**Resolution**: thinning and condensing are pure functions with their own
tests; the leg data keeps every leg and every step, and the leg list below the
map still shows them all. Live (following) mode is deliberately exempt from
both — there you want the literal next instruction.

---

## 2026-08-07 — Location and saved-journey labels are optional, defaulted at save time (§3.1, §4.3)

**What**: `LocationForm` no longer requires a label to save, and clearing a
saved journey's name in the rename sheet reverts it to "origin → destination".
`placeLabel.ts` holds `shortAddressLabel` / `resolveLocationLabel` /
`defaultRouteLabel`.

**Why**: an address already names a place, and requiring a second name for it
was a gate with nothing behind it.

**Resolution**: the default is resolved **at save time**, so
`SavedLocation.label` stays a required non-empty string and nothing downstream
(pickers, subtitles, a11y labels, the sync payload) learns about an unnamed
location. Consequence: editing the address later won't re-derive the label —
by then it is the name the user knows the place by. Don't make the column
nullable to "fix" that.

---

## 2026-08-07 — One `BottomSheet`, lifted by the keyboard's own reported height (§9.3)

**What**: the four hand-rolled bottom sheets (the Plan screen's place picker,
Journey Detail's "Mark this spot", both of Saved journeys') are now one
`BottomSheet` component, whose backdrop takes `useKeyboardInset()` as bottom
padding and caps the sheet against the space actually left over.

**Why**: a sheet anchored to the bottom of the screen puts its text field
exactly where the software keyboard appears. `KeyboardAvoidingView` is the
usual answer and is wrong here: inside a `<Modal>` on Android the measurement
is against a window `adjustResize` never resizes.

**Resolution**: reading `Keyboard`'s reported height and turning it into
padding sidesteps the layout question entirely; the hook no-ops on web, where
the browser handles an obscured input itself. `SidePanel` stays separate — it
slides from the right and is a panel, not a sheet. New sheets go through
`BottomSheet`.

---

## 2026-08-07 — Transit board/alight points are route data, drawn at every zoom (§9.3, §2)

**What**: `routesService` now extracts each TRANSIT step's departure/arrival
stop coordinates into `RouteStep.transitStops`, carried through `planJourney`
onto `JourneyLeg.transitStops` and drawn on both maps as rotated squares —
filled for boarding, hollow for alighting.

**Why**: both basemaps draw their own station pucks, but only past roughly
zoom 16, so on a map framed to the whole commute the two points a transit
journey actually turns on were the only things unmarked.

**Resolution**: no field-mask change was needed — `location` already sits
inside the `transitDetails` subtree the mask requests. Another `legs` JSON
addition, so no migration; absent on anything planned before this, and a stop
with no usable coordinate is dropped rather than pinned at Null Island. The
square shape is deliberate: every other marker on these maps is a disc.

---

## 2026-08-07 — Full-screen map renders a second JourneyMap rather than reparenting the embedded one (§9.3)

**What**: a "Full screen" chip on Journey Detail's map opens
`FullScreenMapModal` — the same map at full height with the turns as a
translucent bottom overlay, pageable by leg, showing live ETA and the
highlighted next step while following.

**Why**: the embedded map is 280pt above a column of cards, which answers
"where does this route go" and not "which way now".

**Resolution**: the modal mounts its own `<JourneyMap>` from one shared
`mapProps` object rather than moving the embedded one — both implementations
key their camera off their own mount, and a native MapView remounts on
reparent anyway. Long-press annotation capture is deliberately *not* passed
through: its sheet can't render over a full-screen modal, and marking a spot
is a planning action. Leg paging is derived state with an explicit override,
not an effect — this repo's lint forbids `setState` in an effect body.

---

## 2026-08-07 — Durations read as hours and minutes app-wide (§9.0.1)

**What**: `formatDuration()` / `spokenDuration()` in `lib/formatDuration.ts`,
used by the journey summary, the leg rows, the live journey bar and the
full-screen overlay. "95 min" is now "1 h 35 min".

**Why**: every duration in the app is stored in minutes and every screen
printed them raw, which past an hour is a quantity the reader has to do
arithmetic on rather than one they can read.

**Resolution**: hours only appear when there are any, so sub-hour durations
are unchanged; never returns "0 min", since a leg that claims to take no time
reads as a bug. `spokenDuration` exists because a screen reader saying "h" as
a letter is not a duration — use it in `accessibilityLabel`, not the
abbreviated form.

---

## 2026-08-07 — Condition pucks: suburb-scale spacing, offset off the route, never on a stop (§9.3)

**What**: `MIN_CONDITION_MARKER_SPACING_M` goes 700 → 1500; pucks are offset
`CONDITION_MARKER_OFFSET_M` (70m) perpendicular-right of the route's local
bearing; any puck within `CONDITION_MARKER_STOP_CLEARANCE_M` (250m) of a
transit stop is dropped. Supersedes the 700m spacing set earlier the same day.

**Why**: at 700m and centred on the line, the pucks still appeared several
times per walk, sat on top of the route they described, and collided with the
stop markers — which are the more actionable of the two.

**Resolution**: 1500m is a suburb's width across most of Auckland. Doing this
by *actual* suburb would need a `reverseGeocodeSuburb` call per marker per
journey — a billed call to answer a question the geometry answers well
enough — and a genuine weather change is never thinned away regardless
(`thinBySpacing`'s `keyOf`), so "one per suburb, or per change" is the
outcome. The offset is fixed metres because neither map exposes a zoom-aware
marker offset; it collapses back onto the line at city zoom, where the line is
a hairline and there was nothing to collide with.

---

## 2026-08-07 — Transit stop markers carry their vehicle glyph (§9.3)

**What**: `MapTransitStop` gains `mode`, and the marker grew from a 16px
rotated square to a 22px rounded square holding the bus or train glyph from
`modeIconPaths.ts`. Boarding is filled, alighting hollow.

**Why**: a bare shape said "a stop" but not "a stop for what", which on a
multi-modal journey is the thing you need.

**Resolution**: the rounded square stays deliberately non-circular — every
other marker on these maps is a disc, so shape alone still separates a stop
from a weather puck. Native `transitStopMarker` and `leafletIcons`'
`transitStopDivIcon` are the same marker twice; keep them in step.

---

## 2026-08-07 — One `JourneyDirections` list per journey, leg-then-turn (§9.3)

**What**: the per-leg "Directions" disclosures are gone. One list below the
leg list, two levels: a leg row carrying **duration and temperature**, and its
turns underneath carrying **instruction and distance** and nothing else.
`stepRepeatsLabel()` drops a step that only restates its leg's label; waits
are omitted; `StepList` is now live-only. Supersedes the per-leg disclosure
introduced earlier the same day.

**Why**: directions split under each "Walk to <stop>" heading made four short
lists out of one route, headed by the leg label rather than by what you
actually do — and a turn-and-street-name is the thing you need at a junction,
not a timestamp and a temperature on the same row.

**Resolution**: legs with no turns (a bus ride) still get a leg row — a
directions list that skips the bus has a hole in it. The temperature appears
once per leg, never per turn. Live mode keeps its own pinned three-turn list
under the map, because "the literal next instruction" is a different question
from "what does this journey involve".

---

## 2026-08-07 — Full-screen map has a planned mode and a recentre control that starts following (§9.3)

**What**: `FullScreenMapModal` takes the whole `Journey` and branches on
`following`: planned shows origin→destination, the departure/arrival window,
the total duration and the full `JourneyDirections` (collapsible down to its
header); following shows the live arrival line and the next four turns. Both
maps gained a recentre chip.

**Why**: the modal previously only had a live-ish overlay with a leg pager,
which said nothing useful on a journey you hadn't started — and there was no
way to get the camera back on yourself once you'd panned, or to start
following from the map at all.

**Resolution**: the planned overlay reuses `JourneyDirections` rather than
copying it, so there is one directions component in the app. `recentreOnMe()`
is one handler shared by both maps and covers both states — mid-journey it
re-locks the camera after a pan, before departure it *starts* journey mode,
which is the only way a recentre button can mean anything on a journey you
haven't set off on. It's withheld entirely when tracking is impossible
(`untrackable`, permission denied, read-only), because a control that can only
fail isn't worth offering.

---

## 2026-08-07 — Web location picker is an inline combobox, not a modal (§4.3, §9.3)

**What**: new `SavedLocationPicker.web.tsx` — the Plan screen's origin/
destination field *is* the text input on web, with saved places and Places
results in one dropdown beneath it. No modal. Native keeps its bottom sheet
but now passes `autoFocus`, so one tap opens it ready to type.
`AddressAutocomplete` grew `autoFocus`, `onFocus`/`onBlur`,
`selectTextOnFocus` and `extraRows` to support both.

**Why**: on web the sheet cost two clicks to do one thing — open it, then
click the input inside it — and threw a modal over the window to pick from a
list. A combobox is the pattern the web already has, and it's keyboard
reachable in a way a Pressable-that-opens-a-Modal never was.

**Resolution**: the first cut blanked the field on focus and restored it on
blur; RNW does not fire blur reliably in a tree re-rendering underneath it,
so the field looked empty while the value was still set. The rule now is that
**nothing the user can lose depends on blur** — the text stays put and
`selectTextOnFocus` makes the first keystroke replace it. Blur only closes the
dropdown and drops an abandoned query, both cosmetic. Keep the two picker
files in step; the dropdown is in normal flow, not absolutely positioned,
because the Plan screen's route rail measures the gap between these fields
(`PICKER_FIELD_CENTER_Y`) and an overlay would be clipped by the scroll
container.

---

## 2026-08-09 — Consecutive transit walk steps merge into one named leg (§5.6, §2)

**What**: `parseTransitSteps` now swallows a whole run of consecutive WALK
steps into a single leg — summed duration, joined geometry, and every turn
instruction from all of them — named from the next ride's departure stop, or
the destination when nothing rides after it. `encodePolyline` was added to
`annotations.ts` to make the geometry join possible.

**Why**: a real Titirangi→Grafton journey came back as fifteen legs, six of
them labelled "Walk to stop", because Google splits one continuous walk into a
step per geometry change and the old code made a leg of each. Worse, each of
those legs carried one coarse instruction that duplicated its own label, so
`stepRepeatsLabel` filtered it out and the directions list was empty.

**Resolution**: the same journey is now four legs with real names, and the
directions carry actual street-level turns. Polylines are decoded and
re-encoded rather than string-concatenated — they're delta-encoded against
their predecessor, so joining them as text puts the second half in the sea;
`annotations.test.ts` pins that, and its hand-rolled test-local encoder was
deleted in favour of the real one.

---

## 2026-08-09 — Rail lines use their full name; leg fragments lose their article (§9.0.1)

**What**: transit line naming prefers `nameShort` for buses (a route number,
"15") and `name` for trains (a line name). `legShortLabel` strips a leading
article from what it extracts.

**Why**: AT's `nameShort` for rail is a bare code, so the app said "Waiting for
the West" as though West were a place. And every alert reads "on the <x> leg",
so a label that already began with an article produced "rain on the the 15
leg".

**Resolution**: both pinned in tests. If a third vehicle type appears, pick its
side of the bus/train split by asking what a rider would say out loud.

---

## 2026-08-09 — Leg list rebuilt as a connected timeline (§9.3)

**What**: `LegRow` is now a row on a rail — departure time in a fixed left
column, a node carrying the mode glyph, a continuous line joining consecutive
nodes, detail to the right, one surface for the whole itinerary. Duration is
joined by distance. The section is titled "Route"; "Directions" below it is the
turn-by-turn.

**Why**: it was a stack of identical free-standing cards with no thread between
them and no clock times — nothing said which came first except their order.
Every transit app people already know (Google Maps, Citymapper, Transit) draws
an itinerary as a rail, and borrowing that convention is the point.

**Resolution**: the rail column needs `alignSelf: "stretch"` — the row is
`alignItems: flex-start`, so without it the column collapses to the node's own
30px and the rail's `bottom` resolves against that, leaving the thread stopping
just under each node. Verified in the DOM (rail segments span 40–60px between
nodes, and the first/last are correctly hidden). Don't reintroduce a per-leg
card: the shared surface is what lets the rail run.

---

## 2026-08-09 — Today's journey card summarises instead of listing every leg (§9.4)

**What**: the per-leg weather chip strip is replaced by one line — total
duration, the modes involved, and the temperature range with the worst
condition's icon.

**Why**: one chip per leg reads nicely for a three-leg commute and collapses
past about six. A fifteen-leg journey wrapped to four rows of "12° → 12° →
12° → …" to say that it is twelve degrees the whole way.

**Resolution**: a summary card owes the reader the shape of the trip and
whatever varies; per-leg detail belongs on Journey Detail, which is built for
it. The row is a fixed length whatever the leg count — keep it that way.

---

## 2026-08-09 — Map markers settle after the map is ready; hint chip dodges platform furniture (§9.2)

**What**: `tracksViewChanges` now stays on until the map reports ready *and*
`MARKER_SETTLE_MS` (1500, was 500) has passed. The "hold/right-click to mark a
spot" hint moved to top-left on native and stayed bottom-left, raised, on web.
The off-route state is no longer also printed in the journey bar.

**Why**: the origin marker shipped as a solid accent disc with its travel-mode
glyph missing — the signature settled before the react-native-svg child had
rasterized, and a marker that mounts with tracking already off freezes blank.
The hint sat on Google's logo and attribution. And off-route was stated twice,
once without an action attached.

**Resolution**: under-waiting doesn't degrade a marker, it blanks it, so the
delay is deliberately generous. The two maps have genuinely different
furniture — Leaflet's zoom control is top-left (measured at x 10–44), Google's
logo is bottom-left — so each file dodges its own rather than sharing a
position that is wrong on one of them.

---

## 2026-08-09 — A journey opening with an unsittable wait defers to the first service (§5.6)

**What**: `deferToFirstService` (`lib/deferDeparture.ts`) runs on the assembled
legs before any clock time or forecast is stamped. When a journey *opens* with
a stationary wait of `LONG_WAIT_MIN` (45) or more, the wait is cut back to
`PLATFORM_BUFFER_MIN` (5) and the departure moves forward by the difference —
so the service stays exactly where Google put it and the walk is scheduled
backwards from it. `planJourney` returns a `deferred` descriptor and the Plan
screen says so in an alert; it is never silent.

**Why**: asking for a bus at 12:08 am returned "walk 23 min, wait 5 h 21 min,
catch the 5:52". Every number was right and the itinerary was a fiction —
nobody walks to a stop at half past midnight to stand there until dawn. Left
alone it poisoned everything downstream: a 6 h 34 min "duration", a leave-by
notification firing immediately, a gear engine dressing the user for five
hours in the wind, and midnight's forecast on a walk that happens at dawn.
This is what every transit app does — Google Maps says "Departs 5:52 AM".

**Resolution**: fixed at the source rather than in each consumer, which is why
one change corrects duration, notification, gear and per-leg weather at once
(verified live: the same trip became 5:23 am → 6:41 am, 1 h 18 min, "5 min
waiting in the wind"). Deliberate limits: only a *leading* wait defers — a
long wait after a ride is a transfer, the departure is behind you, and moving
it would move a service already caught; those are surfaced instead by
`longTransferWaitMin` on the journey summary. It does not re-query Google at
the new time, because the service being anchored to is the one Google already
returned, so the itinerary is the same one. It does not run on §5.1's
cached-structure fallback, where a stored wait leg has no live service time
behind it and shifting would be guesswork.

---

## 2026-08-09 — Mascot companion is responsive, not needy: no decay, no neglect state (Section 13.9)

**What**: building Phase 21's mascot with an interactive care loop — it can be
tapped, reacts to touch, and remembers recent visits — but with no hunger,
no happiness meter that falls over time, and no sad/neglected state. The
request was for "a pet the user can take care of".

**Why**: a companion that degrades when unattended converts an app you can
finish in ten seconds into an open obligation, which cuts against the whole
premise of answering "what do I wear today" and closing it. It would also be
the first thing in the app that manufactures a reason to open it rather than
serving one.

**Resolution**: affection is earned, never lost — visiting, tapping, and
weather events raise a warmth value that plateaus and stays. Every state in
Section 13.9's table remains weather-derived; care only modulates
expressiveness. If a decay loop is ever wanted, add it as a Settings opt-in
with a new entry here, rather than lowering the floor on the existing value.

---

## 2026-08-09 — The visual refresh lands screen by screen, Journey Detail first (Section 9)

**What**: the app-wide restyle is sequenced one screen at a time rather than
applied in a single sweep, starting with Journey Detail and only rolling
outward once its vocabulary is accepted.

**Why**: the tokens in `src/theme/tokens.ts` and the shared shells
(`ScreenSurface`, `SidePanel`, `ScreenPattern`) mean any real change is global
by construction, so a full sweep is all-or-nothing to review and expensive to
walk back if the direction is wrong.

**Resolution**: Journey Detail is the pilot because it is the densest screen
and exercises the most shared components; changes land in the tokens and
shared shells, not in one screen's local styles, so the rollout is mostly
verification. A future contributor extending the look should change the token
or the shell, never restyle a screen in place.

---

## 2026-08-09 — Numbers are tabular; the type scale gains a display step and an eyebrow (Section 9.2)

**What**: `TYPE` gained `display` (34/700) and `eyebrow` (11/700, uppercase,
tracked), explicit `lineHeight`/`letterSpacing` on every role, and a `NUMERIC`
fragment carrying tabular figures. `RADIUS` went 12→16 (card) and 8→10 (pill);
`SPACING` gained `xxxl`. Journey Detail's departure time is now the display
numeral, with arrival supporting it.

**Why**: Section 9.2 specified sizes and weights only, so the app's actual
content — clock times, degrees, durations, wind speeds — was set in
proportional digits at prose tracking. A column of times read ragged and a
ticking one changed width as it ticked.

**Resolution**: seven near-identical local `sectionLabel` definitions
(`FormSection`, `TodayScreen`, `JourneyDetailScreen`, `LocalForecastPanel`,
`GearMultiSelect`, plus two in Journey Detail) now read from `TYPE.eyebrow` or
`commonStyles.sectionLabel`. Add a role to the scale rather than a local copy;
Settings' larger `sectionTitle` is deliberately left alone, being a page
heading rather than a label over one block.

---

## 2026-08-09 — `tonal` is the accent's second weight; its label is derived, not the accent (Section 9.1, 9.6)

**What**: added a `tonal` `AppButton` variant and a shared
`selectedChipStyle`/`selectedChipLabelStyle`, both an accent wash with an
accent-*derived* label. Nine files had declared a full-strength
`{ backgroundColor: accentWalk, borderColor: accentWalk }` selected state
independently; all now read from the shared pair. Journey Detail's "Follow
this journey" became tonal.

**Why**: Plan shows three selected segments at once and Journey Detail put a
pink departure time directly above a pink CTA — six full-strength accents on a
screen means none of them is primary, and the real primary action had no way
to outrank them. The obvious fix, an accent label on an accent wash, measured
4.02:1 (dark) and 3.89:1 (light), both under AA; light mode's accent only
reaches 4.81:1 on pure white, so any tint sinks it.

**Resolution**: `onTonal()` and `tonalFillAlpha()` in `tokens.ts` derive the
label and fill from whatever accent is live, so they follow the mood override
that turns the accent blue or gold instead of stranding a pink label on a blue
chip. Verified 5.2:1–8.7:1 across all six accent/theme combinations and pinned
in `tonalContrast.test.ts` — re-measure rather than eyeball if the shift
amounts change.

---

## 2026-08-09 — Tab bar items sit on the content measure, not the window's (Section 9.2)

**What**: `MainTabs`' custom `TabBar` now measures and lays out its four items
inside a `CONTENT_MAX_WIDTH` row, centred, while the bar's fill and top border
still span the window. The travelling indicator is measured and positioned
inside that row.

**Why**: the items were `flex: 1` across the full bar, so on the web build at
desktop width the four tabs strung out to the far corners with no relationship
to the 600pt column above them, and the indicator made a ~900pt trip between
neighbours.

**Resolution**: the row is the measured element, so the indicator's slot maths
needs no separate cap. Anything else added to the bar should go inside that
row rather than re-deriving its own width.

---

## 2026-08-09 — Disclosures use a real chevron; empty states lead with a primary action (Section 9.0.1, 9.2)

**What**: `ActionIcon` gained `chevronRight`/`chevronDown`/`chevronUp`,
replacing inline "▸"/"▾"/"▴" text glyphs in four screens. Today's setup
disclosure is now "Finish setting up" with a count pill rather than
"Suggestions to personalize (3)". The five empty states whose only action was
a `secondary` button (Locations, and the four gear lists) now use `primary`,
and Locations' empty state no longer repeats the tab header's own title.

**Why**: the text glyphs rendered at the font's weight and baseline, so they
sat light and slightly high against their labels and their size drifted with
whatever role wrapped them. "Suggestions to personalize" was two abstract
nouns for four concrete errands, against the voice guide's plain-words rule.

**Resolution**: each task still carries its own "Not now", so naming them as
setup doesn't make them an obligation. `secondary` remains correct for the
same action sitting *above a populated list*, where it has content to outrank
it — the variant tracks whether anything else is on screen, not the label.

---

## 2026-08-09 — The origin marker carries the departure mode, not the journey's dominant one (Section 9.3)

**What**: added `departureMode()` beside `dominantMode()` in `journeyMode.ts`
— the first non-stationary travelling leg's mode — and pointed Journey
Detail's `originMode` at it. Everything else (`accentColor`, re-plan mode,
`preferredMode`) still uses `dominantMode`.

**Why**: a bus commute begins with a walk to the stop, so the marker sitting
on the footpath where you're standing wore a bus glyph. The live puck already
shows the *current* leg's mode, so the two disagreed at the one moment they
should match — the moment you set off.

**Resolution**: kept as two functions rather than one, because "what kind of
trip is this" and "what am I doing at the start of it" are genuinely different
questions and the other three call sites want the first. `departureMode` falls
back to `dominantMode` when nothing is travelled outdoors; pinned in
`journeyMode.test.ts`.

---

## 2026-08-09 — App-authored gear labels are title-cased; the user's own names are not (Section 9.0.1)

**What**: new `src/lib/gearLabel.ts`. `displayGearLabel()` title-cases the
engine's generic labels ("Warm jacket" → "Warm Jacket") but only up to a
" — " clause, so "Waterproof shoes — mind the puddles" becomes "Waterproof
Shoes — mind the puddles". `displayItemName()` raises only the first character
of a name the user typed. `gearPickLabel()` routes a pick to whichever applies
and replaces four copies of the same ternary.

**Why**: Section 9.0 is explicit that gear keeps the user's own names wherever
it's surfaced, so a blanket title-case would rewrite "REI down jacket" as "Rei
Down Jacket". And the engine's labels aren't all names — several are a noun
phrase plus an explanatory sentence, which must not become Title Case Prose.

**Resolution**: applied at display time rather than by rewriting the strings in
`recommend.ts`, so the engine's output stays stable for tests and
notifications and the labels assembled at runtime are covered too. Pinned in
`gearLabel.test.ts`. A new surface showing a pick should call `gearPickLabel`
rather than reading `.name`/`.fallbackText` directly.

---

## 2026-08-09 — Facts are separated by space, not by a dot (Section 9.2, 9.0.1)

**What**: removed the "·" divider everywhere it separated facts — as a
rendered dot View (Today's journey card, Journey Detail's summary, the "Right
now" detail row) and as a character inside a string (leg rows, directions
summary, gear list subtitles, Plan and saved-journey stop counts, Settings'
seasonal counts, the live ETA line).

**Why**: the pieces being divided are already distinct shapes — a duration, a
row of mode glyphs, a weather chip, a badge — so the dots were punctuating
things that didn't need it.

**Resolution**: where the parts are separate components the gap does the
work, widened to `SPACING.lg` so it clearly exceeds the tighter gaps *inside*
each group. Where they share one string a comma replaces the dot, since
removing it outright ran the words together; the two `WarmthSlider` anchors
take an em dash, being a label and its gloss rather than two peer facts.

---

## 2026-08-09 — Today's journey card badges a climate-controlled leg (Section 9.4)

**What**: the compact journey card's summary row now shows an "AC" (or
"Heated") badge when any indoor, non-stationary leg has `climate` set, using
the same test LegRow applies per leg. `unconditioned` doesn't qualify.

**Why**: Section 9.4 kept the card to duration/modes/temperature, and a heated
or air-conditioned stretch is the one thing on it you cannot infer from the
weather — it's the difference between dressing for 13° and dressing for 13°
plus twenty minutes of bus AC.

**Resolution**: one badge for the trip, not one per leg — the per-leg detail is
a tap away on Journey Detail. AC wins when a trip has both, being the one that
changes what you'd wear outdoors. The badge is tonal (`acBadge` token through
`withAlpha`/`onTonal`) so it doesn't compete with the departure time.

---

## 2026-08-09 — The tab indicator is a proportion of its slot, with no maximum width (Section 9.2)

**What**: dropped `INDICATOR_MAX_WIDTH` (104) from `MainTabs`. The travelling
pill is now `slotWidth - INDICATOR_GUTTER * 2` at every width, with the gutter
left at its original 6.

**Why**: the cap existed to stop the pill stretching across a desktop-width
slot. Once the item row itself was capped at `CONTENT_MAX_WIDTH` a slot can't
exceed ~150pt, so the cap only had the effect of making the pill float in the
middle of its slot on desktop while filling it on a phone.

**Resolution**: the gutter is the single control now — it sets the proportion
(~0.87 of the slot) at every width, so widening it shrinks the pill
*everywhere*, including on phones where nothing was wrong. Measured 81.75pt at
375 (unchanged from before) and 138pt at 600.

---

## 2026-08-09 — A hairline rule separates peer facts (Section 9.2)

**What**: supersedes today's "Facts are separated by space, not by a dot".
The middots stay gone, but bare whitespace is replaced by `MetaDivider`, a
short dim hairline rule, in the three summary rows that carry peer facts
(Today's journey card, Journey Detail's summary, the "Right now" detail row).
Row gaps come back down from `xxl`/`lg` to `sm`.

**Why**: whitespace has to be large enough to read as a boundary, and at that
size the row stopped looking like one line of related facts and started
looking like items that had drifted apart — while still being ambiguous,
since the groups inside it (mode glyphs, a weather chip) have their own gaps.

**Resolution**: a rule is structure rather than punctuation, so it reads at a
small gap and doesn't sit on the baseline pretending to be a character. It is
deliberately short (12pt) and drawn in `border`, and it's hidden from
accessibility — the spoken summary already reads as a sentence. Reach for
`MetaDivider` rather than reintroducing a character separator.

---

## 2026-08-09 — The tab indicator spans its row; `top: 6` was double-counting the bar's padding (Section 9.2)

**What**: `indicatorStyle.top` goes from 6 to 0, so the travelling pill spans
the item row exactly and the icon and label sit inside it on the tab item's
own 4pt padding.

**Why**: the 6 was calibrated when the indicator was a direct child of the
outer bar. Moving it inside the `CONTENT_MAX_WIDTH` item row earlier today
left it stacking on top of that bar's own 6pt `paddingTop`, so the pill
started below the icon — measured at icon top 860 against pill top 862, which
is visible as the icon breaking out through the top of the pill.

**Resolution**: the pill's height is now the row's height, so it can't drift
again if the bar's padding changes. Verified by measurement rather than by
eye: 4pt clearance above the icon and below the label, fully contained on all
four sides. A width change and a height change went unnoticed here in one
session — measure both when this moves.

---

## 2026-08-09 — The day boundary is drawn through the hourly band, not as a gap in it (Section 9.5)

**What**: `HourlyForecastRow`'s day separator moves from a faint full-height
rule sitting inside a 12pt inter-group gutter to a hairline placed *between*
groups with the cells flush either side of it, offset down past the day-name
row so it divides hours rather than the two day labels.

**Why**: the run flags right above it go out of their way to compute night
runs against the flat reading list rather than per day group, precisely so a
night starting before midnight and ending after it renders as one continuous
tinted block — and then the gutter cut that block in half at exactly midnight,
which is the one place it is trying hardest to read as continuous.

**Resolution**: the trailing clearance the last group got from `hours`'
`paddingRight` moved to the strip's `contentContainerStyle`, since the padding
had to go for the break to sit flush. The label row's height is now an
explicit constant (`LABEL_BAND`) because the break offsets past it by height —
change one and the other has to follow.

---

## 2026-08-09 — Today's "Right now" card leads with the temperature, not its own title (Section 9.3.1)

**What**: the temperature moves from a hardcoded `fontSize: 24` to §9.2's
`display` role with tabular figures, the condition label from
caption-weight `textSecondary` to `subtitle` in `textPrimary`, the weather
glyph from 26 to 34, and the card's own "Right now" heading down to an
eyebrow.

**Why**: this is the highest-traffic card in the app and the one number it
exists to give you was set smaller than the app's own `title` role, while the
words "Right now" sat above it at nearly the same weight — so the card opened
with two things competing and led with the less interesting one.

**Resolution**: the hero is the reading, and the heading is a signpost. This
is also the first use of the `display` step outside Journey Detail; a screen
gets at most one, so anything else added to this card stays below `subtitle`.
`picksHeading` was a sixth local copy of the eyebrow and now reads
`TYPE.eyebrow`; the dead `detailSeparator` style left over from the middot
removal is gone.

---

## 2026-08-09 — A diverging feels-like or notable wind lights up as a tonal fact chip (Section 9.3.1, 9.6)

**What**: the "Right now" detail row's two facts each take a tonal chip when
their reading is the one worth acting on — `feelsLikeDiverges()` (already
existed, previously only bold text) and `windKph >= HIGH_WIND_KPH` (new). Both
use the same treatment.

**Why**: the feels-like emphasis was weight-and-colour only and read as barely
distinct from the plain line, and wind had no emphasis at all despite being
half of what the row is for. One shared treatment rather than two, because
both say the same kind of thing — this reading is out of the ordinary — and
two different emphases would imply two different severities.

**Resolution**: reuses `HIGH_WIND_KPH` (Section 7), whose own comment already
names it as Section 9.3's leg-badge wind-display threshold, rather than
inventing a display threshold beside it. The chip is `conditionLight` — the
app's existing "notable, not severe" hue (Section 9.1 gives it Windy/Foggy/
Light rain and the UV badge) — deliberately not `accentWalk`, which is
reserved for primary interactive emphasis and would read as tappable. Fill,
weight and colour all move together and the figure is stated in words either
way, so Section 9.6 holds; the pairing is pinned in `tonalContrast.test.ts`
and measured at 7.08:1 live.

---

## 2026-08-09 — One tonal vocabulary for "out of the ordinary"; the UV and wash badges join it (Section 9.1, 9.6)

**What**: extracted `notableFillStyle`/`notableLabelStyle` into
`commonStyles.ts`, defaulting to `conditionLight` and taking any tone. The
"Right now" fact chips, the UV badge and the gear wash reminder now all read
from it. The UV badge and wash reminder were solid `uvBadge` fills with white
or primary text; both are now tonal in that same hue.

**Why**: four things meaning "this is out of the ordinary" looked four
different ways, and `uvBadge` had quietly become a general-purpose attention
fill for three unrelated facts. The solid version was loud enough that a UV
number — present only sometimes — outshouted the temperature beside it, which
is the actual headline of that card.

**Resolution**: the helper carries the rule in its own comment — use it only
where the engine has *already* decided a value is exceptional (a named
threshold, a divergence check), never for a value that merely looks
interesting, and never more than a couple per screen. A highlight only means
anything while it stays rare. Both tones are pinned in
`tonalContrast.test.ts`.

Deliberately **not** converted, so this doesn't become "highlight everything":
LegRow's wind figure is already gated on `HIGH_WIND_KPH`, so its mere presence
is the highlight and a chip inside a comma-joined line would read worse; the
transit delay pill is a different register (a late service is about a service,
and it carries an early/late distinction this vocabulary has no room for); and
the condition badges keep their severity fills, which mean something more
specific than "notable".

---

## 2026-08-10 — The mascot is a kororā in the app's own bucket hat; art constraints drove the species (Section 13.9, 9.7)

**What**: Phase 21's character is a kororā (little blue penguin), wearing the
same kōwhai-gold bucket hat as the launcher icon. Drawn as
`MascotArt.tsx` — a pure component with named groups (`body`, `arms`, `face`,
`hat`, and the four garment slots) and every pose passed in as a number.

**Why this needed a decision**: the spec is unusually complete about behaviour
— animation states, slot priority, reduce-motion fallback — and says nothing
at all about what the animal is. It also flags the art as "a genuine external
design-asset dependency", so choosing rather than blocking is itself the call.

**Resolution**: picked on the slot constraints rather than on charm. §13.9
needs a jacket, bottoms and a *held* umbrella, which requires an upright body
with a waist, legs, and limbs that can carry something. Most of the obvious NZ
birds fail that — a kiwi is a horizontal teardrop with nothing to hold an
umbrella with. A penguin is already shaped like someone standing up in a coat,
and kororā actually live on Auckland's coast, so the regional read (§2.1)
comes free rather than being decoration.

Four things the drawing got wrong that only appeared once it was rendered at
size, all worth not repeating:

- The brim was drawn wider than the penguin's own body, which reads as a
  sombrero. A bucket hat is defined by a *short* brim angled down — this is
  the one silhouette this app can't afford to get wrong.
- The garment slots were drawn behind the body, so bottoms never appeared.
- Flippers drawn inside the body silhouette in a near-body shade made the wave
  and brow-shade poses identical to idle.
- The body was dark enough that navy and black garments — two of the twelve
  swatches, and obvious choices for a coat — merged into it. The body was
  lightened rather than the swatches, which fixes all twelve at once.

The character's own palette is deliberately *not* theme tokens: it keeps its
colouring across light/dark and across the weather mood, the way a drawing of
an animal would. Only the garment slots change colour.

`MascotPreview.tsx` is a dev-only bench rendering every pose and slot
combination side by side; it is not routed anywhere and should be deleted when
Phase 21 ships.

---

## 2026-08-12 — The mascot is Antony's supplied artwork with the wings carved out of the torso (Section 13.9)

Supersedes the 2026-08-10 entry, which recorded a hand-drawn kororā chosen on
slot constraints. That character was replaced outright: Antony supplied a
finished penguin illustration, then a second version of it with a reworked
bucket hat, and the second is what ships. The species reasoning in that entry
no longer applies to anything in the codebase — only its list of drawing
mistakes is still worth reading.

**What**: `MascotBase.tsx` is that artwork's own path data, with one structural
change — the torso outline has its two wing excursions carved out, and the
wings are redrawn as separate limbs hinged at the shoulders.

**Why this needed a decision**: in the source, head, body and both wings are a
single closed outline. Nothing that forms part of a shape's own contour can be
rotated away from it, so §13.9's wave, sun-squint and umbrella-huddle states
were unbuildable as drawn. An earlier attempt rotated the wing *shading*
instead, which slid a detail mark across the belly while the flipper stayed
welded to the body — it read as the penguin sprouting a direction arrow.

**Resolution**: the wing coordinates are traced from the source path's own
curve data and the torso resumes exactly where the original branches into each
wing, so at rest the silhouette is the artwork's. Two properties are
load-bearing and easy to undo by accident: the wing's root is a straight chord
*through the pivot* (so it cannot swing clear of the body and open a gap at the
armpit), and the limb draws *behind* the torso with a full closed outline (so
the outline stops where it meets the body without any hand-tuned trimming).

The 0.93 vertical squash that shortens the character is baked into the
coordinates rather than applied as a wrapping transform. A global transform
meant the file's numbers were not the screen's, which silently invalidated a
round of pixel measurements taken against them. Consequence: y values no longer
match the supplied SVG — multiply by 0.93 about y = 143 to compare.

Several source paths are deliberately not drawn — an orphaned wing highlight,
hat marks that land on the forehead as scratches, the white wedge between the
eyes (kept but filled blue). Each is documented at its site.

`src/components/mascot/README.md` carries the working notes: the pose API, the
traps, and the remaining phases.

---

## 2026-08-12 — The engine reports its own conclusions as `Recommendation.signals` (§13.9, §7)

**What**: `recommendGear()` now returns a `signals` block — final `warmthLevel`
plus `highUv` / `windAmplified` / `isHot` — and Phase 21's `mascotStateFor()`
(`src/lib/mascot.ts`) reads only that, never the journey.

**Why**: §13.9 says the mascot maps signals "the engine already computes,
nothing new derived", but `warmthLevel` was module-private and cannot be
honestly recomputed outside `recommend.ts` — by the time it is final it has
absorbed the calibration offset, the §7.8 environment deltas, the §7.9 warmup
discount and the §6.1 AC-contrast floor. Any second implementation would be a
different number wearing the same name.

**Resolution**: one-directional and presentation-only — nothing in
`recommend.ts` reads `signals` back, and the field is assembled at the return.
Extend it only for another presentational consumer of an *existing* engine
conclusion; anything that wants to change a recommendation belongs in the
engine, not here.

---

## 2026-08-12 — Mascot motion splits across Reanimated and keyframes (§13.9, §9.7)

**What**: the mascot's body (the weight shift, any held lean, the shiver
jitter) animates on Reanimated via a wrapping `Animated.View`; its limbs and
face are held poses with explicit durations, swapped from JS. §13.9's brow-shading and fanning
hands are approximated, because the flippers cannot reach the face.

**Why**: the alternative was threading shared values into `MascotBase` and
animating `react-native-svg` props directly, which would make its "every pose
is a number passed in" purity conditional and leans on the least-supported
corner of both libraries on react-native-web — the surface this component is
actually verified on. Separately, rendering showed the limb is shoulder-mounted
and longer than the body is tall: at 48° it reads as pointing, and past ~90°
the hat brim swallows it.

**Resolution**: poses and timings live in `states.ts`, one file to change when
the art does; raises stay at or under 90° and states are distinguished by rate
and pose rather than by putting a flipper on the face. Redraw the limb in the
source art before trying to make a state literal.

---

## 2026-08-12 — The mascot shifts his weight foot to foot; he never bobs (§13.9, §9.7)

**What**: idle and every other state rock side to side about whichever foot
the lean puts the weight on, replacing a vertical bob and a sway that rotated
about the point between the feet.

**Why**: Antony asked when the floating animation made sense, and it doesn't —
a bob lifts both feet at once, which on a bird standing on the ground reads as
hovering. The sway it sat beside was wrong for a related reason: rotating
about the midpoint drives the far foot through the floor.

**Resolution**: one motion covers both, and it is physically honest — the
planted foot is pinned (measured under 0.1px at 215px) and the free one lifts.
The pivot moves by offsetting the transform rather than animating
`transformOrigin`, so it can swap feet without a jump. Anything that wants to
move the character vertically should be treated as a mistake unless he is
meant to leave the ground.

---

## 2026-08-12 — Idle is a bag of beats with rests in it, not a loop (§13.9, §9.7)

**What**: a mascot state is now a list of *beats* — frames plus body motion —
and idle deals eight of them from a shuffled bag: a weight shift, a tap of
each foot, a two-flipper ruffle, and four rests. `MascotPose` gained
`leftFootLift`/`rightFootLift`, and `MascotBase` splits its feet into a group
each so a foot can move while the torso does not.

**Why**: Antony asked for foot and flipper taps and for "little wait times
where the penguin sits still — a real living creature wouldn't be moving
constantly without rest". A single looping animation per state can express
neither. Dealing from a bag rather than running a written sequence is what
keeps a permanently-visible character from visibly coming round.

**Resolution**: the blink lives *inside* `rest()`, not as a beat of its own —
with it separate, the bag could deal every rest consecutively and did,
producing a measured eleven seconds of nothing that read as a hung view.
Idle is the only multi-beat state; the weather states stay one looping beat,
and should, since a shivering penguin has no business pausing.

---

## 2026-08-12 — A frozen snapshot keeps its mascot signals (§13.9, §3, §7.3)

**What**: `RecommendationSignals` moved to `src/types/index.ts`, gained
`hasUmbrella`, and is now stored on `RecommendationSnapshot`.
`mascotStateFor()` takes the signals block rather than a whole
`Recommendation`, so a frozen journey and a live one drive it identically.

**Why**: the mascot was wired to the live recommendation only, and
`freezeIfDue` fires on Journey Detail load — so a "leave now" journey is
frozen the instant you open it and lost its companion immediately. That is
not an edge case; it is the most common Journey Detail view there is.
Re-deriving from today's weather instead would caption last week's gear with
this morning's sky.

**Resolution**: optional on the snapshot, the same additive treatment
`layerTypes` already set, so pre-Phase-21 rows render no mascot rather than
needing a backfill. The block stays presentation-only in both directions —
if something wants to *change* a recommendation it belongs in the engine.

---

## 2026-08-12 — The mascot stands on the card he belongs to (§9.7)

**What**: both instances are positioned by `mascotFeetOffset(size)` — Today's
96pt one standing on the "Right now" card's top edge, Journey Detail's 64pt
one perched on the gear card's top-right corner. The gear-card instance is
absolutely positioned outside the card's content box.

**Why**: the artwork leaves ~11% of its height empty below the soles, so
laying either out by its box alone leaves him hovering — the exact look the
weight-shift animation was built to avoid. And a mascot placed *inside* the
gear card would have a truncating item name running under it.

**Resolution**: the swatch picker §13.9 assigns to this phase is deliberately
not shipped with it. Its own copy promises the colour "only affects how your
companion looks", which stays false until the garment overlays exist; it
belongs with them, in one change.

---

## 2026-08-12 — The mascot floats over Today's cards and hops between them (§9.7)

**What**: on Today he is absolutely positioned as the last child of a stack
holding every card, and hops to the topmost card with room for him as you
scroll (`PerchedMascot`, `useMascotPerches`). Journey Detail's instance is
unchanged — it is already a child of the card it sits on.

**Why**: laid out in the flow he was an earlier sibling than the card below,
so its background painted over his feet and he read as sunk into it rather
than standing on it. Antony asked for the feet to sit over the card and for
him to be able to move between them; both need the same thing, which is for
him to stop being a row in the stack.

**Resolution**: scroll-driven rather than timed, so he can never hop off
screen and strand himself, and pinned to the first card under reduce motion.
Perches are *declared*, not derived from the card list: he stands above the
line he's on, so a perch per card put him over the hourly forecast strip.
Today declares two, each somewhere the screen knows is clear, and `PerchAlign`
puts him at the empty end of a short row rather than centred over content.

Two platform traps are load-bearing and commented at their sites: `elevation`
is needed on top of draw order because Android ranks by elevation, and
`onLayout` must be treated as a cue to `measureLayout` rather than as data,
because on web it never fires for a view that only moves.

---

## 2026-08-12 — The mascot's sleeves are their own draw pass, over the torso (§13.9)

**What**: §13.9's paper-doll layer ships its first slot — a hooded jacket
tinted from the recommended item's `MascotSwatch`. The sleeves are drawn in a
second rotating pass *after* the body rather than alongside the flipper, and
are cut wider than the limb they cover.

**Why**: both were found by rendering. Placed with the flipper the sleeve is
invisible — the wings draw behind the torso and the sleeve covers exactly the
part of the limb the torso hides. Traced onto the wing's own curves it then
came out the same width as the blade, and the jacket body covered all but
about two units of it.

**Resolution**: `Limb` shares the rotation between the flipper pass and the
sleeve pass, and the jacket body drawn last buries the sleeve's root the same
way the torso buries the flipper's. Garment colours ride in
`signals.garments` as swatch *names*, so a frozen snapshot keeps its outfit
and the hex lookup stays with the design tokens. An unset colour renders
neutral grey and is distinguished from an empty slot by `null` versus absent.

---

## 2026-08-12 — The mascot's default garment colour is orange, not neutral grey (§13.9)

**What**: an item with no `color` set now renders in the orange swatch.
`MASCOT_NEUTRAL` is renamed `MASCOT_DEFAULT_GARMENT`, and the test asserting
the fallback was distinct from every swatch now asserts the opposite.

**Why**: §13.9 specifies "a neutral grey placeholder", on the reasoning that
the user should be able to tell the mascot doesn't know the colour. Rendered,
grey read as broken rather than as unknown — and because `color` is a Phase 21
field, the fallback is what almost every garment uses, so it is the mascot's
normal appearance rather than an edge case.

**Resolution**: Antony chose orange. The trade is explicit — an untagged item
and one tagged `orange` now look identical on the mascot, and the Gear form is
where you check what something is actually tagged. Revisit if the swatch
picker ever needs to nudge people into tagging.

---

## 2026-08-12 — The mascot's hood draws over its own shoulders (§13.9)

**What**: the jacket gained a real hood, drawn last in the garment group —
over the body rather than under it — and the body's neckline dropped to a low,
almost-horizontal line at chest height.

**Why**: the first version folded the hood into the body as a collar rising to
the hat brim, and Antony read it exactly as it was: "a shirt that goes up to
his ears". Under the body a separate hood was no better, because hood and
shoulders occupy the same part of the silhouette — only the few units
protruding past the flank showed, which looked like straps.

**Resolution**: on top, the hood's own outline is what distinguishes it from
the coat, which is the entire visual difference between a hooded jacket and a
t-shirt. The low neckline is the other half: a penguin this round has no neck,
so a collar sitting high on it never reads. Pocket seams were also mirrored —
they run high-inner to low-outer, as a pouch does; the other way they met in a
V and read as a seam down his belly.

---

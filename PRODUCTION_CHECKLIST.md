# Production readiness checklist

Tracks `docs/10-production-readiness.md` §10.6's pre-submission checklist
against what Phase 12 actually shipped in-code versus what's a manual step
in an external dashboard (Google Cloud Console, App Store Connect, Google
Play Console, a Sentry account) that no coding agent can complete from this
repo. See `DECISIONS.md`'s 2026-07-21 Phase 12 entries for the reasoning
behind each judgment call referenced below.

- [x] **No console logging of API keys or full network payloads in release
      builds** — `babel.config.js` strips all `console.*` calls from
      `production`/`preview` EAS build profiles (`eas.json` sets
      `NODE_ENV=production` on both) via `babel-plugin-transform-remove-console`.
      Audited `src/services/` and `src/db/repositories/` for logging —
      none found; the two existing `console.warn` calls
      (`src/lib/withTimeout.ts`, `src/lib/leaveBy.ts`) log diagnostic
      messages only, no keys or payloads.
- [ ] **Google Routes + Places + AT keys restricted (§10.1)** — external,
      manual: requires signing into Google Cloud Console (restrict the
      Android key to the release SHA-1 + package name, iOS key to the
      bundle ID — this now covers both Routes API and Places API (New),
      since `placesService.ts` reuses the same key rather than a second
      one) and the AT dev portal. Can't be done from this repo/session —
      needs a real release keystore's SHA-1, which only exists once an EAS
      build has actually been produced.

      **Unblocked as of the first EAS Android build (2026-07-28).** EAS
      generates and holds the keystore, so the fingerprint is now
      obtainable with:

      ```
      npx eas-cli@latest credentials --platform android
      ```

      Restriction is the *only* protection these keys have. Both are
      `EXPO_PUBLIC_*`, which means they are inlined into the JS bundle at
      build time and can be extracted from the APK by anyone who has it —
      marking them "secret" in EAS controls who can read them back in the
      EAS dashboard and build logs, nothing more. Use EAS's **sensitive**
      visibility (redacted in logs, hidden in the dashboard) rather than
      "secret", which EAS rejects for this prefix precisely because it
      would imply a protection that doesn't exist.

      **This needs TWO Google keys, not one.** An Android application
      restriction (package + SHA-1) makes a key usable *only* for Maps SDK
      calls from the signed app. Routes and Places (New) are web-service
      APIs that this app calls directly over HTTPS from the client, and
      those requests carry no app signature — so putting an Android
      restriction on the shared key silently breaks journey planning and
      address search. Google's own guidance is one key per client type.

      - **Maps key** — application restriction: Android apps, package
        `nz.co.buckethat.app` + the SHA-1 of the signing certificate. API
        restriction: Maps SDK for Android only. Supply it as
        `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, which `app.config.js` already
        prefers over the Routes key.

        **The previously recorded fingerprint is void.** It was
        `F4:D2:3E:28:23:FC:C4:04:BD:2C:47:42:BD:AA:0B:3D:08:07:55:9E`,
        read on 2026-07-28 against the old package
        `nz.co.commuteweatherplanner.app`. The 2026-07-30 rename to
        `nz.co.buckethat.app` makes that a different application as far as
        Android and EAS are concerned, so EAS issues separate credentials
        for it. Read the new one *after* the first build under the new
        package, and restrict against that:

        ```
        npx eas-cli@latest credentials --platform android
        ```

        A fingerprint is public information, not a credential — it's
        recorded here only so the restriction can be checked later.
      - **Routes/Places key** — *cannot* carry an application restriction
        while it's called from the client. API-restrict it to Routes API
        and Places API (New), and rely on quotas plus a billing budget
        alert. This key stays extractable from the APK; that is inherent
        to calling a web service directly from a client, not a gap in
        configuration.

      Note the asymmetry: the Maps key can be locked down to the point
      where an extracted copy is near-useless. The Routes/Places key and
      the AT subscription key can't be — usage monitoring and
      rotation are the only mitigations. Don't record this row as "done"
      without acknowledging that half of it can't be fully closed.
- [ ] **Google Cloud budget alert configured (§2.1)** — external, manual:
      `Billing → Budgets & alerts` in the GCP Console, $5 NZD starting
      threshold per `docs/02-external-apis.md` §2.1. Requires the GCP
      project owner's console access.
- [x] **Location permission set to "when in use," with a real usage
      string** — confirmed `src/screens/onboarding/steps/Step1Location.tsx`
      only ever calls `requestForegroundPermissionsAsync()` (never a
      background/always variant); `app.json`'s `expo-location` plugin
      config sets a real `locationWhenInUsePermission` string ("...to set
      your current location as a journey starting point"), matching
      §10.4's exact suggested copy. `expo config` confirms only
      `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` land in the resolved
      Android permission list — no background-location permission leaks
      in.
- [x] **Privacy policy URL live and linked in both store listings, crash
      reporting disclosed as opt-in (§10.5)** — `PRIVACY_POLICY.md` written
      this phase, covering exactly the four points §10.4 requires (what's
      collected, where stored, which third parties see it, crash-reporting
      opt-in status). "Live and linked" (i.e. actually hosted at a URL and
      pasted into App Store Connect / Play Console) is a manual step once
      a hosting choice is made (GitHub Pages is the spec's suggestion) —
      not something this repo can complete on its own.
- [x] **Crash reporting confirmed off by default on fresh install; toggling
      it on in Settings actually initializes the SDK (and off, actually
      doesn't)** — `src/lib/crashReporting.ts`'s `initCrashReportingIfEnabled()`
      gate, unit-tested in `crashReporting.test.ts`. See DECISIONS.md: the
      wired provider is a no-op (`NoopCrashReportingProvider`), not a live
      `@sentry/react-native` install — the on/off gating, location/label
      scrubbing, and "no telemetry connection while opted out" property are
      all real; swapping in a real DSN-backed provider later is a one-file
      change.
- [ ] **`PrivacyInfo.xcprivacy` present (iOS)** — `app.json`'s
      `ios.privacyManifests` field is filled in (`NSPrivacyTracking: false`,
      precise-location collection declared, app-functionality purpose, not
      linked to identity, not used for tracking) and resolves correctly
      through `expo config`. Marked incomplete here because Apple's actual
      "required reason API" declarations (`NSPrivacyAccessedAPITypes`, e.g.
      for `UserDefaults`/file-timestamp APIs used by `expo-sqlite`/
      `expo-file-system` and their own dependencies) can only be verified
      against a real Xcode archive build, which this environment can't
      produce — third-party Expo modules typically ship their own
      manifests that get merged automatically at build time, but that
      merge should be checked against a real build before submission, not
      assumed correct from here.
- [x] **Export/Import data flow tested round-trip (delete app, reinstall,
      import)** — `src/lib/dataExport.ts` built (see DECISIONS.md for the
      photo-relinking approach that specifically handles the reinstall
      case, where `documentDirectory` paths from the old install are
      meaningless). Per `docs/11-testing-strategy.md` §11.2, the actual
      round-trip is an explicitly manual integration test, not a unit test
      — needs a real device/simulator build to actually run, which this
      session can't produce. Marked done for the code; the manual pass
      itself is still owed before submission.
- [ ] **Offline fallback (§5.1) verified for all three APIs** — pre-existing
      from Phase 11 (see that phase's DECISIONS.md entries); the §12.2
      debug menu (`src/screens/dev/DevMenuScreen.tsx`, 2026-07-21) now
      exists and can force each of routes/weather/transit into a chosen
      error without a real outage, so this is mechanically testable now —
      but the actual pass (opening the menu, forcing each error, watching
      the fallback UI on a real device/simulator) hasn't been run from
      this session, so still unchecked.
- [ ] **Schema migrations (§3.1) tested against a fixture DB from the
      previous released version** — no prior *released* version exists yet
      (v1 hasn't shipped), so this specific check has nothing to run
      against until after the first real release.
- [x] **Unit test suite passing, `classifyWeather()`/`recommendGear()`
      coverage in particular** — 232 tests passing (`npx jest`), `tsc
      --noEmit` and `npx eslint .` both clean as of this phase.
- [x] **Light/dark/system theme toggle verified on both platforms (§9.1)**
      — built in Phase 11; `app.json`'s `userInterfaceStyle` changed from
      hardcoded `"light"` to `"automatic"` this phase so the native chrome
      (status bar defaults, etc.) actually follows the same preference the
      in-app theme system already does, closing a gap Phase 11 left in the
      native config layer specifically (the JS-level theme system itself
      was already complete).
- [ ] **Version/build numbers bumped from any prior submission** — set to
      `version: "1.0.0"`, `ios.buildNumber: "1"`, `android.versionCode: 1`
      for the first submission; `eas.json`'s `production` profile sets
      `autoIncrement: true` so subsequent builds bump automatically. Not
      checked off because "bumped from prior" has no prior submission to
      bump from yet.

## Additional items completed this phase (not on §10.6's list directly, but
required by §10.1–§10.4's body text)

- `eas.json` created with `development`/`preview`/`production` build
  profiles (§10.4).
- `app.json`: `ios.bundleIdentifier` / `android.package` set to
  `nz.co.buckethat.app`, renamed 2026-07-30 from
  `nz.co.commuteweatherplanner.app` alongside the project rename to
  bucket-hat. Still a placeholder reverse-DNS: settle it before any store
  listing exists, because bundle/package IDs cannot change afterwards.
  Changing it again means a new app identity — the installed app must be
  uninstalled rather than upgraded, EAS issues fresh credentials, and the
  Google Maps key restriction must be re-pointed.
  `android.allowBackup: true` set explicitly (§10.3, rather than relying on
  the platform default silently).
- App icon is the NZ-outdoors **bucket hat** described in §10.4 — khaki/tan,
  faceted straight-edge illustration, on the dark `bg` token (`#171B36`).
  (An earlier amber umbrella concept was replaced on 2026-07-21; this
  checklist described that stale version until 2026-07-31.) `icon.png`,
  `android-icon-foreground.png`, `android-icon-background.png` and
  `android-icon-monochrome.png` (Android 13+ themed icons) are a matched
  set; `favicon.png` is the same mark with the background removed.
- Icon padding corrected 2026-07-31. The artwork previously filled 78% of
  `icon.png` and 66% of the adaptive foreground, which left the brim sitting
  exactly on Android's safe-zone boundary — launchers that mask to a circle
  clipped it. Now 62% and 53% respectively, with the furthest opaque pixel
  of the adaptive foreground at 88% of the safe radius. **Any future icon
  edit must re-check that**: Android guarantees only the inner 66%-diameter
  circle is visible, so a bounding box that merely "fits the canvas" is not
  enough.
- `STORE_LISTING.md` drafted (App Store + Play Store copy, leading with the
  "recommends your actual wardrobe" differentiator and stating the
  Auckland-only scope in the description itself, per §10.4).

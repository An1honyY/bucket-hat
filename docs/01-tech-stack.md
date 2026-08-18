## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Expo (React Native)**, TypeScript | Managed workflow — avoids native build pain for maps/location |
| Navigation | `@react-navigation/native` (bottom tabs + native stack) | |
| Maps | `react-native-maps` (Google provider on Android, Apple on iOS) | Needs a Google Maps SDK key for Android + polylines |
| Local storage | `expo-sqlite` (preferred) or `@react-native-async-storage/async-storage` for simpler key-value | Inventory + saved locations are structured/relational → SQLite is worth it |
| State | Zustand (lightweight, no boilerplate) | Context is fine too if the agent prefers |
| HTTP | `fetch` or `axios`, wrapped by `@tanstack/react-query` | Query/cache layer for dedup, retry, and background refetch (Section 5.4) |
| Env/secrets | `EXPO_PUBLIC_*` vars in `.env`, read via `process.env` (Expo inlines them at build time); `app.config.js` for native config that needs a key, e.g. the Android Maps key | Never commit real keys. `react-native-dotenv` was listed here as an alternative and was installed but never used — removed 2026-07-29, since Expo's built-in handling is what the code actually relies on. Note `EXPO_PUBLIC_*` values are inlined into the bundle and are therefore extractable from a build — see PRODUCTION_CHECKLIST.md on restricting rather than hiding them |
| Location | `expo-location` | For "current location" as journey origin |
| Notifications | `expo-notifications` | Scheduled local "leave by" alerts (Section 7.3) — local only, no push server needed for v1 |
| Sharing / files | `expo-file-system` + `expo-sharing` + `expo-document-picker` | Data export/import (Section 10.3) |
| Gear photos | `expo-image-picker` + `expo-image-manipulator` | Capture/resize gear photos (Section 3.3) |
| Card capture | `react-native-view-shot` | Renders the shareable "Right now" card to a PNG (Section 13.2, Phase 14). Native captures to a temp file for `expo-sharing`; on web it goes through its bundled `html2canvas`, so the browser gets `navigator.share` or a plain download instead |
| Zip (export bundle) | `react-native-zip-archive` | Bundles `data.json` + gear photos into one export file (Sections 3.3, 10.3) |
| Testing | Jest via the `jest-expo` preset | Unit tests for `classifyWeather`, `recommendGear`, and friends (Section 11) |
| Crash reporting | Sentry's Expo SDK (or equivalent) | Opt-in only, initialized conditionally — never on by default (Section 10.5) |
| Vector graphics | `react-native-svg` | Mascot base art + paper-doll clothing overlays (Section 13.9, Phase 21 only) |
| Animation | `react-native-reanimated` | Drives the mascot's idle/wave/wiggle/shiver transforms (Section 13.9); also usable for any other UI motion, but this is its first real need |

---


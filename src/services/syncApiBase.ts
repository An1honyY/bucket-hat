// Where the sync API lives, for both authService and syncBackendService.
//
// Shared rather than duplicated because the two must never disagree: a
// session minted against one origin is worthless against another.
import { Platform } from "react-native";

/**
 * The base URL to prefix onto `/sync/*`, `/photos/*` and `/api/auth/*`.
 *
 * `EXPO_PUBLIC_SYNC_API_URL` wins when set. On web, an unset value falls
 * back to the empty string, i.e. same-origin relative requests — which is
 * correct because the Worker serves the web build and the API together
 * (see worker/wrangler.toml's `[assets]` block).
 *
 * That fallback isn't a convenience, it removes a real trap. `EXPO_PUBLIC_*`
 * values are inlined at build time from `.env`, and `.env` is gitignored —
 * so a cloud build (Workers Builds, CI) has no value for it unless someone
 * remembers to configure one. Without the fallback the deployed site would
 * silently report "sync isn't configured in this build" while working
 * perfectly from a local build, which is a miserable thing to debug.
 *
 * Native has no origin to be relative to, so there it stays undefined and
 * `isSyncConfigured()` correctly reports the feature as unavailable.
 */
export function syncApiBase(): string | undefined {
  const configured = process.env.EXPO_PUBLIC_SYNC_API_URL;
  if (configured) return configured;
  return Platform.OS === "web" ? "" : undefined;
}

/**
 * Whether sync can run at all. Distinct from `syncApiBase()` returning a
 * string, because the same-origin fallback is legitimately an empty string —
 * which is falsy, and would read as "unconfigured" at every call site that
 * checked the URL directly.
 */
export function isSyncApiConfigured(): boolean {
  return syncApiBase() !== undefined;
}

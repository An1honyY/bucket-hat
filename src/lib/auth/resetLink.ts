// Password-reset links, both ends of them.
//
// Better Auth mails a link at its own `/api/auth/reset-password/:token`,
// which verifies the token and then redirects to whatever `redirectTo` the
// client asked for, carrying `?token=` (or `?error=INVALID_TOKEN` when the
// token is expired or already spent). That redirect target is this app's
// web build — the Worker serves it from the same origin as the API
// (DECISIONS.md, 2026-07-30) — so the link opens straight onto the reset
// screen with the token already in hand.
//
// Native has no URL to be opened at, so the same screen also accepts the
// code pasted by hand: someone who opens the email on a laptop can read
// the token off that page and type it into the phone. That's the reason
// the token is a visible field at all rather than a hidden param.
import { Platform } from "react-native";

/** The web path the emailed link lands on. */
export const RESET_PATH = "/reset-password";

export interface ResetLink {
  token?: string;
  /** True when the server rejected the token before redirecting. */
  expired?: boolean;
}

/**
 * Reads the token (or failure) out of a reset link.
 *
 * `href` is injectable for tests; left off, it reads the real location on
 * web and returns nothing anywhere else.
 */
export function readResetLink(href?: string): ResetLink {
  const url = href ?? currentHref();
  if (!url) return {};
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {};
  }
  if (!parsed.pathname.startsWith(RESET_PATH)) return {};

  const token = parsed.searchParams.get("token") ?? undefined;
  const error = parsed.searchParams.get("error") ?? undefined;
  if (error) return { expired: true };
  return token ? { token } : {};
}

/**
 * Where Better Auth should send the user after it has checked the token.
 *
 * `base` is the sync API's base URL (src/services/syncApiBase.ts), which is
 * an empty string on web — same-origin — and a full URL on native. Either
 * way the result is a link the Worker's asset routing resolves to the web
 * build's reset screen.
 */
export function resetRedirectUrl(base: string | undefined): string | undefined {
  if (base === undefined) return undefined;
  return `${base}${RESET_PATH}`;
}

/**
 * Drops the token from the address bar once it's been used or read.
 *
 * A spent token in a URL that survives a refresh (or gets copied into a
 * bookmark, or sits in a shared browser's history) is a small credential
 * leak for no benefit — the screen has the value in state by then.
 */
export function clearResetTokenFromUrl(): void {
  if (Platform.OS !== "web") return;
  const history = globalThis.history as History | undefined;
  const location = globalThis.location as Location | undefined;
  if (!history?.replaceState || !location) return;
  history.replaceState(null, "", location.pathname);
}

function currentHref(): string | undefined {
  if (Platform.OS !== "web") return undefined;
  return (globalThis.location as Location | undefined)?.href;
}

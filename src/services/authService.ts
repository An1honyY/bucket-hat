// docs/13-extended-features.md §13.7 — account management against Better
// Auth running in worker/.
//
// Plain `fetch` against Better Auth's REST endpoints rather than its
// client SDK: the SDK is browser-shaped (cookie storage, nanostores) and
// this app has to behave identically on React Native, where there's no
// cookie jar. The bearer plugin on the server hands back a token we store
// ourselves, which works the same in both places — see the note in
// syncBackendService.ts on why avoiding platform-specific code matters
// here in particular.
import { isSyncApiConfigured, syncApiBase } from "./syncApiBase";
import type { ServiceResult } from "./types";

export interface Account {
  id: string;
  email: string;
}

export interface Session {
  token: string;
  account: Account;
}

export type AuthError =
  | "network"
  | "unreachable"
  | "invalid-credentials"
  | "email-taken"
  | "weak-password"
  | "not-configured"
  // Password reset (2026-08-02): the emailed token was expired, already
  // spent, or mistyped; and the deployment this app is pointed at has no
  // email provider configured, so reset can't be offered at all.
  | "invalid-token"
  | "reset-unavailable";

export type AuthResult<T> = { data: T } | { error: AuthError };

// Falls back to same-origin on web — see syncApiBase.ts for why.
const baseUrl = syncApiBase;

export function isAuthConfigured(): boolean {
  // Not `Boolean(baseUrl())`: the same-origin fallback is an empty string.
  return isSyncApiConfigured();
}

const REQUEST_TIMEOUT_MS = 15_000;

interface BetterAuthErrorBody {
  code?: string;
  message?: string;
}

// Better Auth returns machine-readable codes; map the handful the UI needs
// to distinguish and let everything else fall through to a generic
// failure, rather than surfacing raw server strings to the user.
function mapError(status: number, body: BetterAuthErrorBody | undefined): AuthError {
  const code = body?.code?.toUpperCase() ?? "";
  if (code.includes("USER_ALREADY_EXISTS") || status === 409) return "email-taken";
  if (code.includes("PASSWORD_TOO_SHORT") || code.includes("WEAK")) return "weak-password";
  // Checked ahead of the generic INVALID branch below, which would
  // otherwise swallow INVALID_TOKEN into "wrong email or password" — the
  // one message that tells a user to do the exact wrong thing when what
  // actually happened is an expired reset link.
  if (code.includes("TOKEN")) return "invalid-token";
  if (status === 401 || status === 403 || code.includes("INVALID")) return "invalid-credentials";
  return "unreachable";
}

async function post<T>(path: string, body: unknown, token?: string): Promise<AuthResult<T>> {
  const url = baseUrl();
  if (url === undefined) return { error: "not-configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/api/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let parsed: BetterAuthErrorBody | undefined;
      try {
        parsed = (await response.json()) as BetterAuthErrorBody;
      } catch {
        parsed = undefined;
      }
      return { error: mapError(response.status, parsed) };
    }

    return { data: (await response.json()) as T };
  } catch {
    return { error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

// Better Auth's sign-in/sign-up responses carry the session token in the
// body when the bearer plugin is enabled, and also in this header. Reading
// both covers either shape without depending on which one a given version
// populates.
interface AuthResponseBody {
  token?: string;
  user?: { id?: string; email?: string };
}

function toSession(body: AuthResponseBody): AuthResult<Session> {
  if (!body.token || !body.user?.id || !body.user.email) return { error: "unreachable" };
  return { data: { token: body.token, account: { id: body.user.id, email: body.user.email } } };
}

export async function signUp(email: string, password: string): Promise<AuthResult<Session>> {
  // Better Auth requires a `name`; this app has no use for one (it's
  // single-user by design, docs/02-external-apis.md §2.2), so the local
  // part of the email stands in rather than asking for a field no screen
  // will ever display.
  const result = await post<AuthResponseBody>("/sign-up/email", {
    email,
    password,
    name: email.split("@")[0],
  });
  if ("error" in result) return result;
  return toSession(result.data);
}

export async function signIn(email: string, password: string): Promise<AuthResult<Session>> {
  const result = await post<AuthResponseBody>("/sign-in/email", { email, password });
  if ("error" in result) return result;
  return toSession(result.data);
}

export async function signOut(token: string): Promise<ServiceResult<true>> {
  const result = await post<unknown>("/sign-out", {}, token);
  // A failed sign-out still clears local state (see accountStore) — the
  // token is useless to us either way, and refusing to sign out because
  // the network is down would be worse than a session lingering server-side
  // until it expires.
  if ("error" in result) return { error: "network" };
  return { data: true };
}

/**
 * Starts the reset flow: the server mails a link, and says nothing about
 * whether the address had an account (Better Auth answers 200 either way,
 * and this app doesn't second-guess that — a reset form that reveals which
 * emails are registered is an account-enumeration oracle).
 *
 * `redirectTo` is where the emailed link lands once the server has checked
 * the token — see src/lib/auth/resetLink.ts.
 */
export async function requestPasswordReset(email: string, redirectTo?: string): Promise<AuthResult<true>> {
  // `/request-password-reset` is the current path; Better Auth renamed it
  // from `/forget-password` and kept the old one as a deprecated alias.
  const result = await post<unknown>("/request-password-reset", { email, redirectTo });
  if ("error" in result) {
    // A server with no `sendResetPassword` configured rejects this route
    // outright rather than silently accepting a request it can't act on
    // (worker/src/auth.ts). Told apart from a genuine outage so the screen
    // can say "this server can't do that" instead of "try again later"
    // forever.
    return { error: result.error === "unreachable" ? "reset-unavailable" : result.error };
  }
  return { data: true };
}

/** Finishes the reset flow with the token from the email and a new password. */
export async function resetPassword(token: string, newPassword: string): Promise<AuthResult<true>> {
  const result = await post<unknown>("/reset-password", { token, newPassword });
  if ("error" in result) return result;
  return { data: true };
}

export interface ServerCapabilities {
  /** Whether the deployment can actually send a reset email. */
  passwordReset: boolean;
}

/**
 * What the server this build points at can do, so the UI can offer only
 * what will work. Failure is not an error state anywhere — callers fall
 * back to offering everything and let the request itself report the truth,
 * which is the same outcome as before this endpoint existed.
 */
export async function getServerCapabilities(): Promise<AuthResult<ServerCapabilities>> {
  const url = baseUrl();
  if (url === undefined) return { error: "not-configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/api/config`, { signal: controller.signal });
    if (!response.ok) return { error: "unreachable" };
    const body = (await response.json()) as Partial<ServerCapabilities> | null;
    return { data: { passwordReset: body?.passwordReset === true } };
  } catch {
    return { error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** Verifies a stored token is still valid, e.g. on app start. */
export async function getSession(token: string): Promise<AuthResult<Session>> {
  const url = baseUrl();
  if (url === undefined) return { error: "not-configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!response.ok) return { error: "invalid-credentials" };
    const body = (await response.json()) as AuthResponseBody | null;
    if (!body?.user?.id || !body.user.email) return { error: "invalid-credentials" };
    // get-session doesn't reissue a token; the caller keeps the one it had.
    return { data: { token, account: { id: body.user.id, email: body.user.email } } };
  } catch {
    return { error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

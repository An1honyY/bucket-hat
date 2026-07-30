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
  | "not-configured";

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

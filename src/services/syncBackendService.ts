// docs/13-extended-features.md §13.7 — the concrete SyncBackend, talking
// to the Cloudflare Worker in worker/.
//
// Deliberately plain `fetch` with no vendor SDK. That's the reason this
// stack was chosen over Firebase: the app has to behave identically on
// web and native, and a native module would mean an Expo development
// build plus a config plugin, and a second code path to keep working.
// This repo already has one feature crippled that way — dataExport.ts is
// native-only because react-native-zip-archive has no web implementation
// — and repeating it here would break sync on the platform most of this
// project's development happens on.
//
// Lives in src/services/ per docs/12-dev-workflow-ci.md §12.1: one module
// per external API, one seam to intercept for tests and the dev menu.
import { isSyncApiConfigured, syncApiBase } from "./syncApiBase";
import type {
  PhotoBackend,
  PullResult,
  PushResult,
  RemotePhoto,
  SyncBackend,
  SyncChangeSet,
  SyncError,
  SyncResult,
} from "../lib/sync/types";

// Matches the other services' env-var convention (see routesService.ts).
// EXPO_PUBLIC_ is required for the value to survive into the bundle.
// Falls back to same-origin on web — see syncApiBase.ts for why.
const baseUrl = syncApiBase;

const REQUEST_TIMEOUT_MS = 15_000;

function classify(status: number): SyncError {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 429) return "rate-limited";
  return "unreachable";
}

async function request<T>(
  path: string,
  token: string,
  init?: { method?: string; body?: unknown }
): Promise<SyncResult<T>> {
  const url = baseUrl();
  if (url === undefined) return { error: "unreachable" };

  // AbortController rather than lib/withTimeout: that helper resolves a
  // fallback value and lets the underlying promise run on, which for a
  // sync push would leave a request in flight whose result nobody reads —
  // and a push whose outcome is unknown is exactly what the watermark
  // logic must not guess about. Aborting makes the failure definite.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        // The bearer plugin's token. Sent explicitly rather than relying
        // on cookies, which React Native has no store for.
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) return { error: classify(response.status) };
    return { data: (await response.json()) as T };
  } catch {
    // Offline, DNS failure, timeout — all the same to the caller, which
    // per §13.7 simply leaves its watermarks alone and tries again later.
    return { error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds a SyncBackend bound to a session token.
 *
 * Takes the token as a parameter rather than reading it internally so the
 * engine has no opinion about auth at all, and so a signed-out app simply
 * never constructs one.
 */
export function createSyncBackend(token: string): SyncBackend {
  return {
    async pull(since: string | undefined): Promise<SyncResult<PullResult>> {
      const query = since ? `?since=${encodeURIComponent(since)}` : "";
      return request<PullResult>(`/sync/pull${query}`, token);
    },

    async push(changes: SyncChangeSet): Promise<SyncResult<PushResult>> {
      return request<PushResult>("/sync/push", token, { method: "POST", body: changes });
    },
  };
}

export function isSyncConfigured(): boolean {
  // Not `Boolean(baseUrl())`: the same-origin fallback is an empty string,
  // which is falsy but perfectly usable.
  return isSyncApiConfigured();
}

// Photo transfers get their own timeout: an image is ~100 KB base64-inflated
// to ~140 KB, which on a slow mobile connection legitimately takes longer
// than the 15s that would indicate a dead server for a JSON request.
const PHOTO_TIMEOUT_MS = 60_000;

/**
 * Gear photo transfer against the Worker's R2-backed endpoints
 * (docs/03-data-models.md §3.3).
 *
 * Bytes are sent and received base64-encoded — see the note on
 * PhotoBackend for why. The Worker decodes on the way in and re-encodes on
 * the way out, so what's actually stored in R2 is a plain JPEG that can be
 * opened directly from the Cloudflare dashboard.
 */
export function createPhotoBackend(token: string): PhotoBackend {
  const authHeaders = { Authorization: `Bearer ${token}` };

  async function withTimeoutSignal<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
    try {
      return await run(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async listPhotos(): Promise<SyncResult<RemotePhoto[]>> {
      const url = baseUrl();
      if (url === undefined) return { error: "unreachable" };
      try {
        return await withTimeoutSignal(async (signal) => {
          const response = await fetch(`${url}/photos`, { headers: authHeaders, signal });
          if (!response.ok) return { error: classify(response.status) };
          const body = (await response.json()) as { photos: RemotePhoto[] };
          return { data: body.photos ?? [] };
        });
      } catch {
        return { error: "network" };
      }
    },

    async putPhoto(itemId: string, base64: string): Promise<SyncResult<{ uploadedAt: string }>> {
      const url = baseUrl();
      if (url === undefined) return { error: "unreachable" };
      try {
        return await withTimeoutSignal(async (signal) => {
          // Decoded here rather than server-side so what lands in R2 is a
          // real image/jpeg object, not a base64 blob that would need
          // decoding again by anything else that reads the bucket.
          const binary = base64ToBytes(base64);
          const response = await fetch(`${url}/photos/${encodeURIComponent(itemId)}`, {
            method: "PUT",
            headers: { ...authHeaders, "Content-Type": "image/jpeg" },
            body: binary as unknown as BodyInit,
            signal,
          });
          if (!response.ok) return { error: classify(response.status) };
          return { data: (await response.json()) as { uploadedAt: string } };
        });
      } catch {
        return { error: "network" };
      }
    },

    async getPhoto(itemId: string): Promise<SyncResult<string>> {
      const url = baseUrl();
      if (url === undefined) return { error: "unreachable" };
      try {
        return await withTimeoutSignal(async (signal) => {
          const response = await fetch(`${url}/photos/${encodeURIComponent(itemId)}`, {
            headers: authHeaders,
            signal,
          });
          if (!response.ok) return { error: classify(response.status) };
          return { data: bytesToBase64(new Uint8Array(await response.arrayBuffer())) };
        });
      } catch {
        return { error: "network" };
      }
    },
  };
}

/**
 * Fetches a gear photo and returns a blob: URL suitable for an `<img>`.
 *
 * Web only, and separate from PhotoBackend.getPhoto for two reasons.
 * First, it skips the base64 round-trip entirely — that encoding exists
 * because React Native can't hand raw bytes to the filesystem, which isn't
 * a constraint here. Second, the browser is the one environment where an
 * image can be displayed without ever touching disk.
 *
 * The token goes in a header, never in the URL. A query-string token would
 * leak into browser history, referrer headers, and any intermediary's
 * logs — which is also why this isn't done with a signed URL.
 */
export async function fetchPhotoObjectUrl(token: string, itemId: string): Promise<string | undefined> {
  const url = baseUrl();
  if (url === undefined) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/photos/${encodeURIComponent(itemId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    return URL.createObjectURL(await response.blob());
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

// React Native has no Buffer and its atob/btoa are not reliably present
// across engines, so the two conversions are done explicitly. Chunked to
// stay well clear of the argument-count limit on String.fromCharCode,
// which a whole image would otherwise blow past.
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes = new Uint8Array((clean.length * 3) / 4);
  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (BASE64_ALPHABET.indexOf(clean[i]) << 18) |
      (BASE64_ALPHABET.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] ? BASE64_ALPHABET.indexOf(clean[i + 2]) : 0) << 6) |
      (clean[i + 3] ? BASE64_ALPHABET.indexOf(clean[i + 3]) : 0);
    bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (clean[i + 2]) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (clean[i + 3]) bytes[byteIndex++] = chunk & 0xff;
  }
  return bytes.subarray(0, byteIndex);
}

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += BASE64_ALPHABET[(chunk >> 18) & 63];
    out += BASE64_ALPHABET[(chunk >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : "=";
  }
  return out;
}

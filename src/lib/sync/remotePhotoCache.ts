// Web-only gear photo display — docs/03-data-models.md §3.3,
// docs/13-extended-features.md §13.7.
//
// On phones and tablets a gear photo is a local file and `photoUri` points
// straight at it. The web build has no local storage for photos at all —
// `expo-file-system` reports `documentDirectory` as null — so photos taken
// on a phone would otherwise be invisible on a desktop browser even while
// the gear itself synced fine. This module closes that gap by rendering
// them straight from the account's object store.
//
// Why not just point an <Image> at the endpoint: it needs an Authorization
// header, and image elements can't send one. The alternative — a signed
// URL carrying a token in the query string — would put a credential
// somewhere it leaks by design (browser history, referrer headers,
// intermediary logs). Fetching with the header and handing the browser a
// blob: URL keeps the token in exactly one place.
import { Platform } from "react-native";
import { getStoredSession } from "../../db/repositories/syncState";
import { createPhotoBackend, fetchPhotoObjectUrl } from "../../services/syncBackendService";

// Which items the account has a photo for. Fetched once and reused rather
// than probing per item, so a gear list of thirty rows costs one request
// instead of thirty 404s.
let manifestPromise: Promise<Set<string>> | undefined;
let manifestFetchedAt = 0;

// Long enough that scrolling a list never refetches, short enough that a
// photo added on a phone shows up on the desktop within a sync cycle or
// two (App.tsx syncs every 5 minutes).
const MANIFEST_TTL_MS = 5 * 60 * 1000;

// itemId -> blob: URL. Never revoked while the app is open: gear
// inventories are tens of items, the blobs are ~100 KB, and revoking on
// unmount would break the very common case of a list row and its detail
// view sharing one image. Cleared wholesale on sign-out.
const objectUrls = new Map<string, string>();
const inFlight = new Map<string, Promise<string | undefined>>();

export function isRemotePhotoRenderingSupported(): boolean {
  // Native has real files; there's nothing for this module to do there.
  return Platform.OS === "web";
}

async function loadManifest(): Promise<Set<string>> {
  const session = await getStoredSession();
  if (!session) return new Set();

  const result = await createPhotoBackend(session.token).listPhotos();
  if ("error" in result) return new Set();
  return new Set(result.data.map((entry) => entry.itemId));
}

function manifest(): Promise<Set<string>> {
  const expired = Date.now() - manifestFetchedAt > MANIFEST_TTL_MS;
  if (!manifestPromise || expired) {
    manifestFetchedAt = Date.now();
    manifestPromise = loadManifest().catch(() => new Set<string>());
  }
  return manifestPromise;
}

/**
 * A displayable URL for this item's photo, or undefined if there isn't
 * one. Safe to call for every row in a list — repeat calls for the same
 * item share one request and one blob.
 */
export async function getRemotePhotoUri(itemId: string): Promise<string | undefined> {
  if (!isRemotePhotoRenderingSupported()) return undefined;

  const cached = objectUrls.get(itemId);
  if (cached) return cached;

  const existing = inFlight.get(itemId);
  if (existing) return existing;

  const request = (async () => {
    const available = await manifest();
    if (!available.has(itemId)) return undefined;

    const session = await getStoredSession();
    if (!session) return undefined;

    const url = await fetchPhotoObjectUrl(session.token, itemId);
    if (url) objectUrls.set(itemId, url);
    return url;
  })().finally(() => {
    inFlight.delete(itemId);
  });

  inFlight.set(itemId, request);
  return request;
}

/**
 * Drops every cached photo. Called on sign-out — the blobs belong to that
 * account, and leaving them addressable after the session ends would keep
 * one user's images renderable to the next.
 */
export function clearRemotePhotoCache(): void {
  for (const url of objectUrls.values()) {
    // Frees the underlying blob; without this they'd accumulate for the
    // lifetime of the tab.
    URL.revokeObjectURL(url);
  }
  objectUrls.clear();
  inFlight.clear();
  manifestPromise = undefined;
  manifestFetchedAt = 0;
}

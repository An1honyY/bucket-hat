// Gear photo storage in R2 — docs/03-data-models.md §3.3, the object half
// of Phase 19 sync.
//
// Photos are handled separately from row sync rather than being folded
// into it, because they're a fundamentally different shape: a row is a few
// hundred bytes of JSON that changes often, a photo is ~100 KB of JPEG
// written once and then never touched. Putting them through the same
// last-write-wins path would mean base64-inflating every image into a row
// payload and re-sending it whenever any field on the item changed.
//
// Keys are `${userId}/${itemId}.jpg`. The user id comes from the verified
// session and is prefixed server-side, never taken from the request, so
// one account cannot address another's objects.
import type { R2Bucket } from "@cloudflare/workers-types";

// Matches the 800px-long-edge / 0.7-quality JPEG that PhotoPicker.tsx
// produces (§3.3). Generous headroom over that, but bounded — an
// unbounded PUT is free storage for anyone with an account.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Item ids come from rowMapping.newId() (base36 with a hyphen). Validated
// rather than trusted because the id becomes part of an object key, and a
// value containing `/` or `..` would let a request address a key outside
// its own user prefix.
const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidItemId(itemId: string): boolean {
  return ITEM_ID_PATTERN.test(itemId);
}

function key(userId: string, itemId: string): string {
  return `${userId}/${itemId}.jpg`;
}

export interface PhotoManifestEntry {
  itemId: string;
  uploadedAt: string;
  size: number;
}

/**
 * Everything this account has stored. The client diffs it against its own
 * local files to decide what to upload and what to download — the same
 * "compare, then reconcile" shape as row sync, just without timestamps to
 * resolve, since a photo for a given item is either present or not.
 */
export async function listPhotos(bucket: R2Bucket, userId: string): Promise<PhotoManifestEntry[]> {
  const entries: PhotoManifestEntry[] = [];
  let cursor: string | undefined;

  do {
    const page = await bucket.list({ prefix: `${userId}/`, cursor, limit: 1000 });
    for (const object of page.objects) {
      const itemId = object.key.slice(userId.length + 1).replace(/\.jpg$/, "");
      entries.push({
        itemId,
        uploadedAt: object.uploaded.toISOString(),
        size: object.size,
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return entries;
}

export async function putPhoto(
  bucket: R2Bucket,
  userId: string,
  itemId: string,
  body: ArrayBuffer
): Promise<{ uploadedAt: string } | { error: "too-large" }> {
  if (body.byteLength > MAX_PHOTO_BYTES) return { error: "too-large" };
  await bucket.put(key(userId, itemId), body, {
    httpMetadata: { contentType: "image/jpeg" },
  });
  return { uploadedAt: new Date().toISOString() };
}

export async function getPhoto(bucket: R2Bucket, userId: string, itemId: string) {
  return bucket.get(key(userId, itemId));
}

export async function deletePhoto(bucket: R2Bucket, userId: string, itemId: string): Promise<void> {
  await bucket.delete(key(userId, itemId));
}

/**
 * Removes photos for rows that have just been tombstoned.
 *
 * Called from the push handler rather than left to a client request, so
 * deleting gear on a device that has no photo of it still clears the
 * object other devices uploaded. Otherwise the image would outlive the
 * item forever — invisible in the app, still occupying storage, and
 * silently restored to any device that later re-synced from scratch.
 */
export async function deletePhotosForTombstones(
  bucket: R2Bucket,
  userId: string,
  tombstones: { table: string; id: string }[]
): Promise<void> {
  const INVENTORY_TABLES = ["clothing_items", "shoe_items", "umbrella_items", "vehicle_items"];
  const doomed = tombstones.filter((t) => INVENTORY_TABLES.includes(t.table) && isValidItemId(t.id));
  if (doomed.length === 0) return;
  await Promise.all(doomed.map((t) => bucket.delete(key(userId, t.id))));
}

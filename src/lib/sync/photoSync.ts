// Gear photo sync — docs/03-data-models.md §3.3, docs/13-extended-features.md §13.7.
//
// Runs after row sync, as a separate reconciliation. Rows and photos are
// different enough to deserve different machinery: a row is small JSON
// that changes often and needs last-write-wins; a photo is ~100 KB of JPEG
// written once per item and then essentially immutable. There's no
// conflict to resolve — an item either has a photo or it doesn't — so this
// is a plain "what's here, what's there, move the difference" pass.
//
// Deliberately best-effort. A failed photo transfer never fails the sync
// that contains it: gear rows are what the recommendation engine reads,
// and blocking them on a slow image upload would make sync feel broken
// for something purely cosmetic.
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getDb } from "../../db";
import type { PhotoBackend } from "./types";

const PHOTO_DIR = `${FileSystem.documentDirectory}gear-photos/`;

// The tables whose rows can carry a photo (§3.3).
const INVENTORY_TABLES = ["clothing_items", "shoe_items", "umbrella_items", "vehicle_items"] as const;

export interface PhotoSyncSummary {
  uploaded: number;
  downloaded: number;
  failed: number;
  skippedReason?: "unsupported-platform";
}

function localPath(itemId: string): string {
  return `${PHOTO_DIR}${itemId}.jpg`;
}

interface LocalPhoto {
  itemId: string;
  mtime: number;
}

/**
 * Item ids whose row claims a photo AND whose file is actually present.
 *
 * Driven off the database rather than a directory listing so an orphaned
 * file (item deleted while this device was offline) is never uploaded.
 * `photo_uri` itself is only used as a flag — the path it holds carries a
 * `?t=` cache-buster (PhotoPicker.tsx) and, after a restore onto a
 * different device, may name a directory that doesn't exist. The canonical
 * location is always derivable from the item id.
 */
async function listLocalPhotos(): Promise<LocalPhoto[]> {
  const db = await getDb();
  const found: LocalPhoto[] = [];

  for (const table of INVENTORY_TABLES) {
    const rows = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM ${table} WHERE photo_uri IS NOT NULL`
    );
    for (const row of rows) {
      const info = await FileSystem.getInfoAsync(localPath(row.id));
      if (info.exists && !info.isDirectory) {
        found.push({ itemId: row.id, mtime: info.modificationTime ?? 0 });
      }
    }
  }
  return found;
}

interface PhotoSyncRecord {
  item_id: string;
  uploaded_at: string | null;
  uploaded_file_mtime: number | null;
  downloaded_at: string | null;
}

async function loadRecords(): Promise<Map<string, PhotoSyncRecord>> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoSyncRecord>("SELECT * FROM gear_photo_sync");
  return new Map(rows.map((r) => [r.item_id, r]));
}

async function recordUpload(itemId: string, mtime: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO gear_photo_sync (item_id, uploaded_at, uploaded_file_mtime)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET uploaded_at = excluded.uploaded_at,
                                        uploaded_file_mtime = excluded.uploaded_file_mtime`,
    itemId,
    new Date().toISOString(),
    mtime
  );
}

async function recordDownload(itemId: string, mtime: number): Promise<void> {
  const db = await getDb();
  // `uploaded_file_mtime` is set to the downloaded file's own mtime so the
  // very next pass doesn't see a "new" local file and upload it straight
  // back to where it came from.
  await db.runAsync(
    `INSERT INTO gear_photo_sync (item_id, downloaded_at, uploaded_at, uploaded_file_mtime)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET downloaded_at = excluded.downloaded_at,
                                        uploaded_at = excluded.uploaded_at,
                                        uploaded_file_mtime = excluded.uploaded_file_mtime`,
    itemId,
    new Date().toISOString(),
    new Date().toISOString(),
    mtime
  );
}

// A downloaded photo needs its row to point at it, or the UI won't render
// it — the components read `photoUri`, not the filesystem.
async function setPhotoUri(itemId: string, uri: string): Promise<void> {
  const db = await getDb();
  for (const table of INVENTORY_TABLES) {
    const existing = await db.getFirstAsync<{ id: string }>(`SELECT id FROM ${table} WHERE id = ?`, itemId);
    if (!existing) continue;
    // Writing `photo_uri` alone would trip migration 004's stamping
    // trigger and mark the row dirty, pushing a device-local path to the
    // server on the next sync. `updated_at` is therefore written
    // explicitly, preserved at its current value, which the trigger reads
    // as "authoritative, leave alone".
    await db.runAsync(
      `UPDATE ${table} SET photo_uri = ?, updated_at = updated_at WHERE id = ?`,
      uri,
      itemId
    );
    return;
  }
}

async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
}

/**
 * Reconcile local gear photos with the account's object store.
 *
 * Web is skipped outright: `expo-file-system`'s web shim reports
 * `documentDirectory` as null, so there is no local file to upload and
 * nowhere to put a download. Gear photos have always been native-only for
 * that reason (see PhotoPicker.tsx); this reports the skip rather than
 * failing, so the Account screen can say something truthful instead of
 * showing an error for a platform where the feature doesn't exist.
 */
export async function syncPhotos(backend: PhotoBackend): Promise<PhotoSyncSummary> {
  const summary: PhotoSyncSummary = { uploaded: 0, downloaded: 0, failed: 0 };

  if (Platform.OS === "web" || !FileSystem.documentDirectory) {
    summary.skippedReason = "unsupported-platform";
    return summary;
  }

  const remote = await backend.listPhotos();
  if ("error" in remote) {
    summary.failed += 1;
    return summary;
  }

  const remoteByItem = new Map(remote.data.map((entry) => [entry.itemId, entry]));
  const local = await listLocalPhotos();
  const localByItem = new Map(local.map((entry) => [entry.itemId, entry]));
  const records = await loadRecords();

  // --- upload: local files the server doesn't have, or that changed here
  for (const photo of local) {
    const record = records.get(photo.itemId);
    const onServer = remoteByItem.has(photo.itemId);
    // Re-capture overwrites the file in place, so a moved mtime is the
    // only signal that an already-uploaded photo is now different.
    const changedSinceUpload =
      record?.uploaded_file_mtime == null || photo.mtime > record.uploaded_file_mtime;
    if (onServer && !changedSinceUpload) continue;

    try {
      const bytes = await FileSystem.readAsStringAsync(localPath(photo.itemId), {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await backend.putPhoto(photo.itemId, bytes);
      if ("error" in result) {
        summary.failed += 1;
        continue;
      }
      await recordUpload(photo.itemId, photo.mtime);
      summary.uploaded += 1;
    } catch {
      summary.failed += 1;
    }
  }

  // --- download: server photos this device doesn't have a file for
  for (const entry of remote.data) {
    if (localByItem.has(entry.itemId)) continue;

    try {
      const result = await backend.getPhoto(entry.itemId);
      if ("error" in result) {
        summary.failed += 1;
        continue;
      }
      await ensurePhotoDir();
      const path = localPath(entry.itemId);
      await FileSystem.writeAsStringAsync(path, result.data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const info = await FileSystem.getInfoAsync(path);
      await recordDownload(entry.itemId, info.exists ? info.modificationTime ?? 0 : 0);
      // Cache-buster matches PhotoPicker's convention so a re-downloaded
      // image doesn't render from a stale in-memory copy.
      await setPhotoUri(entry.itemId, `${path}?t=${Date.now()}`);
      summary.downloaded += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}

// Additive migration (Section 3.1) — Phase 19 gear-photo sync
// (docs/03-data-models.md §3.3, docs/13-extended-features.md §13.7).
//
// Photos don't travel with their rows: the row carries `photo_uri`, a
// device-local `file://` path whose file exists only on the device that
// took it. Rather than inflate every row payload with base64 image data,
// photos sync as objects against R2 through their own endpoints, and this
// table records what this device has already reconciled.
//
// Deliberately NOT part of the synced tables. It describes *this device's*
// relationship to the object store — which files it has uploaded and which
// it has fetched — which is meaningless on any other device, exactly like
// the sync watermarks in app_settings.
import type { SQLiteDatabase } from "expo-sqlite";

export const version = 5;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS gear_photo_sync (
      item_id     TEXT PRIMARY KEY NOT NULL,

      -- When this device last uploaded the local file, and the file's own
      -- modification time at that moment. The pair is what makes
      -- re-capture detectable: PhotoPicker overwrites
      -- gear-photos/{itemId}.jpg in place (§3.3), so the path is unchanged
      -- and only the mtime moves. Comparing against the recorded mtime is
      -- what tells an already-uploaded photo apart from a replaced one.
      uploaded_at          TEXT,
      uploaded_file_mtime  REAL,

      -- When this device fetched the object from R2. Set on download so a
      -- photo that arrives from another device isn't immediately treated
      -- as a local file needing upload back.
      downloaded_at        TEXT
    );
  `);
}

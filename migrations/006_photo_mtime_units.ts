// Additive migration (Section 3.1) — clears `gear_photo_sync.uploaded_file_mtime`.
//
// Not a schema change: the column stays, only its recorded values are
// discarded, because the unit they were written in no longer matches the
// unit they're compared against.
//
// `photoSync.ts` moved from `expo-file-system/legacy` to the modern
// File/Directory API. The legacy `getInfoAsync().modificationTime` reported
// **seconds** since the epoch; the modern `File.lastModified` reports
// **milliseconds**. Any value already stored is therefore ~1000x smaller
// than what it will now be compared with, so
// `photo.mtime > record.uploaded_file_mtime` would read as "changed" for
// every existing photo.
//
// Left alone, that self-corrects after one redundant upload per photo — the
// new millisecond value overwrites the old one. Clearing it deliberately
// makes the same thing happen for a stated reason rather than as a
// side-effect of a unit mismatch, and takes the explicit
// `uploaded_file_mtime == null` branch in photoSync's upload check, which
// already means "no reliable record, upload it".
//
// One re-upload per photo on first sync after this migration is expected
// and harmless: putPhoto overwrites the same R2 key.
import type { SQLiteDatabase } from "expo-sqlite";

export const version = 6;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    UPDATE gear_photo_sync SET uploaded_file_mtime = NULL;
  `);
}

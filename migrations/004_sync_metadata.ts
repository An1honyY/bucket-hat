// Additive migration (Section 3.1) — Phase 19 cloud sync
// (docs/13-extended-features.md §13.7). Adds the two pieces of bookkeeping
// row-level last-write-wins needs and the local schema doesn't have yet:
//
// 1. `updated_at` (ISO 8601 UTC) on every synced table. §13.7 specifies
//    "last-write-wins per row" without saying what "last" is measured
//    against — a per-row modification timestamp is the only thing that
//    makes the comparison possible, so it's added here rather than
//    inferred from anything existing (`Journey.departTime` and
//    `SavedLocation.lastUsedAt` are domain fields with their own meaning;
//    reusing either as a sync clock would break the moment a user edits a
//    row without changing them).
//
// 2. `sync_tombstones` — §13.7 doesn't mention deletes at all, but
//    last-write-wins over live rows alone silently resurrects them: device
//    A deletes a jacket, device B (which still has it) pushes its copy,
//    and the jacket comes back on both. A tombstone row per delete makes
//    "deleted at T" a comparable write like any other. See DECISIONS.md.
//
// Additive-only per §3.1: new nullable columns and one new table, nothing
// dropped or renamed. `updated_at` is left NULL on existing rows rather
// than backfilled with a real timestamp — syncEngine.ts treats NULL as
// SYNC_EPOCH ("older than anything"), so the first sign-in still uploads
// every pre-existing row (§13.7's one-time initial push) without this
// migration having to guess when rows were actually last touched.
import type { SQLiteDatabase } from "expo-sqlite";

export const version = 4;

// The tables cloud sync covers. `app_settings` is deliberately absent —
// it holds device-local preferences (theme, 12h/24h, crash-reporting
// opt-in, dev state), which are not the user's data in the sense §13.7
// means and would be actively wrong to propagate across devices. See
// DECISIONS.md.
export const SYNCED_TABLES = [
  "clothing_items",
  "shoe_items",
  "umbrella_items",
  "vehicle_items",
  "saved_locations",
  "saved_routes",
  "environment_annotations",
  "journeys",
  "warmth_calibration",
  "advanced_warmth_thresholds",
] as const;

// Tables that are never deleted from — single-row-per-user config with a
// `CHECK (id = 1)` primary key. They get insert/update stamping but no
// delete trigger, since a tombstone for them could never be produced.
const SINGLETON_TABLES: readonly string[] = ["warmth_calibration", "advanced_warmth_thresholds"];

// SQLite's own UTC clock, formatted to match JavaScript's
// `new Date().toISOString()` exactly (millisecond precision, `Z` suffix)
// so timestamps written by a trigger and timestamps written by the sync
// engine in JS are directly string-comparable — which is the whole basis
// of last-write-wins.
const NOW_UTC = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_tombstones (
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      PRIMARY KEY (table_name, row_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sync_tombstones_deleted_at
      ON sync_tombstones(deleted_at);
  `);

  for (const table of SYNCED_TABLES) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT;`);
    // §3.2's rationale applied to the sync path: the push scan filters on
    // `updated_at > ?` on every sync, which is exactly the "queried often
    // enough that a table scan would show up as real lag" case.
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_${table}_updated_at ON ${table}(updated_at);
    `);

    // Stamping is done with triggers rather than by editing the ~30
    // INSERT/UPDATE/DELETE statements across src/db/repositories/*. Three
    // reasons, in order of weight:
    //
    // 1. Correctness by default — a future contributor adding a new write
    //    path (or a targeted UPDATE like updateClothingWearTracking())
    //    gets sync bookkeeping automatically. Hand-stamped columns are
    //    the kind of thing that goes stale silently: the row syncs, just
    //    with the wrong timestamp, and nothing surfaces the bug.
    // 2. The repositories stay ignorant of sync entirely, which keeps
    //    §13.7's "sync is a background reconciliation, not a replacement"
    //    property honest at the code level, not just at runtime.
    // 3. Deletes need a tombstone written in the same atomic step as the
    //    delete itself; a trigger gets that for free.
    //
    // The `WHEN NEW.updated_at IS OLD.updated_at` guard (`IS` being
    // SQLite's null-safe equality) is what lets the sync engine's own pull
    // write remote rows carrying their *remote* timestamp without the
    // trigger stomping it back to now() — an explicit updated_at in the
    // written row means "this value is authoritative, leave it alone."
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_${table}_stamp_insert
      AFTER INSERT ON ${table}
      FOR EACH ROW WHEN NEW.updated_at IS NULL
      BEGIN
        UPDATE ${table} SET updated_at = ${NOW_UTC} WHERE id = NEW.id;
      END;
    `);
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_${table}_stamp_update
      AFTER UPDATE ON ${table}
      FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
      BEGIN
        UPDATE ${table} SET updated_at = ${NOW_UTC} WHERE id = NEW.id;
      END;
    `);

    if (SINGLETON_TABLES.includes(table)) continue;
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_${table}_tombstone_delete
      AFTER DELETE ON ${table}
      FOR EACH ROW
      BEGIN
        INSERT INTO sync_tombstones (table_name, row_id, deleted_at)
        VALUES ('${table}', OLD.id, ${NOW_UTC})
        ON CONFLICT(table_name, row_id) DO UPDATE SET deleted_at = excluded.deleted_at;
      END;
    `);
  }
}

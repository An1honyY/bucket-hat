// docs/13-extended-features.md §13.7 — the SQLite half of cloud sync:
// reading out what changed locally, and applying what changed remotely.
//
// Everything here works off raw column names read from PRAGMA table_info
// rather than the typed mappers in src/db/repositories/*. That's
// deliberate: sync is row-level, so it should stay ignorant of what the
// columns mean, and an additive migration (§3.1) adding a column should
// start syncing it without anyone remembering to update this file.
import type { SQLiteDatabase } from "expo-sqlite";
import { SYNCED_TABLES } from "../../../migrations/004_sync_metadata";
import type { SyncChangeSet, SyncRow, SyncTombstone } from "./types";

// Rows written before migration 004 have updated_at = NULL. Treating NULL
// as this sentinel (rather than skipping those rows) is what makes
// §13.7's "upload the existing local SQLite data as the initial cloud
// state" work without the migration having to invent timestamps for data
// it can't date.
export const SYNC_EPOCH = "1970-01-01T00:00:00.000Z";

// Columns that must never be overwritten by a pull, per table.
//
// `photo_uri` is a device-local `file://` path under documentDirectory
// (§3.3, `gear-photos/{itemId}.jpg`). The *file* it points at doesn't
// travel with the row, so accepting a remote path would leave this device
// with a reference to something that was never here — a broken image in
// the Gear list rather than the "no photo yet" placeholder the UI already
// handles. Syncing the images themselves is its own scoped piece of work
// (object storage, upload/download lifecycle, orphan cleanup); until then
// each device keeps its own photos and the rest of the row syncs normally.
// See DECISIONS.md.
const DEVICE_LOCAL_COLUMNS: Record<string, readonly string[]> = {
  clothing_items: ["photo_uri"],
  shoe_items: ["photo_uri"],
  umbrella_items: ["photo_uri"],
  vehicle_items: ["photo_uri"],
};

const columnCache = new Map<string, string[]>();

async function dataColumns(db: SQLiteDatabase, table: string): Promise<string[]> {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  // id and updated_at are lifted into SyncRow's own fields.
  const columns = rows.map((r) => r.name).filter((name) => name !== "id" && name !== "updated_at");
  columnCache.set(table, columns);
  return columns;
}

// Exposed for tests, which build fresh in-memory databases per case.
export function clearColumnCache(): void {
  columnCache.clear();
}

// ---------- reading local changes ----------

export async function collectLocalChanges(db: SQLiteDatabase, since: string | undefined): Promise<SyncChangeSet> {
  const rows: { table: string; row: SyncRow }[] = [];
  const tombstones: SyncTombstone[] = [];

  for (const table of SYNCED_TABLES) {
    const columns = await dataColumns(db, table);
    // No mark yet means a first sync, which must offer up *everything*
    // (§13.7's initial upload) — including rows written before migration
    // 004, whose updated_at is still NULL. Filtering those against
    // SYNC_EPOCH would exclude them precisely when they need including,
    // since `SYNC_EPOCH > SYNC_EPOCH` is false, so the unfiltered query is
    // the correct first-sync behaviour rather than an optimisation.
    const dirty =
      since === undefined
        ? await db.getAllAsync<Record<string, unknown>>(
            `SELECT * FROM ${table} ORDER BY COALESCE(updated_at, ?)`,
            SYNC_EPOCH
          )
        : await db.getAllAsync<Record<string, unknown>>(
            `SELECT * FROM ${table} WHERE COALESCE(updated_at, ?) > ? ORDER BY COALESCE(updated_at, ?)`,
            SYNC_EPOCH,
            since,
            SYNC_EPOCH
          );
    const preserved = DEVICE_LOCAL_COLUMNS[table] ?? [];
    for (const raw of dirty) {
      const data: Record<string, unknown> = {};
      // Device-local columns are withheld from the push as well as being
      // protected on pull. `photo_uri` is a `file://` path into this
      // device's sandbox — uploading it tells peers nothing they can use
      // (they ignore it on apply anyway) while putting local filesystem
      // paths on a server for no benefit. Photos themselves sync as
      // objects instead; see photoSync.ts.
      for (const column of columns) {
        if (preserved.includes(column)) continue;
        data[column] = raw[column];
      }
      rows.push({
        table,
        row: {
          id: String(raw.id),
          updatedAt: (raw.updated_at as string | null) ?? SYNC_EPOCH,
          data,
        },
      });
    }
  }

  const deleted =
    since === undefined
      ? await db.getAllAsync<{ table_name: string; row_id: string; deleted_at: string }>(
          `SELECT * FROM sync_tombstones ORDER BY deleted_at`
        )
      : await db.getAllAsync<{ table_name: string; row_id: string; deleted_at: string }>(
          `SELECT * FROM sync_tombstones WHERE deleted_at > ? ORDER BY deleted_at`,
          since
        );
  for (const row of deleted) {
    tombstones.push({ table: row.table_name, id: row.row_id, deletedAt: row.deleted_at });
  }

  return { rows, tombstones };
}

// ---------- applying remote changes ----------

async function localUpdatedAt(db: SQLiteDatabase, table: string, id: string): Promise<string | undefined> {
  const row = await db.getFirstAsync<{ updated_at: string | null }>(
    `SELECT updated_at FROM ${table} WHERE id = ?`,
    id
  );
  if (!row) return undefined;
  return row.updated_at ?? SYNC_EPOCH;
}

async function applyRemoteRow(db: SQLiteDatabase, table: string, row: SyncRow): Promise<boolean> {
  const local = await localUpdatedAt(db, table, row.id);
  // Last-write-wins, resolved in favour of the local row on an exact tie.
  // A tie means both sides already agree on the timestamp, so re-writing
  // would only risk the trigger re-stamping it (see 004's test
  // "re-stamps when a write supplies the timestamp the row already had").
  if (local !== undefined && local >= row.updatedAt) return false;

  const columns = await dataColumns(db, table);
  const preserved = DEVICE_LOCAL_COLUMNS[table] ?? [];
  // Only columns the remote row actually carried. A column that's absent
  // means "no opinion", not "set me to NULL" — which matters in two real
  // cases: a peer running an older app version that predates an additive
  // migration (§3.1) won't send the newer columns, and NOT NULL columns
  // would otherwise fail the whole write. Absent columns keep their
  // existing local value on update, or take the schema default on insert.
  const writable = columns.filter((column) => !preserved.includes(column) && column in row.data);

  // updated_at is written explicitly in both branches so migration 004's
  // stamping trigger leaves the remote timestamp intact instead of
  // replacing it with now(). Device-local columns never appear in either
  // statement, so an existing local value survives untouched and a new row
  // takes the schema default.
  //
  // UPDATE and INSERT are separate statements rather than one upsert
  // because SQLite evaluates NOT NULL before it resolves ON CONFLICT: an
  // upsert that omits a NOT NULL column fails outright even when the row
  // already exists and the DO UPDATE branch would never have touched it.
  // Since a partial row is expected (see `writable` above), the existence
  // check we've already done decides the statement.
  if (local !== undefined) {
    const assignments = ["updated_at", ...writable].map((column) => `${column} = ?`);
    await db.runAsync(
      `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = ?`,
      ...([row.updatedAt, ...writable.map((column) => row.data[column] ?? null), row.id] as never[])
    );
    return true;
  }

  const columnList = ["id", "updated_at", ...writable];
  await db.runAsync(
    `INSERT INTO ${table} (${columnList.join(", ")})
     VALUES (${columnList.map(() => "?").join(", ")})`,
    ...([row.id, row.updatedAt, ...writable.map((column) => row.data[column] ?? null)] as never[])
  );
  return true;
}

async function applyRemoteTombstone(db: SQLiteDatabase, tombstone: SyncTombstone): Promise<boolean> {
  const local = await localUpdatedAt(db, tombstone.table, tombstone.id);
  if (local === undefined) return false; // already gone here
  // A local edit newer than the remote delete wins: the row survives and
  // will be pushed back on the next sync, resurrecting it remotely. That's
  // the correct reading of last-write-wins — the edit genuinely is the
  // later write.
  if (local > tombstone.deletedAt) return false;

  await db.runAsync(`DELETE FROM ${tombstone.table} WHERE id = ?`, tombstone.id);
  return true;
}

export interface ApplyOutcome {
  rowsApplied: number;
  /** Lost last-write-wins against a newer local edit — the normal case. */
  rowsSkipped: number;
  /** Threw on write and was abandoned — see the catch in applyRemoteChanges. */
  rowsFailed: number;
  deletesApplied: number;
  deletesSkipped: number;
  deletesFailed: number;
}

export async function applyRemoteChanges(db: SQLiteDatabase, changes: SyncChangeSet): Promise<ApplyOutcome> {
  const outcome: ApplyOutcome = {
    rowsApplied: 0,
    rowsSkipped: 0,
    rowsFailed: 0,
    deletesApplied: 0,
    deletesSkipped: 0,
    deletesFailed: 0,
  };
  const synced: readonly string[] = SYNCED_TABLES;

  for (const { table, row } of changes.rows) {
    // Ignore anything for a table this client version doesn't know about:
    // a newer app version may have added a table via its own migration,
    // and an older client must not crash on it.
    if (!synced.includes(table)) continue;
    try {
      if (await applyRemoteRow(db, table, row)) outcome.rowsApplied += 1;
      else outcome.rowsSkipped += 1;
    } catch (error) {
      // One unusable row must not wedge the whole sync. A remote row can
      // fail to apply for reasons this device can do nothing about — a
      // peer on a newer schema omitting a column that's NOT NULL here, or
      // data corrupted in transit. Without this guard the exception
      // propagates out of runSync(), the watermarks never advance, and
      // every future sync re-fetches the same poison row and dies on it
      // again: sync silently stops forever, with the UI still claiming
      // it's signed in. Skipping keeps the rest of the batch flowing;
      // the row is retried on the next pull that includes it.
      outcome.rowsFailed += 1;
      console.warn(`sync: skipped unusable row ${table}/${row.id}`, error);
    }
  }

  for (const tombstone of changes.tombstones) {
    if (!synced.includes(tombstone.table)) continue;
    try {
      if (await applyRemoteTombstone(db, tombstone)) outcome.deletesApplied += 1;
      else outcome.deletesSkipped += 1;
    } catch (error) {
      outcome.deletesFailed += 1;
      console.warn(`sync: skipped unusable tombstone ${tombstone.table}/${tombstone.id}`, error);
    }
  }

  return outcome;
}

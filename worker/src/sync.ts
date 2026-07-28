// The two sync endpoints' data logic — docs/13-extended-features.md §13.7.
//
// The Worker is deliberately dumb about *what* it stores: rows arrive as
// opaque JSON and leave the same way (see schema.sql for why). The only
// judgement it makes is last-write-wins, and it has to make that: a client
// that has been offline for a week will push rows genuinely older than
// what another device has since written, and only the server can see both.
// A backend that blindly upserted would let a stale client silently roll
// back newer data.
import type { D1Database } from "@cloudflare/workers-types";

export interface WireRow {
  id: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface WireTombstone {
  table: string;
  id: string;
  deletedAt: string;
}

export interface ChangeSet {
  rows: { table: string; row: WireRow }[];
  tombstones: WireTombstone[];
}

// Keeps a pull response comfortably inside D1's result limits. An initial
// sync of a long journey history can exceed this, which is why pull
// reports `hasMore` rather than silently truncating — see pullChanges.
const PULL_PAGE_SIZE = 500;

function bumpMillisecond(iso: string): string {
  return new Date(new Date(iso).getTime() + 1).toISOString();
}

/**
 * A server timestamp guaranteed to be strictly greater than every stamp
 * already recorded for this user.
 *
 * Wall-clock `now()` alone isn't enough: two pushes landing in the same
 * millisecond would share a stamp, and a client whose watermark is that
 * millisecond would never see the second one (the pull filter is strictly
 * `>`). Rare, but silent and permanent when it happens, which is the worst
 * combination — so it's cheaper to spend one indexed MAX() per write.
 */
async function nextServerStamp(db: D1Database, userId: string): Promise<string> {
  const result = await db
    .prepare(
      `SELECT MAX(stamp) AS stamp FROM (
         SELECT MAX(server_updated_at) AS stamp FROM sync_rows WHERE user_id = ?1
         UNION ALL
         SELECT MAX(server_updated_at) AS stamp FROM sync_tombstones WHERE user_id = ?1
       )`
    )
    .bind(userId)
    .first<{ stamp: string | null }>();

  const now = new Date().toISOString();
  const highest = result?.stamp ?? null;
  return highest === null || now > highest ? now : bumpMillisecond(highest);
}

export async function pushChanges(db: D1Database, userId: string, changes: ChangeSet): Promise<string> {
  const stamp = await nextServerStamp(db, userId);
  const statements = [];

  for (const tombstone of changes.tombstones) {
    // The row loses to a delete that is at least as new as it is. `<=`
    // rather than `<` so an identical timestamp resolves as deleted — a
    // delete is the more destructive interpretation and the one a user is
    // more likely to have meant last.
    statements.push(
      db
        .prepare(
          `DELETE FROM sync_rows
           WHERE user_id = ? AND table_name = ? AND row_id = ? AND updated_at <= ?`
        )
        .bind(userId, tombstone.table, tombstone.id, tombstone.deletedAt)
    );
    // Only record the tombstone if no surviving row out-dates it;
    // otherwise a stale delete would be handed to every other device.
    statements.push(
      db
        .prepare(
          `INSERT INTO sync_tombstones (user_id, table_name, row_id, deleted_at, server_updated_at)
           SELECT ?1, ?2, ?3, ?4, ?5
           WHERE NOT EXISTS (
             SELECT 1 FROM sync_rows
             WHERE user_id = ?1 AND table_name = ?2 AND row_id = ?3 AND updated_at > ?4
           )
           ON CONFLICT (user_id, table_name, row_id) DO UPDATE SET
             deleted_at = excluded.deleted_at,
             server_updated_at = excluded.server_updated_at
           WHERE excluded.deleted_at > sync_tombstones.deleted_at`
        )
        .bind(userId, tombstone.table, tombstone.id, tombstone.deletedAt, stamp)
    );
  }

  for (const { table, row } of changes.rows) {
    // A row newer than an existing tombstone means it was re-created;
    // clear the tombstone so it doesn't re-delete the row on other devices.
    statements.push(
      db
        .prepare(
          `DELETE FROM sync_tombstones
           WHERE user_id = ? AND table_name = ? AND row_id = ? AND deleted_at < ?`
        )
        .bind(userId, table, row.id, row.updatedAt)
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO sync_rows (user_id, table_name, row_id, updated_at, server_updated_at, data)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6
           WHERE NOT EXISTS (
             SELECT 1 FROM sync_tombstones
             WHERE user_id = ?1 AND table_name = ?2 AND row_id = ?3 AND deleted_at >= ?4
           )
           ON CONFLICT (user_id, table_name, row_id) DO UPDATE SET
             updated_at = excluded.updated_at,
             server_updated_at = excluded.server_updated_at,
             data = excluded.data
           WHERE excluded.updated_at > sync_rows.updated_at`
        )
        .bind(userId, table, row.id, row.updatedAt, stamp, JSON.stringify(row.data))
    );
  }

  // D1's batch() runs the statements in one implicit transaction, so a
  // partial push can't land. The client re-sends anything it isn't certain
  // about and every statement above is idempotent, but atomicity means
  // that path is for network failures only, never for half-applied state.
  if (statements.length > 0) await db.batch(statements);
  return stamp;
}

export interface PullResponse {
  rows: { table: string; row: WireRow }[];
  tombstones: WireTombstone[];
  serverTime: string;
  hasMore: boolean;
}

export async function pullChanges(db: D1Database, userId: string, since: string | undefined): Promise<PullResponse> {
  // `since === undefined` is a first sync: everything the account holds.
  const watermark = since ?? "";

  const rowResults = await db
    .prepare(
      `SELECT table_name, row_id, updated_at, server_updated_at, data
       FROM sync_rows
       WHERE user_id = ? AND server_updated_at > ?
       ORDER BY server_updated_at
       LIMIT ?`
    )
    .bind(userId, watermark, PULL_PAGE_SIZE)
    .all<{ table_name: string; row_id: string; updated_at: string; server_updated_at: string; data: string }>();

  const tombstoneResults = await db
    .prepare(
      `SELECT table_name, row_id, deleted_at, server_updated_at
       FROM sync_tombstones
       WHERE user_id = ? AND server_updated_at > ?
       ORDER BY server_updated_at
       LIMIT ?`
    )
    .bind(userId, watermark, PULL_PAGE_SIZE)
    .all<{ table_name: string; row_id: string; deleted_at: string; server_updated_at: string }>();

  const rowsPage = rowResults.results ?? [];
  const tombstonesPage = tombstoneResults.results ?? [];
  const truncated = rowsPage.length === PULL_PAGE_SIZE || tombstonesPage.length === PULL_PAGE_SIZE;

  // When a page is truncated the watermark must be the last stamp actually
  // included, never wall-clock now() — advancing past unread rows would
  // skip them permanently. The client keeps calling while hasMore is true.
  const lastStamp = [
    ...rowsPage.map((r) => r.server_updated_at),
    ...tombstonesPage.map((t) => t.server_updated_at),
  ]
    .sort()
    .pop();

  return {
    rows: rowsPage.map((r) => ({
      table: r.table_name,
      row: {
        id: r.row_id,
        updatedAt: r.updated_at,
        data: JSON.parse(r.data) as Record<string, unknown>,
      },
    })),
    tombstones: tombstonesPage.map((t) => ({
      table: t.table_name,
      id: t.row_id,
      deletedAt: t.deleted_at,
    })),
    serverTime: truncated && lastStamp ? lastStamp : new Date().toISOString(),
    hasMore: truncated,
  };
}

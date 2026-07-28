-- Phase 19 cloud sync — remote schema (docs/13-extended-features.md §13.7).
--
-- Deliberately NOT a mirror of the app's ten local tables. Rows are stored
-- generically: one table keyed on (user, table name, row id), with the
-- row's data columns kept as an opaque JSON blob the Worker never parses.
--
-- Why: sync is row-level and schema-agnostic by design (see
-- src/lib/sync/types.ts). Mirroring the local schema would mean every
-- additive migration in migrations/ needing a matching remote migration,
-- and the failure mode when someone forgets is silent — the column just
-- stops syncing, with no error anywhere. The generic form makes that
-- entire class of drift impossible: `migrations/005_whatever.ts` adding a
-- column requires no change here at all.
--
-- The trade-off, stated plainly: you cannot run `SELECT name FROM
-- clothing_items` against D1. The remote database is a sync relay, not a
-- queryable copy — SQLite on the device remains the source of truth for
-- every read the app performs (§13.7 "local-first stays true"). If a
-- future feature genuinely needs server-side queries over user data, that
-- justifies mirrored tables; nothing in Phase 19 does.

CREATE TABLE IF NOT EXISTS sync_rows (
  user_id           TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  row_id            TEXT NOT NULL,

  -- The device's clock, as written by migration 004's SQLite triggers.
  -- Used ONLY for last-write-wins conflict resolution.
  updated_at        TEXT NOT NULL,

  -- This server's clock, assigned on write. Used ONLY as the pull
  -- watermark. Keeping these two separate is load-bearing: filtering a
  -- pull on the device clock would permanently hide the writes of any
  -- device whose clock runs behind the server. See DECISIONS.md
  -- (2026-07-28, "pull watermarks are server-clock").
  server_updated_at TEXT NOT NULL,

  -- The row's data columns as JSON. Opaque to this Worker.
  data              TEXT NOT NULL,

  PRIMARY KEY (user_id, table_name, row_id)
);

-- The one query the pull endpoint runs, so it should never table-scan.
CREATE INDEX IF NOT EXISTS idx_sync_rows_pull
  ON sync_rows (user_id, server_updated_at);

CREATE TABLE IF NOT EXISTS sync_tombstones (
  user_id           TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  row_id            TEXT NOT NULL,
  deleted_at        TEXT NOT NULL,
  server_updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, table_name, row_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_tombstones_pull
  ON sync_tombstones (user_id, server_updated_at);

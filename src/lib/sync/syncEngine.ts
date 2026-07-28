// docs/13-extended-features.md §13.7 — the sync engine.
//
// Push local changes, pull remote ones, resolve collisions row-by-row with
// last-write-wins. SQLite stays the source of truth throughout: nothing
// here renders, blocks a screen, or gates a write. A failed sync leaves
// local data exactly as it was and the marks unmoved, so the next attempt
// simply covers a slightly wider window — which is what makes §13.7's
// "sync resuming silently when connectivity returns" fall out for free
// rather than needing a retry queue.
import type { SQLiteDatabase } from "expo-sqlite";
import { applyRemoteChanges, collectLocalChanges, SYNC_EPOCH } from "./localChanges";
import type { SyncBackend, SyncChangeSet, SyncResult } from "./types";

export interface SyncSummary {
  pushedRows: number;
  pushedDeletes: number;
  pulledRows: number;
  pulledDeletes: number;
  /** Rows the remote sent that lost last-write-wins against a local edit. */
  rejectedRows: number;
  /** Rows that couldn't be written at all and were abandoned. */
  failedRows: number;
  syncedAt: string;
}

export interface SyncMarks {
  lastPushedAt?: string;
  lastPulledAt?: string;
}

export interface SyncRunResult {
  summary: SyncSummary;
  marks: SyncMarks;
}

function latest(...values: (string | undefined)[]): string | undefined {
  return values.filter((v): v is string => v !== undefined).sort().pop();
}

function highWaterMark(changes: SyncChangeSet): string | undefined {
  return latest(...changes.rows.map((r) => r.row.updatedAt), ...changes.tombstones.map((t) => t.deletedAt));
}

// How far ahead of this device's clock a peer's timestamp may be and still
// be treated as "the past" for watermark purposes.
//
// Some tolerance is required rather than comparing against now() exactly.
// Timestamps are written by SQLite's clock and compared against
// JavaScript's, which can tie or invert by a millisecond even on one
// device, and real devices routinely disagree by seconds. Treating a peer
// that's 200ms fast as "future-dated" would re-offer its rows on every
// single push forever.
//
// Five minutes is comfortably above ordinary drift and far below the scale
// of an actually-wrong clock (a wrong year, a wrong timezone applied as an
// offset), which is the case the cap exists to contain.
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

function withinClockTolerance(iso: string | undefined): boolean {
  if (iso === undefined) return false;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  return at <= Date.now() + CLOCK_TOLERANCE_MS;
}

/**
 * One full sync cycle. Pure with respect to persistence of the marks — it
 * returns the new marks rather than writing them, so the caller decides
 * when they're durable and tests don't need app_settings.
 *
 * Push runs before pull so that a change made on this device is on the
 * server before this device starts accepting the server's version of the
 * same row. The reverse order would let a pull overwrite a local edit that
 * had never been offered to the server at all — last-write-wins is only
 * fair if both writes actually reached the contest.
 */
export async function runSync(
  db: SQLiteDatabase,
  backend: SyncBackend,
  marks: SyncMarks
): Promise<SyncResult<SyncRunResult>> {
  // Distrust a stored push mark that sits in the future. Capping new marks
  // (see withinClockTolerance below) stops this device *creating* one, but
  // a device that already stored a poisoned mark — from an earlier build,
  // or a peer whose clock has since been corrected — would otherwise stay
  // wedged forever with no way back: every local edit reads as older than
  // "already pushed", so nothing uploads and nothing signals a problem.
  // Falling back to undefined re-offers every local row once, which is
  // idempotent server-side and cheap next to silently syncing nothing.
  const storedPushMark = withinClockTolerance(marks.lastPushedAt) ? marks.lastPushedAt : undefined;
  if (storedPushMark !== marks.lastPushedAt) {
    console.warn("sync: stored push watermark was in the future, resyncing from scratch", marks.lastPushedAt);
  }

  const local = await collectLocalChanges(db, storedPushMark);

  let pushedMark = storedPushMark;
  let pushSucceeded = false;
  if (local.rows.length > 0 || local.tombstones.length > 0) {
    const pushed = await backend.push(local);
    if ("error" in pushed) return pushed;
    // Advanced to the newest timestamp actually sent, not to the server's
    // clock. A row edited *during* the push has a timestamp above this
    // mark and so stays dirty for the next run; anchoring to the server's
    // clock instead would swallow that edit silently. It also means the
    // push mark never depends on the device and server clocks agreeing.
    pushedMark = latest(pushedMark, highWaterMark(local));
    pushSucceeded = true;
  }

  // A backend may cap a pull response (see PullResult.hasMore); keep going
  // until it stops capping so one sync converges rather than trickling a
  // page per cycle. Bounded so a backend that always reports hasMore can't
  // spin here forever — an initial sync of this app's data is a handful of
  // pages, and anything past the bound resumes on the next run anyway.
  const MAX_PULL_PAGES = 50;
  let pulled = await backend.pull(marks.lastPulledAt);
  let pulledRows = 0;
  let pulledDeletes = 0;
  let rejectedRows = 0;
  let failedRows = 0;
  let pages = 0;

  while ("data" in pulled) {
    const outcome = await applyRemoteChanges(db, pulled.data);
    pulledRows += outcome.rowsApplied;
    pulledDeletes += outcome.deletesApplied;
    rejectedRows += outcome.rowsSkipped;
    failedRows += outcome.rowsFailed;
    pages += 1;

    // Rows just applied from the remote are already on the server, so
    // folding their timestamps into the push mark stops the next push
    // echoing them straight back.
    //
    // Capped at the present, and that cap is load-bearing. These are
    // *device* clocks, written by whichever peer last edited the row, and
    // a peer with a clock set even slightly fast produces timestamps in
    // the future. Without the cap, one such row drags this device's push
    // mark ahead of real time, and every genuinely new local edit then
    // looks older than "already pushed" — so this device silently stops
    // uploading anything until the wall clock catches up. Found exactly
    // that way: a test row dated 2032 wedged all local pushes while sync
    // still reported success.
    //
    // The cost of the cap is that a future-dated row keeps being offered
    // on each push. That's idempotent — the server's own last-write-wins
    // rejects it — so it wastes a little bandwidth rather than losing
    // data, which is the right way round for this trade.
    const appliedMark = highWaterMark(pulled.data);
    pushedMark = latest(pushedMark, withinClockTolerance(appliedMark) ? appliedMark : undefined);

    if (!pulled.data.hasMore || pages >= MAX_PULL_PAGES) break;
    const next = await backend.pull(pulled.data.serverTime);
    if ("error" in next) {
      // Pages already applied are durable and their watermark is real, so
      // keep it — the remaining pages arrive on the next run.
      return {
        data: {
          summary: {
            pushedRows: local.rows.length,
            pushedDeletes: local.tombstones.length,
            pulledRows,
            pulledDeletes,
            rejectedRows,
            failedRows,
            syncedAt: pulled.data.serverTime,
          },
          marks: { lastPushedAt: pushedMark, lastPulledAt: pulled.data.serverTime },
        },
      };
    }
    pulled = next;
  }

  if ("error" in pulled) {
    // Nothing was pushed *and* the pull failed, so no data moved in either
    // direction — that's a plain failure, not a partial success. Reporting
    // it as success made the Account screen say "Synced just now" while
    // every request was failing with connection refused, which is the most
    // dangerous thing a sync UI can do: it tells you your devices agree
    // when the backend is unreachable. Found by pointing the app at a
    // Worker that wasn't running.
    if (!pushSucceeded) return pulled;

    // A real partial success: the push landed and is durable on the
    // server, so keep its mark rather than re-sending the same rows.
    return {
      data: {
        summary: {
          pushedRows: local.rows.length,
          pushedDeletes: local.tombstones.length,
          pulledRows: 0,
          pulledDeletes: 0,
          rejectedRows: 0,
          failedRows: 0,
          syncedAt: pushedMark ?? SYNC_EPOCH,
        },
        marks: { lastPushedAt: pushedMark, lastPulledAt: marks.lastPulledAt },
      },
    };
  }

  return {
    data: {
      summary: {
        pushedRows: local.rows.length,
        pushedDeletes: local.tombstones.length,
        pulledRows,
        pulledDeletes,
        rejectedRows,
        failedRows,
        syncedAt: pulled.data.serverTime,
      },
      marks: {
        // pushedMark already absorbed each page's high-water mark inside
        // the loop, so pulled rows aren't echoed back on the next push.
        lastPushedAt: pushedMark,
        lastPulledAt: pulled.data.serverTime,
      },
    },
  };
}

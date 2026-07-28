// docs/13-extended-features.md §13.7 — the app-facing entry point for a
// sync. Ties together the pieces the engine deliberately doesn't know
// about: where the session token lives, where the watermarks are
// persisted, and when it's appropriate to run at all.
//
// runSync() itself stays pure with respect to persistence (it returns new
// marks rather than writing them) so it can be tested without app_settings;
// this module is where that result becomes durable.
import { getDb } from "../../db";
import {
  clearSyncState,
  getStoredSession,
  getSyncMarks,
  setLastSyncedAt,
  setSyncMarks,
} from "../../db/repositories/syncState";
import { createPhotoBackend, createSyncBackend, isSyncConfigured } from "../../services/syncBackendService";
import { syncPhotos, type PhotoSyncSummary } from "./photoSync";
import { runSync, type SyncSummary } from "./syncEngine";
import type { SyncError } from "./types";

export type SyncOutcome =
  | { status: "synced"; summary: SyncSummary; photos?: PhotoSyncSummary }
  | { status: "signed-out" }
  | { status: "not-configured" }
  | { status: "failed"; error: SyncError };

// Sync is best-effort background work, so overlapping runs are prevented
// here rather than by every caller (foreground listener, timer, and the
// Account screen's manual button can all fire at once). Two concurrent
// runs would both read the same watermark and push the same rows —
// harmless thanks to idempotent upserts, but wasteful and confusing in the
// UI's "last synced" state.
let inFlight: Promise<SyncOutcome> | undefined;

export function syncNow(): Promise<SyncOutcome> {
  if (!inFlight) {
    inFlight = runOnce()
      .catch((error): SyncOutcome => {
        // Sync is background work; it must never be able to reject into a
        // caller. App.tsx's foreground hook and the Account screen's
        // buttons both await this, and an unhandled rejection there left
        // the sign-in button spinning forever with no way back — found
        // exactly that way during end-to-end testing.
        console.warn("sync: unexpected failure", error);
        return { status: "failed", error: "unreachable" };
      })
      .finally(() => {
        inFlight = undefined;
      });
  }
  return inFlight;
}

async function runOnce(): Promise<SyncOutcome> {
  if (!isSyncConfigured()) return { status: "not-configured" };

  const session = await getStoredSession();
  if (!session) return { status: "signed-out" };

  const db = await getDb();
  const marks = await getSyncMarks();
  const result = await runSync(db, createSyncBackend(session.token), marks);

  if ("error" in result) {
    // An expired or revoked session can't be recovered from in the
    // background, and silently retrying with a dead token forever would
    // leave the UI claiming it's syncing when it isn't. Drop the
    // credentials so the Account screen shows signed-out and the user can
    // act. Local data is untouched.
    if (result.error === "unauthorized") await clearSyncState();
    return { status: "failed", error: result.error };
  }

  await setSyncMarks(result.data.marks);
  await setLastSyncedAt(new Date().toISOString());

  // Photos reconcile after the rows, and never gate them. An item's row is
  // what the recommendation engine reads; its photo is decoration. A
  // failed or slow image transfer must not make an otherwise-successful
  // sync report failure, so this is caught separately and folded into the
  // summary as information rather than as an outcome.
  let photos: PhotoSyncSummary | undefined;
  try {
    photos = await syncPhotos(createPhotoBackend(session.token));
  } catch (error) {
    console.warn("sync: photo reconciliation failed", error);
  }

  return { status: "synced", summary: result.data.summary, photos };
}

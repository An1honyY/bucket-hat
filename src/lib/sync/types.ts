// docs/13-extended-features.md §13.7 (Phase 19) — the contract between the
// sync engine and whatever backend actually stores the rows.
//
// The engine is deliberately backend-agnostic: §13.7 names Supabase and
// Firebase as candidates, and the evaluation that followed added Turso and
// Cloudflare D1 + Better Auth as live options. All of the sync intelligence
// (change detection, last-write-wins resolution, tombstone handling,
// high-water marks) lives client-side in syncEngine.ts, so a backend only
// has to do two things: hand back everything that changed since a
// timestamp, and accept a batch of changes. That keeps the adapter thin
// enough to swap without touching the engine or its tests.
import type { ServiceError } from "../../services/types";

// The tables cloud sync covers, re-exported from the migration that owns
// the list so the two can't drift.
export { SYNCED_TABLES } from "../../../migrations/004_sync_metadata";
export type SyncedTable = (typeof import("../../../migrations/004_sync_metadata"))["SYNCED_TABLES"][number];

// A row as it travels over the wire.
//
// `data` is untyped on purpose. Sync is row-level (§13.7: "last-write-wins
// per row"), so it never needs to understand a Journey's legs or a
// ClothingItem's warmth — only when the row last changed. Typing these
// against the domain models in src/types/index.ts would mean revisiting
// the sync layer every time an additive migration adds a column, which is
// exactly the coupling the trigger-based stamping in migration 004 was
// built to avoid.
//
// `data` holds raw SQLite column names (snake_case) and deliberately
// excludes `id` and `updated_at` — both are lifted out to the two named
// fields so there's exactly one representation of each, rather than a bag
// that carries `updated_at` alongside a camelCase `updatedAt` twin.
export interface SyncRow {
  id: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface SyncTombstone {
  table: string;
  id: string;
  deletedAt: string;
}

// One direction's worth of changes. Shared by push and pull since the
// shape is identical either way.
export interface SyncChangeSet {
  rows: { table: string; row: SyncRow }[];
  tombstones: SyncTombstone[];
}

export interface PullResult extends SyncChangeSet {
  // True when the backend capped this response and more changes are
  // waiting past `serverTime`. The engine keeps pulling until it's false.
  //
  // Without this a capped response is indistinguishable from a complete
  // one, and the client would advance its watermark past rows it never
  // received — the classic silent-data-loss shape. Backends that never cap
  // may omit it.
  hasMore?: boolean;
  // The backend's own clock at the moment it served this pull, stored as
  // the next pull's high-water mark. Taken from the server rather than the
  // device deliberately: device clocks drift and can run behind the
  // server, and a mark set from a slow local clock would re-pull the same
  // rows forever (or, if fast, skip rows written in the gap).
  serverTime: string;
}

export interface PushResult {
  serverTime: string;
}

// Every backend call uses the services-layer result shape from
// docs/12-dev-workflow-ci.md §12.1 / docs/05-data-wiring.md §5.4 — errors
// are values, not exceptions, so the engine can treat "offline" as an
// ordinary outcome and resume silently later (§13.7: "the app must still
// fully function offline exactly as it does in v1").
//
// `unauthorized` is sync-only (an expired or revoked session), so it
// extends ServiceError here rather than widening it. Widening the shared
// type would force every other service's error handling — the address
// autocomplete's message map, the dev menu's failure toggles — to account
// for a state none of them can ever produce.
export type SyncError = ServiceError | "unauthorized";

export type SyncResult<T> = { data: T } | { error: SyncError };

export interface RemotePhoto {
  itemId: string;
  uploadedAt: string;
  size: number;
}

// Gear photos (docs/03-data-models.md §3.3) travel as objects rather than
// as row columns — see photoSync.ts for why. Split into its own interface
// so the row-sync engine and its tests stay entirely unaware of images,
// and so a backend without object storage could implement one and not the
// other.
//
// Image bytes cross this boundary base64-encoded, because that's the only
// representation `expo-file-system` can read and write on React Native
// without a binary-capable file API. The ~33% size penalty is accepted;
// photos are already resized to an 800px long edge at 0.7 JPEG quality.
export interface PhotoBackend {
  listPhotos(): Promise<SyncResult<RemotePhoto[]>>;
  putPhoto(itemId: string, base64: string): Promise<SyncResult<{ uploadedAt: string }>>;
  getPhoto(itemId: string): Promise<SyncResult<string>>;
}

export interface SyncBackend {
  // Everything changed strictly after `since`. Pass undefined for a first
  // sync to receive the full remote state.
  //
  // IMPLEMENTERS: `since` and the `serverTime` you return live in the
  // *server's* clock domain and must be filtered against a stamp the
  // backend assigns on write — not against the `updatedAt` the device sent.
  // The two are different clocks. Filtering a pull on a device-written
  // timestamp means any device whose clock runs behind the server has its
  // writes excluded from every subsequent pull, making them permanently
  // invisible to that user's other devices. In SQL terms: keep a
  // `server_updated_at` column maintained by the backend (a trigger or
  // `DEFAULT now()`), index it, and filter on it; `updated_at` stays the
  // client's value and is used only for last-write-wins. MemoryBackend
  // models this with its `serverStamp` field.
  pull(since: string | undefined): Promise<SyncResult<PullResult>>;

  // Apply a batch of local changes. Backends must treat this as an upsert
  // per row and a delete per tombstone, and must not reject the batch
  // because a row already exists — the engine re-sends anything it isn't
  // certain landed.
  push(changes: SyncChangeSet): Promise<SyncResult<PushResult>>;
}

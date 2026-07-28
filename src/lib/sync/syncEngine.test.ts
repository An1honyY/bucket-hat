// docs/13-extended-features.md §13.7 — end-to-end sync behaviour, run
// against a real SQLite database (better-sqlite3, the same approach the
// migration tests use) and the in-memory backend.
//
// Two devices are modelled as two independent SQLite databases syncing
// through one shared MemoryBackend, which is exactly the topology §13.7
// describes. That makes the conflict cases testable as the scenarios they
// actually are ("edit on the phone, delete on the laptop") rather than as
// assertions about internal state.
import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";
import { up as up001 } from "../../../migrations/001_initial";
import { up as up002 } from "../../../migrations/002_app_settings";
import { up as up003 } from "../../../migrations/003_calibration_toasts";
import { up as up004 } from "../../../migrations/004_sync_metadata";
import { clearColumnCache, collectLocalChanges, SYNC_EPOCH } from "./localChanges";
import { MemoryBackend } from "./memoryBackend";
import { runSync, type SyncMarks } from "./syncEngine";

// better-sqlite3 is synchronous; expo-sqlite's API is async. This adapter
// is the same shim the migration tests use, widened to the handful of
// methods the sync code calls.
function makeDb(): { db: SQLiteDatabase; raw: Database.Database } {
  const raw = new Database(":memory:");
  const db = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      raw.prepare(sql).run(...params);
    },
    getAllAsync: async (sql: string, ...params: unknown[]) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, ...params: unknown[]) => raw.prepare(sql).get(...params) ?? null,
  } as unknown as SQLiteDatabase;
  return { db, raw };
}

async function makeDevice() {
  const { db, raw } = makeDb();
  await up001(db);
  await up002(db);
  await up003(db);
  await up004(db);

  const addCoat = (id: string, name = "Coat", warmth = 6) =>
    raw
      .prepare(
        `INSERT INTO clothing_items (id, name, type, warmth, waterproof, windproof, packable)
         VALUES (?, ?, 'jacket', ?, 0, 0, 0)`
      )
      .run(id, name, warmth);
  const rename = (id: string, name: string) =>
    raw.prepare("UPDATE clothing_items SET name = ? WHERE id = ?").run(name, id);
  const remove = (id: string) => raw.prepare("DELETE FROM clothing_items WHERE id = ?").run(id);
  const read = (id: string) => raw.prepare("SELECT * FROM clothing_items WHERE id = ?").get(id) as any;
  const names = () =>
    (raw.prepare("SELECT name FROM clothing_items ORDER BY name").all() as any[]).map((r) => r.name);

  return { db, raw, addCoat, rename, remove, read, names };
}

// Timestamps come from SQLite's own clock at millisecond resolution, so
// two writes in the same millisecond can tie. Nudging a row's timestamp
// explicitly makes "later" unambiguous in the ordering-sensitive cases.
function setUpdatedAt(raw: Database.Database, id: string, iso: string) {
  raw.prepare("UPDATE clothing_items SET updated_at = ? WHERE id = ?").run(iso, id);
}

describe("sync engine", () => {
  beforeEach(() => {
    // Column metadata is cached per table name, and every test builds a
    // fresh database under the same names.
    clearColumnCache();
  });

  it("pushes local rows to an empty backend", async () => {
    const device = await makeDevice();
    const backend = new MemoryBackend();
    device.addCoat("a", "Blue rain shell");

    const result = await runSync(device.db, backend, {});
    expect("data" in result).toBe(true);
    if (!("data" in result)) return;

    expect(result.data.summary.pushedRows).toBe(1);
    expect(backend.get("clothing_items", "a")?.data.name).toBe("Blue rain shell");
  });

  it("carries a row from one device to another", async () => {
    const phone = await makeDevice();
    const laptop = await makeDevice();
    const backend = new MemoryBackend();

    phone.addCoat("a", "Blue rain shell");
    const phoneSync = await runSync(phone.db, backend, {});
    expect("data" in phoneSync).toBe(true);

    clearColumnCache();
    const laptopSync = await runSync(laptop.db, backend, {});
    if (!("data" in laptopSync)) throw new Error("expected success");

    expect(laptopSync.data.summary.pulledRows).toBe(1);
    expect(laptop.read("a").name).toBe("Blue rain shell");
    // Device-local photo column is not populated from the remote row.
    expect(laptop.read("a").photo_uri).toBeNull();
  });

  it("resolves a concurrent edit in favour of the later write", async () => {
    const phone = await makeDevice();
    const laptop = await makeDevice();
    const backend = new MemoryBackend();

    phone.addCoat("a", "Original");
    await runSync(phone.db, backend, {});
    clearColumnCache();
    let laptopMarks: SyncMarks = {};
    const initial = await runSync(laptop.db, backend, laptopMarks);
    if (!("data" in initial)) throw new Error("expected success");
    laptopMarks = initial.data.marks;

    // Both edit the same row while apart; the laptop's edit is later.
    phone.rename("a", "Edited on phone");
    setUpdatedAt(phone.raw, "a", "2030-01-01T00:00:00.000Z");
    laptop.rename("a", "Edited on laptop");
    setUpdatedAt(laptop.raw, "a", "2030-06-01T00:00:00.000Z");

    clearColumnCache();
    await runSync(phone.db, backend, {});
    clearColumnCache();
    await runSync(laptop.db, backend, laptopMarks);

    expect(backend.get("clothing_items", "a")?.data.name).toBe("Edited on laptop");

    // The phone converges on the next sync rather than clinging to its own.
    clearColumnCache();
    await runSync(phone.db, backend, {});
    expect(phone.read("a").name).toBe("Edited on laptop");
  });

  it("propagates a delete instead of resurrecting the row", async () => {
    // The case tombstones exist for: without them the laptop, which still
    // has the row, would push it straight back after the phone deletes it.
    const phone = await makeDevice();
    const laptop = await makeDevice();
    const backend = new MemoryBackend();

    phone.addCoat("a", "Doomed");
    await runSync(phone.db, backend, {});
    clearColumnCache();
    const laptopFirst = await runSync(laptop.db, backend, {});
    if (!("data" in laptopFirst)) throw new Error("expected success");
    expect(laptop.names()).toEqual(["Doomed"]);

    clearColumnCache();
    phone.remove("a");
    const phoneSecond = await runSync(phone.db, backend, {});
    if (!("data" in phoneSecond)) throw new Error("expected success");
    expect(phoneSecond.data.summary.pushedDeletes).toBe(1);
    expect(backend.has("clothing_items", "a")).toBe(false);

    clearColumnCache();
    const laptopSecond = await runSync(laptop.db, backend, laptopFirst.data.marks);
    if (!("data" in laptopSecond)) throw new Error("expected success");
    expect(laptopSecond.data.summary.pulledDeletes).toBe(1);
    expect(laptop.names()).toEqual([]);

    // And it stays deleted — the laptop must not re-push the row it just
    // removed as though it were a fresh local delete-then-create.
    clearColumnCache();
    await runSync(laptop.db, backend, laptopSecond.data.marks);
    expect(backend.has("clothing_items", "a")).toBe(false);
  });

  it("keeps a row when a local edit is newer than a remote delete", async () => {
    const phone = await makeDevice();
    const backend = new MemoryBackend();
    phone.addCoat("a", "Contested");
    await runSync(phone.db, backend, {});

    // Another device deleted it a long time ago; this device edited it since.
    backend.push({
      rows: [],
      tombstones: [{ table: "clothing_items", id: "a", deletedAt: "2020-01-01T00:00:00.000Z" }],
    });
    phone.rename("a", "Still wanted");
    setUpdatedAt(phone.raw, "a", "2030-01-01T00:00:00.000Z");

    clearColumnCache();
    const result = await runSync(phone.db, backend, {});
    if (!("data" in result)) throw new Error("expected success");

    expect(phone.read("a").name).toBe("Still wanted");
    expect(result.data.summary.pulledDeletes).toBe(0);
  });

  it("treats pre-migration rows as dirty so the first sign-in uploads them", async () => {
    // §13.7's "upload the existing local SQLite data as the initial cloud
    // state." Rows predating migration 004 have updated_at NULL.
    const device = await makeDevice();
    const backend = new MemoryBackend();
    device.addCoat("legacy", "Old coat");
    device.raw.prepare("UPDATE clothing_items SET updated_at = NULL WHERE id = 'legacy'").run();

    const changes = await collectLocalChanges(device.db, undefined);
    expect(changes.rows).toHaveLength(1);
    expect(changes.rows[0].row.updatedAt).toBe(SYNC_EPOCH);

    const result = await runSync(device.db, backend, {});
    if (!("data" in result)) throw new Error("expected success");
    expect(backend.get("clothing_items", "legacy")?.data.name).toBe("Old coat");
  });

  it("does not echo pulled rows back on the next push", async () => {
    const phone = await makeDevice();
    const laptop = await makeDevice();
    const backend = new MemoryBackend();

    phone.addCoat("a", "Shared");
    await runSync(phone.db, backend, {});

    clearColumnCache();
    const first = await runSync(laptop.db, backend, {});
    if (!("data" in first)) throw new Error("expected success");
    expect(first.data.summary.pulledRows).toBe(1);

    clearColumnCache();
    const second = await runSync(laptop.db, backend, first.data.marks);
    if (!("data" in second)) throw new Error("expected success");
    expect(second.data.summary.pushedRows).toBe(0);
    expect(second.data.summary.pulledRows).toBe(0);
  });

  it("keeps pulling until the backend stops capping the response", async () => {
    // The Worker caps a pull at PULL_PAGE_SIZE rows. If the engine took a
    // capped page for a complete one it would advance its watermark past
    // rows it never received — silent data loss, and invisible until
    // someone noticed missing gear months later.
    const phone = await makeDevice();
    const laptop = await makeDevice();
    const backend = new MemoryBackend();

    for (let i = 0; i < 7; i += 1) phone.addCoat(`coat-${i}`, `Coat ${i}`);
    await runSync(phone.db, backend, {});

    backend.pageSize = 2;
    backend.pullCount = 0;
    clearColumnCache();
    const result = await runSync(laptop.db, backend, {});
    if (!("data" in result)) throw new Error("expected success");

    expect(result.data.summary.pulledRows).toBe(7);
    expect(laptop.names()).toHaveLength(7);
    expect(backend.pullCount).toBeGreaterThan(1);

    // And the watermark is complete, so a follow-up sync finds nothing.
    clearColumnCache();
    const followUp = await runSync(laptop.db, backend, result.data.marks);
    if (!("data" in followUp)) throw new Error("expected success");
    expect(followUp.data.summary.pulledRows).toBe(0);
    expect(followUp.data.summary.pushedRows).toBe(0);
  });

  it("still pushes local edits after pulling a future-dated row", async () => {
    // Regression test. The push watermark absorbs pulled rows' timestamps
    // to avoid echoing them back, but those are *device* clocks — a peer
    // running fast writes timestamps in the future. Uncapped, one such row
    // pushed this device's watermark past the present, and every later
    // local edit looked older than "already pushed", so nothing was ever
    // uploaded again. Sync kept reporting success the whole time. Caught
    // by adding gear in the real app and watching only pulls go out.
    const device = await makeDevice();
    const backend = new MemoryBackend();
    backend.seed("clothing_items", {
      id: "from-a-fast-clock",
      updatedAt: "2032-01-01T00:00:00.000Z",
      data: { name: "Future", type: "jacket", warmth: 5, waterproof: 0, windproof: 0, packable: 0 },
    });

    const first = await runSync(device.db, backend, {});
    if (!("data" in first)) throw new Error("expected success");
    expect(first.data.summary.pulledRows).toBe(1);

    // Now make a perfectly ordinary local edit, stamped with today's date.
    clearColumnCache();
    device.addCoat("local", "Added after the future row");
    const second = await runSync(device.db, backend, first.data.marks);
    if (!("data" in second)) throw new Error("expected success");

    expect(second.data.summary.pushedRows).toBeGreaterThanOrEqual(1);
    expect(backend.get("clothing_items", "local")?.data.name).toBe("Added after the future row");
  });

  it("recovers on its own from a push watermark already stored in the future", async () => {
    // The companion to the test above: capping new marks stops a device
    // creating a poisoned watermark, but says nothing about one already on
    // disk — from an earlier build, or a peer whose clock was later fixed.
    // Without self-healing that device never uploads again and never says
    // so, which is the worst failure mode available to a sync system.
    const device = await makeDevice();
    const backend = new MemoryBackend();
    device.addCoat("stranded", "Never uploaded");

    const result = await runSync(device.db, backend, { lastPushedAt: "2032-01-01T00:00:00.000Z" });
    if (!("data" in result)) throw new Error("expected success");

    expect(backend.get("clothing_items", "stranded")?.data.name).toBe("Never uploaded");
    // And the mark it stores afterwards is a sane one, not the bad value.
    expect(result.data.marks.lastPushedAt! < new Date(Date.now() + 60_000).toISOString()).toBe(true);
  });

  it("skips a row it cannot write instead of wedging sync permanently", async () => {
    // Regression test. A remote row missing a NOT NULL column threw out of
    // applyRemoteChanges, which propagated through runSync and rejected
    // syncNow(). Because the watermark never advanced, every later sync
    // re-fetched the same row and died on it again — sync stopped forever
    // while the UI still showed a healthy signed-in account. Found by
    // signing in against a real Worker, not by any unit test.
    const device = await makeDevice();
    const backend = new MemoryBackend();

    backend.seed("clothing_items", {
      id: "poison",
      updatedAt: "2030-01-01T00:00:00.000Z",
      // No `type`/`warmth`/`waterproof` — all NOT NULL with no default.
      data: { name: "Unusable" },
    });
    backend.seed("clothing_items", {
      id: "fine",
      updatedAt: "2030-01-02T00:00:00.000Z",
      data: { name: "Perfectly good", type: "jacket", warmth: 5, waterproof: 0, windproof: 0, packable: 0 },
    });

    const result = await runSync(device.db, backend, {});
    if (!("data" in result)) throw new Error("expected success, not a rejection");

    // The good row still lands — one bad row must not block the batch.
    expect(result.data.summary.failedRows).toBe(1);
    expect(device.names()).toEqual(["Perfectly good"]);

    // And the watermark advanced, so the next sync isn't stuck re-reading it.
    expect(result.data.marks.lastPulledAt).toBeDefined();
    clearColumnCache();
    const followUp = await runSync(device.db, backend, result.data.marks);
    if (!("data" in followUp)) throw new Error("expected success");
    expect(followUp.data.summary.failedRows).toBe(0);
  });

  describe("offline behaviour (§13.7 local-first)", () => {
    it("surfaces a push failure without moving the marks or touching local data", async () => {
      const device = await makeDevice();
      const backend = new MemoryBackend();
      device.addCoat("a", "Unsent");
      backend.failNextPush = "network";

      const result = await runSync(device.db, backend, {});
      expect(result).toEqual({ error: "network" });
      // Local row untouched, and still dirty for the next attempt.
      expect(device.read("a").name).toBe("Unsent");
      const changes = await collectLocalChanges(device.db, undefined);
      expect(changes.rows).toHaveLength(1);
    });

    it("reports failure when there was nothing to push and the pull failed", async () => {
      // Regression test. With no local changes the push is skipped, and
      // the pull-failure branch used to still return success — so the
      // Account screen showed "Synced just now" against a backend that was
      // refusing every connection. Nothing moved in either direction, so
      // this has to read as a failure.
      const device = await makeDevice();
      const backend = new MemoryBackend();
      backend.failNextPull = "network";

      const result = await runSync(device.db, backend, {});
      expect(result).toEqual({ error: "network" });
    });

    it("keeps the push mark when only the pull fails", async () => {
      const device = await makeDevice();
      const backend = new MemoryBackend();
      device.addCoat("a", "Sent");
      backend.failNextPull = "unreachable";

      const result = await runSync(device.db, backend, {});
      if (!("data" in result)) throw new Error("expected partial success");

      // The push landed, so it must not be repeated.
      expect(backend.has("clothing_items", "a")).toBe(true);
      expect(result.data.marks.lastPushedAt).toBeDefined();
      expect(result.data.marks.lastPulledAt).toBeUndefined();

      clearColumnCache();
      const retry = await collectLocalChanges(device.db, result.data.marks.lastPushedAt);
      expect(retry.rows).toHaveLength(0);
    });

    it("recovers once connectivity returns", async () => {
      const device = await makeDevice();
      const backend = new MemoryBackend();
      device.addCoat("a", "Eventually synced");

      backend.failNextPush = "network";
      expect(await runSync(device.db, backend, {})).toEqual({ error: "network" });

      clearColumnCache();
      const result = await runSync(device.db, backend, {});
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.summary.pushedRows).toBe(1);
      expect(backend.has("clothing_items", "a")).toBe(true);
    });
  });

  it("ignores rows for tables this client version does not know", async () => {
    // Forward compatibility: a newer app version may add a table via its
    // own additive migration, and an older client must not crash on it.
    const device = await makeDevice();
    const backend = new MemoryBackend();
    backend.seed("future_table", { id: "x", updatedAt: "2030-01-01T00:00:00.000Z", data: { whatever: 1 } });

    const result = await runSync(device.db, backend, {});
    if (!("data" in result)) throw new Error("expected success");
    expect(result.data.summary.pulledRows).toBe(0);
  });

  it("does not overwrite a local photo path with a remote one", async () => {
    // Photos are device-local files (§3.3); the path is meaningless on
    // another device, so a pull must leave it alone. See DECISIONS.md.
    const device = await makeDevice();
    const backend = new MemoryBackend();
    device.addCoat("a", "With photo");
    device.raw.prepare("UPDATE clothing_items SET photo_uri = ? WHERE id = 'a'").run("file:///local/a.jpg");
    await runSync(device.db, backend, {});

    backend.seed("clothing_items", {
      id: "a",
      updatedAt: "2030-01-01T00:00:00.000Z",
      data: { name: "Renamed elsewhere", type: "jacket", warmth: 6, photo_uri: "file:///other-device/a.jpg" },
    });

    clearColumnCache();
    await runSync(device.db, backend, {});

    expect(device.read("a").name).toBe("Renamed elsewhere");
    expect(device.read("a").photo_uri).toBe("file:///local/a.jpg");
  });
});

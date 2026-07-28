import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";
import { up as up001 } from "./001_initial";
import { up, SYNCED_TABLES } from "./004_sync_metadata";

describe("004_sync_metadata migration", () => {
  function migrated() {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;
    return { raw, db };
  }

  it("adds updated_at to every synced table", async () => {
    const { raw, db } = migrated();
    await up001(db);
    await up(db);

    for (const table of SYNCED_TABLES) {
      const columns = raw
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((row: any) => row.name);
      expect(columns).toContain("updated_at");
    }
  });

  it("creates the sync_tombstones table keyed on (table_name, row_id)", async () => {
    const { raw, db } = migrated();
    await up001(db);
    await up(db);

    raw
      .prepare("INSERT INTO sync_tombstones (table_name, row_id, deleted_at) VALUES (?, ?, ?)")
      .run("clothing_items", "abc", "2026-07-28T00:00:00.000Z");
    // Same row deleted twice must not accumulate duplicate tombstones —
    // the sync push would otherwise send the same delete repeatedly.
    raw
      .prepare(
        `INSERT INTO sync_tombstones (table_name, row_id, deleted_at) VALUES (?, ?, ?)
         ON CONFLICT(table_name, row_id) DO UPDATE SET deleted_at = excluded.deleted_at`
      )
      .run("clothing_items", "abc", "2026-07-28T01:00:00.000Z");

    const rows = raw.prepare("SELECT * FROM sync_tombstones").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].deleted_at).toBe("2026-07-28T01:00:00.000Z");
  });

  it("leaves updated_at NULL on rows that existed before the migration", async () => {
    const { raw, db } = migrated();
    await up001(db);
    raw
      .prepare(
        `INSERT INTO clothing_items (id, name, type, warmth, waterproof, windproof, packable)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run("pre-existing", "Old coat", "jacket", 6, 0, 0, 0);

    await up(db);

    const row = raw.prepare("SELECT updated_at FROM clothing_items WHERE id = ?").get("pre-existing") as any;
    // NULL, not a fabricated timestamp — syncEngine treats it as older
    // than anything, so the first sign-in still pushes this row.
    expect(row.updated_at).toBeNull();
  });

  // The triggers are the load-bearing part of this migration — every
  // repository write path depends on them for sync bookkeeping, and none
  // of those call sites mention updated_at at all.
  describe("stamping triggers", () => {
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    async function seeded() {
      const { raw, db } = migrated();
      await up001(db);
      await up(db);
      const insert = (id: string) =>
        raw
          .prepare(
            `INSERT INTO clothing_items (id, name, type, warmth, waterproof, windproof, packable)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(id, "Coat", "jacket", 6, 0, 0, 0);
      const updatedAt = (id: string) =>
        (raw.prepare("SELECT updated_at FROM clothing_items WHERE id = ?").get(id) as any)?.updated_at;
      return { raw, insert, updatedAt };
    }

    it("stamps updated_at on insert, in the same format as Date#toISOString", async () => {
      const { insert, updatedAt } = await seeded();
      insert("a");
      expect(updatedAt("a")).toMatch(ISO);
      // Directly comparable against a JS timestamp — that comparability is
      // what last-write-wins rests on. Checked as "within a few seconds of
      // now" rather than "<= now": the trigger reads SQLite's clock and
      // this line reads JavaScript's, and those two sources can disagree
      // by a millisecond in either direction. A strict `<=` here failed
      // about half the time — the same clock-source mismatch that
      // CLOCK_TOLERANCE_MS exists for in syncEngine.ts.
      const written = new Date(updatedAt("a")).getTime();
      expect(Math.abs(written - Date.now())).toBeLessThan(5000);
    });

    it("advances updated_at on a plain update", async () => {
      const { raw, insert, updatedAt } = await seeded();
      insert("a");
      const before = updatedAt("a");
      raw.prepare("UPDATE clothing_items SET name = 'Renamed' WHERE id = 'a'").run();
      expect(updatedAt("a")).toMatch(ISO);
      expect(updatedAt("a") >= before).toBe(true);
    });

    it("leaves an explicitly-supplied updated_at alone", async () => {
      // This is what the sync engine's pull relies on: a row written with
      // a remote timestamp must keep it, or every pulled row would look
      // locally-modified and immediately push straight back.
      const { raw, updatedAt } = await seeded();
      const remote = "2030-01-01T00:00:00.000Z";
      raw
        .prepare(
          `INSERT INTO clothing_items (id, name, type, warmth, waterproof, windproof, packable, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run("remote", "From other device", "jacket", 6, 0, 0, 0, remote);
      expect(updatedAt("remote")).toBe(remote);

      const newerRemote = "2030-06-01T00:00:00.000Z";
      raw.prepare("UPDATE clothing_items SET name = ?, updated_at = ? WHERE id = 'remote'").run("Newer", newerRemote);
      expect(updatedAt("remote")).toBe(newerRemote);
    });

    it("re-stamps when a write supplies the timestamp the row already had", async () => {
      // Documents the one gap in the `NEW.updated_at IS OLD.updated_at`
      // guard: supplying the *identical* timestamp is indistinguishable
      // from not supplying one, so the trigger treats it as a local edit.
      // Harmless in practice because it's only reachable via a no-op write
      // — syncEngine.ts only ever writes a pulled row when the remote
      // timestamp is strictly newer than the local one (see applyRemoteRow),
      // so it never re-writes a row with the timestamp already stored.
      const { raw, updatedAt } = await seeded();
      const remote = "2030-01-01T00:00:00.000Z";
      raw
        .prepare(
          `INSERT INTO clothing_items (id, name, type, warmth, waterproof, windproof, packable, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run("remote", "From other device", "jacket", 6, 0, 0, 0, remote);

      raw.prepare("UPDATE clothing_items SET name = ?, updated_at = ? WHERE id = 'remote'").run("Same ts", remote);
      expect(updatedAt("remote")).not.toBe(remote);
    });

    it("writes a tombstone on delete", async () => {
      const { raw, insert } = await seeded();
      insert("a");
      raw.prepare("DELETE FROM clothing_items WHERE id = 'a'").run();

      const tombstone = raw
        .prepare("SELECT * FROM sync_tombstones WHERE table_name = 'clothing_items' AND row_id = 'a'")
        .get() as any;
      expect(tombstone).toBeDefined();
      expect(tombstone.deleted_at).toMatch(ISO);
    });

    it("lets a re-inserted row out-timestamp its own tombstone", async () => {
      // No trigger clears tombstones on re-insert; the engine resolves
      // row-vs-tombstone by comparing timestamps, so the re-insert only
      // has to be the later of the two.
      const { raw, insert, updatedAt } = await seeded();
      insert("a");
      raw.prepare("DELETE FROM clothing_items WHERE id = 'a'").run();
      insert("a");

      const tombstone = raw
        .prepare("SELECT deleted_at FROM sync_tombstones WHERE table_name = 'clothing_items' AND row_id = 'a'")
        .get() as any;
      expect(updatedAt("a") >= tombstone.deleted_at).toBe(true);
    });

    it("does not create a delete trigger for the single-row config tables", async () => {
      const { raw } = await seeded();
      const triggers = raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'")
        .all()
        .map((r: any) => r.name);
      expect(triggers).toContain("trg_warmth_calibration_stamp_update");
      expect(triggers).not.toContain("trg_warmth_calibration_tombstone_delete");
      expect(triggers).toContain("trg_clothing_items_tombstone_delete");
    });
  });

  it("does not touch app_settings", async () => {
    // app_settings holds device-local preferences and is deliberately not
    // a synced table — guard against it being added to SYNCED_TABLES
    // without the deliberate decision that would require.
    expect(SYNCED_TABLES as readonly string[]).not.toContain("app_settings");
  });
});

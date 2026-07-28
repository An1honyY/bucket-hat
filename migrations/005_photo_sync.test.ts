import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";
import { up as up001 } from "./001_initial";
import { up as up004, SYNCED_TABLES } from "./004_sync_metadata";
import { up } from "./005_photo_sync";

describe("005_photo_sync migration", () => {
  function migrated() {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;
    return { raw, db };
  }

  it("creates gear_photo_sync keyed on item_id", async () => {
    const { raw, db } = migrated();
    await up001(db);
    await up004(db);
    await up(db);

    const columns = raw
      .prepare("PRAGMA table_info(gear_photo_sync)")
      .all()
      .map((row: any) => row.name);
    expect(columns).toEqual(
      expect.arrayContaining(["item_id", "uploaded_at", "uploaded_file_mtime", "downloaded_at"])
    );

    raw
      .prepare(
        `INSERT INTO gear_photo_sync (item_id, uploaded_at, uploaded_file_mtime) VALUES (?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET uploaded_at = excluded.uploaded_at`
      )
      .run("abc", "2026-07-28T00:00:00.000Z", 1000);
    raw
      .prepare(
        `INSERT INTO gear_photo_sync (item_id, uploaded_at, uploaded_file_mtime) VALUES (?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET uploaded_at = excluded.uploaded_at`
      )
      .run("abc", "2026-07-28T01:00:00.000Z", 1000);

    expect(raw.prepare("SELECT COUNT(*) AS n FROM gear_photo_sync").get()).toEqual({ n: 1 });
  });

  it("is not a synced table", async () => {
    // It records this device's relationship to the object store — which
    // files it has uploaded and fetched. That's meaningless on any other
    // device, so syncing it would be actively wrong.
    expect(SYNCED_TABLES as readonly string[]).not.toContain("gear_photo_sync");
  });
});

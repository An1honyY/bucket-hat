import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";
import { up as up001 } from "./001_initial";
import { up as up004 } from "./004_sync_metadata";
import { up as up005 } from "./005_photo_sync";
import { up } from "./006_photo_mtime_units";

describe("006_photo_mtime_units migration", () => {
  async function migrated() {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;
    await up001(db);
    await up004(db);
    await up005(db);
    return { raw, db };
  }

  it("clears mtimes recorded under the old seconds unit, keeping the rows", async () => {
    const { raw, db } = await migrated();
    raw
      .prepare(
        "INSERT INTO gear_photo_sync (item_id, uploaded_at, uploaded_file_mtime, downloaded_at) VALUES (?, ?, ?, ?)"
      )
      // A plausible legacy value: seconds since the epoch, ~1000x smaller
      // than the milliseconds File.lastModified now returns.
      .run("jacket", "2026-07-28T00:00:00.000Z", 1769000000, null);

    await up(db);

    const row = raw.prepare("SELECT * FROM gear_photo_sync WHERE item_id = 'jacket'").get() as any;
    // The row survives — only the unusable timestamp is dropped, so
    // uploaded_at still records that this device has synced the photo.
    expect(row).toBeDefined();
    expect(row.uploaded_file_mtime).toBeNull();
    expect(row.uploaded_at).toBe("2026-07-28T00:00:00.000Z");
  });

  it("is safe to run against an empty table", async () => {
    const { raw, db } = await migrated();
    await expect(up(db)).resolves.not.toThrow();
    expect(raw.prepare("SELECT COUNT(*) AS n FROM gear_photo_sync").get()).toEqual({ n: 0 });
  });
});

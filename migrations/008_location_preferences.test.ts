import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";
import { up as up001 } from "./001_initial";
import { up } from "./008_location_preferences";

describe("008_location_preferences migration", () => {
  it("adds preferred_gear_ids and notes to saved_locations", async () => {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;

    await up001(db);
    await up(db);

    const columns = raw
      .prepare("PRAGMA table_info(saved_locations)")
      .all()
      .map((row: any) => row.name);
    expect(columns).toContain("preferred_gear_ids");
    expect(columns).toContain("notes");
  });

  it("leaves existing rows readable, with the new columns null", async () => {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;

    await up001(db);
    raw
      .prepare(
        `INSERT INTO saved_locations (id, label, address, lat, lng)
         VALUES ('l1', 'Home', '1 Queen St', -36.8485, 174.7633)`
      )
      .run();
    await up(db);

    const row: any = raw.prepare("SELECT * FROM saved_locations WHERE id = 'l1'").get();
    expect(row.label).toBe("Home");
    expect(row.preferred_gear_ids).toBeNull();
    expect(row.notes).toBeNull();
  });
});

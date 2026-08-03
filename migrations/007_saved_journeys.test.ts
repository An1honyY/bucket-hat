import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";
import { up as up001 } from "./001_initial";
import { up } from "./007_saved_journeys";

describe("007_saved_journeys migration", () => {
  it("adds is_favorite, waypoint_ids and recurrence to saved_routes", async () => {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;

    await up001(db);
    await up(db);

    const columns = raw
      .prepare("PRAGMA table_info(saved_routes)")
      .all()
      .map((row: any) => row.name);
    expect(columns).toContain("is_favorite");
    expect(columns).toContain("waypoint_ids");
    expect(columns).toContain("recurrence");
  });

  it("leaves existing rows readable, with the new columns null", async () => {
    const raw = new Database(":memory:");
    const db = { execAsync: async (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;

    await up001(db);
    raw
      .prepare(
        `INSERT INTO saved_routes (id, label, origin_id, destination_id, preferred_mode, created_at)
         VALUES ('r1', 'Home → Work', 'l1', 'l2', 'bus', '2026-08-01T00:00:00.000Z')`
      )
      .run();
    await up(db);

    const row: any = raw.prepare("SELECT * FROM saved_routes WHERE id = 'r1'").get();
    expect(row.label).toBe("Home → Work");
    expect(row.is_favorite).toBeNull();
    expect(row.waypoint_ids).toBeNull();
    expect(row.recurrence).toBeNull();
  });
});

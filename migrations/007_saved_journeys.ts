// Additive migration (Section 3.1) — turns a `SavedRoute` into something
// worth managing on a screen of its own (docs/04-screens-navigation.md §4.3).
//
// §4.3 deliberately kept a SavedRoute to origin/destination/mode so it "stays
// valid indefinitely, unlike a specific planned Journey" — that still holds.
// None of these three columns pins a route to a date: `waypoint_ids` is the
// same trip shape §4.3.1 already lets you build and then lost on save,
// `recurrence` is a *preferred* repeat pattern pre-filled into Plan rather
// than a schedule that fires on its own (a materialized Journey is still the
// only thing that ever produces a notification, §7.3), and `is_favorite`
// mirrors SavedLocation's own star (§4.3).
import type { SQLiteDatabase } from "expo-sqlite";

export const version = 7;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE saved_routes ADD COLUMN is_favorite INTEGER;
    ALTER TABLE saved_routes ADD COLUMN waypoint_ids TEXT;
    ALTER TABLE saved_routes ADD COLUMN recurrence TEXT;
  `);
}

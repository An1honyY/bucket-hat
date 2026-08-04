// Additive migration (Section 3.1) — per-location standing preferences.
//
// §3.4 gave a SavedLocation exactly one piece of "what is this place like"
// knowledge: `has_reliable_climate_control`, a single boolean the engine
// reads. These two columns are the other half of that idea, and deliberately
// the half the engine does *not* read: `preferred_gear_ids` is what the user
// has decided they want at this place whatever the forecast says, and `notes`
// is the free text no structured field will ever capture ("side door is
// locked after 6", "they keep it freezing").
//
// `notes` is free text rather than EnvironmentAnnotation's fixed
// `EnvironmentEffectType` set on purpose: an annotation is a structured
// signal the engine matches against (§7.8), while this is a human reminder
// attached to a named place. Don't collapse the two.
import type { SQLiteDatabase } from "expo-sqlite";

export const version = 8;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE saved_locations ADD COLUMN preferred_gear_ids TEXT;
    ALTER TABLE saved_locations ADD COLUMN notes TEXT;
  `);
}

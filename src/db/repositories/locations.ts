import { getDb } from "../index";
import { fromSqlBoolOptional, fromSqlJson, newId, toSqlBool, toSqlJson } from "../rowMapping";
import type { SavedLocation } from "../../types";

interface LocationRow {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  icon: string | null;
  is_favorite: number | null;
  last_used_at: string | null;
  has_reliable_climate_control: number | null;
  preferred_gear_ids: string | null;
  notes: string | null;
}

function fromRow(row: LocationRow): SavedLocation {
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    icon: row.icon ?? undefined,
    isFavorite: fromSqlBoolOptional(row.is_favorite),
    lastUsedAt: row.last_used_at ?? undefined,
    hasReliableClimateControl: fromSqlBoolOptional(row.has_reliable_climate_control),
    preferredGearIds: fromSqlJson<string[]>(row.preferred_gear_ids),
    notes: row.notes ?? undefined,
  };
}

// Empty is stored as NULL, not as `[]`/`""` — "no preferred gear here" and
// "no notes here" are the absence of a preference, and a row that round-trips
// to `undefined` reads the same as every location saved before this existed.
function toGearIdsColumn(ids: string[] | undefined): string | null {
  return ids && ids.length > 0 ? toSqlJson(ids) : null;
}

function toNotesColumn(notes: string | undefined): string | null {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : null;
}

// Favorites first (§4.3), then the rest by lastUsedAt descending (most
// recently used first) — the same ordering the Locations list and the
// Plan-screen autocomplete both want.
export async function listLocations(): Promise<SavedLocation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocationRow>(
    `SELECT * FROM saved_locations
     ORDER BY COALESCE(is_favorite, 0) DESC, COALESCE(last_used_at, '') DESC, label ASC`
  );
  return rows.map(fromRow);
}

export async function createLocation(input: Omit<SavedLocation, "id">): Promise<SavedLocation> {
  const db = await getDb();
  const location: SavedLocation = { ...input, id: newId() };
  await db.runAsync(
    `INSERT INTO saved_locations (id, label, address, lat, lng, icon, is_favorite, last_used_at, has_reliable_climate_control, preferred_gear_ids, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    location.id,
    location.label,
    location.address,
    location.lat,
    location.lng,
    location.icon ?? null,
    toSqlBool(location.isFavorite),
    location.lastUsedAt ?? null,
    toSqlBool(location.hasReliableClimateControl),
    toGearIdsColumn(location.preferredGearIds),
    toNotesColumn(location.notes)
  );
  return location;
}

export async function updateLocation(location: SavedLocation): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE saved_locations SET
      label = ?, address = ?, lat = ?, lng = ?, icon = ?, is_favorite = ?, last_used_at = ?, has_reliable_climate_control = ?,
      preferred_gear_ids = ?, notes = ?
     WHERE id = ?`,
    location.label,
    location.address,
    location.lat,
    location.lng,
    location.icon ?? null,
    toSqlBool(location.isFavorite),
    location.lastUsedAt ?? null,
    toSqlBool(location.hasReliableClimateControl),
    toGearIdsColumn(location.preferredGearIds),
    toNotesColumn(location.notes),
    location.id
  );
}

// docs/10-production-readiness.md §10.3 — import upserts by id (preserving
// the exported id, unlike createLocation() which always mints a fresh one).
export async function upsertLocation(location: SavedLocation): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO saved_locations (id, label, address, lat, lng, icon, is_favorite, last_used_at, has_reliable_climate_control, preferred_gear_ids, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label, address = excluded.address, lat = excluded.lat, lng = excluded.lng,
       icon = excluded.icon, is_favorite = excluded.is_favorite, last_used_at = excluded.last_used_at,
       has_reliable_climate_control = excluded.has_reliable_climate_control,
       preferred_gear_ids = excluded.preferred_gear_ids, notes = excluded.notes`,
    location.id,
    location.label,
    location.address,
    location.lat,
    location.lng,
    location.icon ?? null,
    toSqlBool(location.isFavorite),
    location.lastUsedAt ?? null,
    toSqlBool(location.hasReliableClimateControl),
    toGearIdsColumn(location.preferredGearIds),
    toNotesColumn(location.notes)
  );
}

export async function deleteLocation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM saved_locations WHERE id = ?", id);
}

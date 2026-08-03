import { getDb } from "../index";
import { newId } from "../rowMapping";
import type { RecurrenceRule, SavedRoute } from "../../types";

interface SavedRouteRow {
  id: string;
  label: string;
  origin_id: string;
  destination_id: string;
  preferred_mode: string | null;
  created_at: string;
  last_used_at: string | null;
  is_favorite: number | null;
  waypoint_ids: string | null;
  recurrence: string | null;
}

// Both JSON columns are read defensively: a row written before migration 007
// has them NULL, and a half-synced or hand-edited value shouldn't take a
// whole screen down over one bad parse.
function parseJson<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function fromRow(row: SavedRouteRow): SavedRoute {
  return {
    id: row.id,
    label: row.label,
    originId: row.origin_id,
    destinationId: row.destination_id,
    preferredMode: (row.preferred_mode as SavedRoute["preferredMode"]) ?? undefined,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? undefined,
    isFavorite: row.is_favorite === 1 ? true : undefined,
    waypointIds: parseJson<string[]>(row.waypoint_ids),
    recurrence: parseJson<RecurrenceRule>(row.recurrence),
  };
}

// Favourites first, then most recently used — docs/04-screens-navigation.md
// §4.3's ordering, extended with the same favourites-pinned rule the
// SavedLocation list already uses. A speed shortcut, not a directory:
// nothing here is alphabetical.
export async function listSavedRoutes(): Promise<SavedRoute[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavedRouteRow>(
    `SELECT * FROM saved_routes
     ORDER BY COALESCE(is_favorite, 0) DESC, COALESCE(last_used_at, created_at) DESC`
  );
  return rows.map(fromRow);
}

export async function getSavedRoute(id: string): Promise<SavedRoute | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<SavedRouteRow>("SELECT * FROM saved_routes WHERE id = ?", id);
  return row ? fromRow(row) : undefined;
}

export async function createSavedRoute(input: Omit<SavedRoute, "id" | "createdAt">): Promise<SavedRoute> {
  const db = await getDb();
  const route: SavedRoute = { ...input, id: newId(), createdAt: new Date().toISOString() };
  await db.runAsync(
    `INSERT INTO saved_routes
       (id, label, origin_id, destination_id, preferred_mode, created_at, last_used_at, is_favorite, waypoint_ids, recurrence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    route.id,
    route.label,
    route.originId,
    route.destinationId,
    route.preferredMode ?? null,
    route.createdAt,
    route.lastUsedAt ?? null,
    route.isFavorite ? 1 : null,
    route.waypointIds && route.waypointIds.length > 0 ? JSON.stringify(route.waypointIds) : null,
    route.recurrence ? JSON.stringify(route.recurrence) : null
  );
  return route;
}

// Full-row write, matching every other repository's update shape — the
// caller passes the whole SavedRoute it already holds rather than a patch,
// so there's no "which fields were meant to be cleared" ambiguity.
export async function updateSavedRoute(route: SavedRoute): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE saved_routes
        SET label = ?, origin_id = ?, destination_id = ?, preferred_mode = ?,
            last_used_at = ?, is_favorite = ?, waypoint_ids = ?, recurrence = ?
      WHERE id = ?`,
    route.label,
    route.originId,
    route.destinationId,
    route.preferredMode ?? null,
    route.lastUsedAt ?? null,
    route.isFavorite ? 1 : null,
    route.waypointIds && route.waypointIds.length > 0 ? JSON.stringify(route.waypointIds) : null,
    route.recurrence ? JSON.stringify(route.recurrence) : null,
    route.id
  );
}

// Bumps lastUsedAt — called when a saved journey is reused, per §4.3's
// recency-ordering requirement.
export async function touchSavedRoute(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE saved_routes SET last_used_at = ? WHERE id = ?", new Date().toISOString(), id);
}

export async function deleteSavedRoute(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM saved_routes WHERE id = ?", id);
}

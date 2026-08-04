import { useCallback, useEffect, useState } from "react";
import { listClothing } from "../db/repositories/clothing";
import { listShoes } from "../db/repositories/shoes";
import { listUmbrellas } from "../db/repositories/umbrellas";
import { accessoryIconKind, type ClothingIconKind } from "../components/ClothingTypeIcon";

// A flat, display-ready view of everything the user owns across the three
// wearable inventories, so a screen that just needs "let them pick some of
// their gear" doesn't have to re-derive the icon kind and grouping each time.
//
// Vehicles are deliberately absent: this exists for things you'd carry or
// wear to a place, and a car isn't a gear pick in that sense.

export type GearGroup = "Clothing" | "Shoes" | "Umbrellas";

export interface GearOption {
  id: string;
  name: string;
  icon: ClothingIconKind;
  photoUri?: string;
  group: GearGroup;
}

export interface GearOptionsResult {
  options: GearOption[];
  /** False until the first load resolves — an empty `options` before that is
   *  "not known yet", not "owns nothing", and the two need different copy. */
  loaded: boolean;
  reload: () => void;
}

export function useGearOptions(): GearOptionsResult {
  const [options, setOptions] = useState<GearOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    let cancelled = false;
    Promise.all([listClothing(), listShoes(), listUmbrellas()]).then(([clothing, shoes, umbrellas]) => {
      if (cancelled) return;
      setOptions([
        ...clothing.map((c) => ({
          id: c.id,
          name: c.name,
          // An accessory has no sub-type in §3, so its glyph comes from the
          // name — the same match ClothingTypeIcon does for the engine's own
          // accessory picks.
          icon: (c.type === "accessory" ? accessoryIconKind(c.name) : c.type) as ClothingIconKind,
          photoUri: c.photoUri,
          group: "Clothing" as const,
        })),
        ...shoes.map((s) => ({ id: s.id, name: s.name, icon: "shoe" as const, photoUri: s.photoUri, group: "Shoes" as const })),
        ...umbrellas.map((u) => ({
          id: u.id,
          name: u.name,
          icon: "umbrella" as const,
          photoUri: u.photoUri,
          group: "Umbrellas" as const,
        })),
      ]);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  return { options, loaded, reload };
}

/** Resolves saved ids back to items, in the order the user picked them.
 *  Ids with no surviving item are dropped rather than rendered as a
 *  placeholder — gear deleted from the wardrobe should simply stop appearing
 *  here, exactly as §9.3's "omit rather than placeholder" rule has it. */
export function resolveGearOptions(ids: string[] | undefined, options: GearOption[]): GearOption[] {
  if (!ids || ids.length === 0) return [];
  const byId = new Map(options.map((o) => [o.id, o]));
  return ids.map((id) => byId.get(id)).filter((o): o is GearOption => o !== undefined);
}

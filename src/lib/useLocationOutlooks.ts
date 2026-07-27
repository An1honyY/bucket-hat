import { useEffect, useState } from "react";
import { getHourlyForecast, type HourlyReading } from "../services/weatherService";
import type { LocationEta } from "./useRouteEtas";

// Fetches the hourly forecast for every location on the route, each starting
// from the hour that location is actually reached (its ETA), not from the
// departure hour.
//
// Starting per-location rather than on one shared clock window is what makes
// "what's it like where I'll be, when I'm there" answerable: the origin's
// first reading is departure, a stop's first reading is when you pass through,
// and the destination's run forward from arrival — which is the window that
// matters, since the destination is where you may stay for hours.
//
// One request per location against Open-Meteo, which is free and keyless
// (docs/02-external-apis.md), so this is not the cost-sensitive fetch on this
// screen — useRouteEtas' Routes call is.
export const OUTLOOK_HOURS = 12;

export interface LocationOutlook extends LocationEta {
  readings: HourlyReading[];
}

export function useLocationOutlooks(etas: LocationEta[]): LocationOutlook[] {
  const [byKey, setByKey] = useState<Record<string, HourlyReading[]>>({});

  // Coordinates plus start hour — the same reading window is reused rather
  // than refetched when an unrelated prop changes, and a location that keeps
  // its ETA across a re-plan keeps its data.
  const keys = etas.map((e) => `${e.location.lat},${e.location.lng}@${e.atIso}`);
  const signature = keys.join("|");

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      etas.map(async (eta, i) => {
        const key = keys[i];
        const result = await getHourlyForecast({ lat: eta.location.lat, lng: eta.location.lng }, eta.atIso, OUTLOOK_HOURS);
        return [key, "data" in result ? result.data : []] as const;
      })
    ).then((entries) => {
      // Same degrade as everywhere else on this screen: a failed fetch means
      // that location renders nothing, not an error banner.
      if (!cancelled) setByKey(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // `signature` captures every input that should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return etas.map((eta, i) => ({ ...eta, readings: byKey[keys[i]] ?? [] }));
}

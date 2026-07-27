import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getLocalOutlook, type DailyReading, type HourlyReading } from "../services/weatherService";
import { recommendGear, type Recommendation } from "./recommend";
import { listClothing } from "../db/repositories/clothing";
import { listShoes } from "../db/repositories/shoes";
import { listUmbrellas } from "../db/repositories/umbrellas";
import { getWarmthCalibration } from "../db/repositories/calibration";
import { getAdvancedThresholds } from "../db/repositories/advancedThresholds";
import { resolveApproximateLocation } from "./approximateLocation";
import { reverseGeocodeSuburb } from "../services/placesService";
import { newId } from "../db/rowMapping";
import type { Journey, WeatherSnapshot } from "../types";

// "Right now" card — docs/04-screens-navigation.md §4.2. Location resolved
// via approximateLocation.ts's shared GPS → default-location → Auckland
// chain (also used by LocationPickerMap's pin-drop seeding). One Open-Meteo
// call, and a *reduced* recommendGear() pass: a single short walk leg means
// AC-contrast and the warmup discount never fire on their own, and
// bottoms/severeWeatherAdvisory are stripped explicitly per §4.2's "the
// reduced path never triggers bottoms, the severe-weather advisory, or
// wear tracking." Refreshes on tab focus, not continuously, to avoid
// draining battery/quota — and throttled below so hopping between tabs
// (Today → Plan → Today) doesn't refire the network round-trip every time.

export interface RightNowState {
  // True only when there is nothing to show yet — a cold start with no cached
  // reading. A refresh over existing data never sets this; see `refreshing`.
  loading: boolean;
  weather: WeatherSnapshot | null;
  recommendation: Recommendation | null;
  isFallbackLocation: boolean;
  suburb: string | null;
  hourly: HourlyReading[];
  daily: DailyReading[];
  // When the reading was actually fetched, so the card can say how old it is
  // independently of the forecast hour it describes.
  fetchedAt: number | null;
}

export interface RightNowResult extends RightNowState {
  // A background update over data already on screen. Drives the pull-to-
  // refresh spinner; deliberately does NOT blank the card.
  refreshing: boolean;
  refresh: () => void;
}

// Module-level (not component state) so it survives this hook's own
// mount/unmount — a tab switch keeps TodayScreen mounted in React
// Navigation, but a module cache is the more robust guarantee either way.
// A fresh app launch always gets `cache === null`, so the first load on
// any given run is never skipped.
//
// Refresh cadence is set by how often the data can actually change. Per
// Open-Meteo's model table, the fastest-updating models it serves (GFS,
// HRRR, UKMO, AROME) publish hourly; ICON is 3-hourly and IFS/GEM 6-hourly.
// Nothing we display moves faster than that, and the hourly reading itself
// only advances on the hour, so polling more often buys nothing. Fifteen
// minutes keeps the "as of" stamp honest and picks up a new model run
// promptly without hammering a free, keyless API.
const STALE_AFTER_MS = 15 * 60_000;
const AUTO_REFRESH_MS = 15 * 60_000;
const HOURLY_HOURS = 48;
const DAILY_DAYS = 7;

const EMPTY: RightNowState = {
  loading: true,
  weather: null,
  recommendation: null,
  isFallbackLocation: false,
  suburb: null,
  hourly: [],
  daily: [],
  fetchedAt: null,
};

let cache: { state: RightNowState; fetchedAt: number; coordsKey: string } | null = null;

function buildSyntheticJourney(weather: WeatherSnapshot, coords: { lat: number; lng: number }): Journey {
  const here = { id: "current-location", label: "Current location", address: "", lat: coords.lat, lng: coords.lng };
  return {
    id: "right-now",
    origin: here,
    destination: here,
    departTime: weather.time,
    legs: [
      {
        id: newId(),
        mode: "walk",
        label: "Right now",
        durationMin: 1, // well under WARMUP_WALK_MIN_MINUTES — no warmup discount from a single-point check
        startTime: weather.time,
        outdoor: true,
        weather,
      },
    ],
  };
}

export function useRightNow(): RightNowResult {
  const [state, setState] = useState<RightNowState>(cache?.state ?? EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  // Guards against a pull-to-refresh landing on top of the focus/interval
  // fetch (or vice versa) and setting state twice from two round-trips.
  const inFlight = useRef(false);

  const load = useCallback(async (options: { force: boolean }) => {
    if (inFlight.current) return;

    // A fresh-enough cached read wins outright — skip the round-trip entirely
    // rather than refetching every time the Today tab regains focus. A manual
    // pull always forces, since the whole point of pulling is distrusting the
    // age on screen.
    const isFresh = cache !== null && Date.now() - cache.fetchedAt < STALE_AFTER_MS;
    if (!options.force && isFresh) {
      setState(cache!.state);
      return;
    }

    inFlight.current = true;
    // Deliberately not `loading: true`. The card already has a reading and
    // says when it was taken, so replacing it with a spinner every time the
    // tab regains focus threw away information the user could still use for
    // no gain. `loading` now only covers the cold start; everything after is
    // a quiet background update.
    setRefreshing(true);

    try {
      const { lat, lng, isFallback: isFallbackLocation } = await resolveApproximateLocation();
      const coords = { lat, lng };
      const coordsKey = `${lat},${lng}`;

      const [outlookResult, suburbResult] = await Promise.all([
        getLocalOutlook(coords, HOURLY_HOURS, DAILY_DAYS),
        reverseGeocodeSuburb(coords.lat, coords.lng),
      ]);
      const suburb = "data" in suburbResult ? suburbResult.data.suburb : null;

      if (!("data" in outlookResult)) {
        // A failed refresh keeps whatever is already on screen — the stale
        // reading plus its age is more useful than an empty card. Only a
        // cold-start failure surfaces the "couldn't fetch" state.
        setState((prev) =>
          prev.weather
            ? { ...prev, loading: false, suburb: suburb ?? prev.suburb }
            : { ...EMPTY, loading: false, isFallbackLocation, suburb }
        );
        return;
      }

      const { current: weather, hourly, daily } = outlookResult.data;

      const [clothing, shoes, umbrellas, calibration, thresholds] = await Promise.all([
        listClothing(),
        listShoes(),
        listUmbrellas(),
        getWarmthCalibration(),
        getAdvancedThresholds(),
      ]);

      const journey = buildSyntheticJourney(weather, coords);
      const full = recommendGear(journey, { clothing, shoes, umbrellas }, calibration, "no-preference", thresholds);
      // §4.2 — never surfaced on the reduced path.
      const reduced: Recommendation = { ...full, bottoms: undefined, severeWeatherAdvisory: undefined };

      const fetchedAt = Date.now();
      const next: RightNowState = {
        loading: false,
        weather,
        recommendation: reduced,
        isFallbackLocation,
        suburb,
        hourly,
        daily,
        fetchedAt,
      };
      setState(next);
      cache = { state: next, fetchedAt, coordsKey };
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load({ force: false });
      // Keeps ticking only while Today is the focused tab — useFocusEffect's
      // cleanup tears the timer down on blur, so a backgrounded screen isn't
      // polling a weather API it isn't showing.
      const id = setInterval(() => load({ force: true }), AUTO_REFRESH_MS);
      return () => clearInterval(id);
    }, [load])
  );

  const refresh = useCallback(() => {
    load({ force: true });
  }, [load]);

  return { ...state, refreshing, refresh };
}

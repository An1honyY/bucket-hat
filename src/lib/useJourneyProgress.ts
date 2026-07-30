import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Location from "expo-location";
import {
  getPositionWithinTimeout,
  watchPosition,
  type PositionFix,
  type PositionWatcher,
} from "./approximateLocation";
import {
  computeProgress,
  hasArrived,
  indexRoute,
  type IndexedRoute,
  type JourneyProgress,
  type ProgressCarry,
} from "./journeyProgress";
import type { Journey } from "../types";

// Journey Mode's stateful half (Phase 22) — owns the position subscription,
// the permission prompt, and the small amount of state that has to survive
// between fixes. All the maths lives in journeyProgress.ts, which is pure
// and unit-tested; this file is deliberately thin so the parts worth testing
// aren't trapped behind a hook.
//
// Foreground-only by design (see DECISIONS.md): the subscription is tied to
// this screen being focused and the app being active, and stops on blur,
// unmount and arrival. See useKeepAwakeWhile below for why that isn't the
// limitation it sounds like.

export type JourneyProgressStatus =
  | "idle" // journey mode not active
  | "requesting" // asking for permission / waiting for a first fix
  | "denied" // permission refused, or location services unavailable
  | "tracking";

export interface UseJourneyProgress {
  status: JourneyProgressStatus;
  fix: PositionFix | null;
  progress: JourneyProgress | null;
  arrived: boolean;
  /** True when this journey has no geometry to track against at all. */
  untrackable: boolean;
  /** The distance-indexed route, so callers can splitPath() without re-decoding. */
  route: IndexedRoute | null;
}

export function useJourneyProgress(journey: Journey | null | undefined, active: boolean): UseJourneyProgress {
  const [status, setStatus] = useState<JourneyProgressStatus>("idle");
  const [fix, setFix] = useState<PositionFix | null>(null);
  // Progress is stored with the route it was derived from, so a re-planned
  // journey can't briefly display the old route's numbers — checked on read
  // rather than cleared in an effect, which would cascade a second render.
  const [tracked, setTracked] = useState<{ route: IndexedRoute; progress: JourneyProgress } | null>(null);
  const [arrivedRoute, setArrivedRoute] = useState<IndexedRoute | null>(null);

  const legs = journey?.legs;
  const destination = journey?.destination;

  // Decoding every leg's polyline is the one genuinely expensive thing here
  // (a real route runs to thousands of points), so it happens once per
  // journey rather than once per fix.
  const route = useMemo(() => (legs ? indexRoute(legs) : null), [legs]);

  // Between-fix state. Refs because none of it should trigger a render on
  // its own, and computeProgress needs the latest value synchronously inside
  // the subscription callback rather than one closed over at subscribe time.
  const carryRef = useRef<ProgressCarry | undefined>(undefined);
  const arrivalSinceRef = useRef<number | undefined>(undefined);
  // Held so arrival can tear the subscription down from inside applyFix —
  // there's nothing left to follow once you're there, and leaving a
  // high-accuracy watcher running at the destination is pure battery cost.
  const watcherRef = useRef<PositionWatcher | null>(null);

  // Writing refs in an effect is fine; this deliberately sets no state, so
  // it can't cascade renders.
  useEffect(() => {
    carryRef.current = undefined;
    arrivalSinceRef.current = undefined;
  }, [route]);

  const applyFix = useCallback(
    (next: PositionFix) => {
      setFix(next);
      if (!route || !legs) return;

      const nowMs = next.timestampMs || Date.now();
      const result = computeProgress({ lat: next.lat, lng: next.lng }, route, legs, nowMs, carryRef.current);
      if (result) {
        carryRef.current = result.carry;
        setTracked({ route, progress: result.progress });
      }

      if (destination) {
        const arrival = hasArrived(
          { lat: next.lat, lng: next.lng },
          { lat: destination.lat, lng: destination.lng },
          nowMs,
          arrivalSinceRef.current
        );
        arrivalSinceRef.current = arrival.withinRadiusSinceMs;
        if (arrival.arrived) {
          setArrivedRoute(route);
          watcherRef.current?.remove();
          watcherRef.current = null;
        }
      }
    },
    [route, legs, destination]
  );

  // Keeping the screen on while following is what makes foreground-only
  // tracking a real feature rather than a compromise — a journey you're
  // watching shouldn't be interrupted by the display timing out mid-leg.
  const arrived = arrivedRoute === route && route !== null;
  useKeepAwakeWhile(active && status === "tracking" && !arrived);

  useFocusEffect(
    useCallback(() => {
      if (!active) {
        setStatus("idle");
        return;
      }

      let cancelled = false;

      (async () => {
        setStatus("requesting");
        // Starting journey mode is an explicit user action, so unlike the
        // passive resolution chain in approximateLocation.ts this may
        // prompt — same precedent as the location picker's locate button.
        let granted = false;
        try {
          granted = (await Location.requestForegroundPermissionsAsync()).granted;
        } catch {
          granted = false;
        }
        if (cancelled) return;
        if (!granted) {
          setStatus("denied");
          return;
        }

        // Seed from the last known fix so the puck appears immediately
        // rather than after the first satellite update.
        const seed = await getPositionWithinTimeout();
        if (cancelled) return;
        if (seed) applyFix({ ...seed, timestampMs: Date.now() });

        const watcher = await watchPosition((next) => {
          if (!cancelled) applyFix(next);
        });
        if (cancelled) {
          watcher?.remove();
          return;
        }
        watcherRef.current = watcher;
        setStatus(watcher ? "tracking" : "denied");
      })();

      return () => {
        cancelled = true;
        watcherRef.current?.remove();
        watcherRef.current = null;
      };
    }, [active, applyFix])
  );

  // Returning to a backgrounded app must not show where you were when you
  // pocketed it. A one-shot lookup on resume catches progress up straight
  // away, ahead of whenever the next watched fix happens to land.
  useEffect(() => {
    if (!active) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      getPositionWithinTimeout().then((position) => {
        if (position) applyFix({ ...position, timestampMs: Date.now() });
      });
    });
    return () => subscription.remove();
  }, [active, applyFix]);

  return {
    status,
    fix: active ? fix : null,
    progress: active && tracked?.route === route ? tracked.progress : null,
    // Deliberately not gated on `active`: the caller turns following off
    // *because* of this flag, and a value that vanished the moment it did
    // would flip straight back.
    arrived,
    untrackable: active && route !== null && route.totalM === 0,
    route,
  };
}

const KEEP_AWAKE_TAG = "journey-mode";

// expo-keep-awake's `useKeepAwake` hook activates for as long as the owning
// component is mounted, with no way to turn it off — which would keep the
// screen on for anyone merely *viewing* a journey. The imperative pair is
// the conditional version, wrapped here so the effect ordering and the tag
// live in one place.
function useKeepAwakeWhile(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let held = true;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
      // Unsupported browser (the Wake Lock API isn't universal) or a
      // platform refusal — following still works, the screen just dims on
      // its own schedule.
      held = false;
    });
    return () => {
      if (!held) return;
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {
        // Nothing to release; the lock never took.
      });
    };
  }, [enabled]);
}

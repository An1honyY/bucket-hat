import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getEarliestJourneyDepartTime, listJourneysBetween } from "../db/repositories/journeys";
import { getWeeklyRecapState, setWeeklyRecapState } from "../db/repositories/settings";
import { buildRecapLine, hasEnoughHistory, previousWeekWindow, weekKey } from "./weeklyRecap";

// Phase 13's recap card, as Today sees it — docs/13-extended-features.md
// §13.1. Generated once a week and cached in its own row; every later focus
// that week reads the row and does no work at all.

export interface WeeklyRecap {
  /** The line to show, or null for "nothing to show" — a quiet week, a
   *  history too short to have a pattern, or one the user waved away. */
  line: string | null;
  dismiss: () => void;
}

export function useWeeklyRecap(): WeeklyRecap {
  const [line, setLine] = useState<string | null>(null);
  // Stable within a session, so a recap can't regenerate under the user
  // because they left the app open across midnight on a Sunday.
  const [nowMs] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const key = weekKey(nowMs);

      (async () => {
        const stored = await getWeeklyRecapState();
        if (stored?.weekKey === key) {
          if (!cancelled) setLine(stored.dismissed ? null : stored.line);
          return;
        }

        // §13.1 regenerates when the week turns over. The spec says "and
        // today is Monday"; that clause is dropped deliberately, because
        // anyone who doesn't open the app on a Monday would otherwise never
        // see a recap at all. The window is still the Mon–Sun that just
        // finished, so a Tuesday reader sees exactly what Monday would have
        // shown them.
        const earliest = await getEarliestJourneyDepartTime();
        let fresh: string | null = null;
        if (hasEnoughHistory(earliest, nowMs)) {
          const { startIso, endIso } = previousWeekWindow(nowMs);
          fresh = buildRecapLine(await listJourneysBetween(startIso, endIso));
        }
        // Stored even when it is null: "this week has nothing to say" is an
        // answer worth caching for the rest of the week.
        await setWeeklyRecapState({ weekKey: key, line: fresh, dismissed: false });
        if (!cancelled) setLine(fresh);
      })();

      return () => {
        cancelled = true;
      };
    }, [nowMs])
  );

  const dismiss = useCallback(() => {
    setLine(null);
    // §13.1 — dismissal is stored against the same row, so it lasts until the
    // next week's regeneration rather than until the next app open.
    getWeeklyRecapState().then((stored) => {
      if (stored) setWeeklyRecapState({ ...stored, dismissed: true });
    });
  }, []);

  return { line, dismiss };
}

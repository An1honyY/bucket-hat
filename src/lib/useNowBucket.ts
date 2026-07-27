import { useEffect, useState } from "react";

// "Now", rounded down to a fixed bucket and held in state so it is stable
// across renders.
//
// Reading `Date.now()` during render returns a different value every time the
// component happens to re-render, which react-hooks/purity flags for good
// reason: anything keyed on that value can never settle. The Plan screen hit
// exactly that — its hourly outlook keys forecast and route-ETA requests on
// the departure time, so a raw timestamp meant each response's state update
// re-rendered Plan, minted a new "now", and invalidated the request that had
// just landed, resetting the ETA debounce before it could ever fire.
//
// The lazy initialiser keeps Date.now() out of the render path.
//
// The tick is scheduled to land just *after* each boundary rather than polling
// on a fixed interval. That matters for callers who add a bucket to get a
// future instant: with a 30-second poll, the value stayed on the old bucket
// for up to 30 seconds past the rollover, so "current bucket + one bucket"
// pointed at a moment that had already passed. Google Routes rejects a past
// departureTime outright, and that is exactly the window it was rejected in.
const BOUNDARY_SLACK_MS = 250;

export function useNowBucket(bucketMs: number): number {
  const [bucket, setBucket] = useState(() => Math.floor(Date.now() / bucketMs) * bucketMs);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = Date.now();
      const nextBoundary = Math.floor(now / bucketMs) * bucketMs + bucketMs;
      timer = setTimeout(() => {
        setBucket((prev) => {
          const next = Math.floor(Date.now() / bucketMs) * bucketMs;
          return next === prev ? prev : next;
        });
        schedule();
      }, nextBoundary - now + BOUNDARY_SLACK_MS);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [bucketMs]);

  return bucket;
}

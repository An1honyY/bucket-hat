// Shared result shape for every src/services/ module — docs/05-data-wiring.md
// §5.4 / docs/12-dev-workflow-ci.md §12.1. One typed seam per external API,
// rather than each screen interpreting raw fetch errors differently — this
// is what makes the dev-menu failure toggles (§12.2) and unit-test mocking
// (§11.1) simple.
// "no-route" is not a failure of the service — it is the service answering.
// Google returns HTTP 200 with an empty body when it knows of no route for the
// request (verified against the live API: a bus trip in a town with no bus
// network answers `{}`). Folding that into "unreachable" is what made the Plan
// screen tell people to check a connection that was working perfectly, so it
// gets its own value and its own copy.
export type ServiceError = "network" | "unreachable" | "rate-limited" | "no-route";

export type ServiceResult<T> = { data: T } | { error: ServiceError };

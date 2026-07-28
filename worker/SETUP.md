# Sync backend setup

The Cloudflare Worker behind Phase 19 cloud sync
(`docs/13-extended-features.md` §13.7). Better Auth for accounts, D1 for
storage, two endpoints for sync.

The app works completely without this. If `EXPO_PUBLIC_SYNC_API_URL` is
unset, the Sync & account screen says so and everything else behaves
exactly as it did before — SQLite remains the source of truth either way.

---

## Why this rather than a BaaS

Supabase's free tier pauses a project after ~7 days of inactivity and
**requires a manual dashboard resume** — API requests don't wake it. For a
portfolio project that's the wrong failure mode: a visitor opens the app
and the backend is dead until you personally log in. The usual GitHub
Actions keep-alive doesn't rescue it either, because GitHub disables
scheduled workflows after 60 days without new commits.

Workers and D1 have no idle-pause, and the free tier (100k requests/day,
5 GB, 5M row reads/day) is orders of magnitude past what one person's
commute data generates. The full comparison, including why Firebase was
the runner-up, is in `DECISIONS.md` (2026-07-28).

---

## One-time setup

You need a free Cloudflare account. Everything below is run from `worker/`.

### 1. Install and sign in

```bash
npm install
```

```bash
npx wrangler login
```

### 2. Create the database

```bash
npx wrangler d1 create commute-weather-planner
```

Copy the `database_id` it prints into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_DATABASE_ID`.

### 3. Create the tables

Two schema files: `schema.sql` (the sync tables) and `auth-schema.sql`
(Better Auth's own tables). Apply both, locally and remotely.

```bash
npm run db:migrate:local && npm run db:auth:local
```

```bash
npm run db:migrate:remote && npm run db:auth:remote
```

### 4. Set the signing secret

Generate a long random string and store it as a Worker secret — not in
`wrangler.toml`, which is committed.

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

For local development, `.dev.vars` holds a throwaway value instead. That
file is gitignored and its value must never be used in production.

### 5. Deploy

```bash
npx wrangler deploy
```

Cloudflare prints the Worker's URL, something like
`https://commute-weather-planner-sync.<your-subdomain>.workers.dev`. Two
places need it:

- `wrangler.toml` → `BETTER_AUTH_URL`, and add the app's web origin to
  `TRUSTED_ORIGINS`. Then deploy again so the change takes effect.
- The app's `.env` → `EXPO_PUBLIC_SYNC_API_URL=<that URL>`

> `.env` in this repo uses CRLF line endings; keep them consistent when
> adding the variable.

> **Restart Expo with `--clear` after editing `.env`.** `EXPO_PUBLIC_*`
> values are inlined at transform time and Metro caches them, so a plain
> restart keeps using the old URL — the app will go on calling
> `localhost:8787` while the deployed Worker answers `curl` fine. Use the
> `expo-web-clear` config in `.claude/launch.json`. See
> `docs/12-dev-workflow-ci.md` §12.5.

### 6. Sign in

Restart the Expo dev server so the new env var is picked up, then open
**Settings → Sync & account** and create an account. The first sync
uploads whatever is already on that device; signing in on a second device
merges rather than overwrites, with per-row last-write-wins settling any
overlap.

---

## Local development

```bash
npx wrangler dev --port 8787 --local
```

Point the app at it with `EXPO_PUBLIC_SYNC_API_URL=http://localhost:8787`.
`--local` uses a simulated D1 in `.wrangler/`, so you can wipe it freely
by deleting that directory and re-running the schema commands.

---

## What's stored remotely

Rows are stored generically — `(user_id, table_name, row_id)` plus the
row's columns as an opaque JSON blob. The Worker never parses them. This
means an additive migration in `migrations/` needs **no change here at
all**, which removes the whole class of bug where a forgotten remote
migration silently stops a column syncing.

The trade-off: you can't run `SELECT name FROM clothing_items` against D1.
The remote database is a sync relay, not a queryable copy. See the comment
at the top of `schema.sql`.

**Gear photos** sync separately, as objects in R2 rather than as row
columns — a photo is ~100 KB of JPEG written once, so putting it through
the row path would mean base64-inflating it into every update of that item.
Keys are `${userId}/${itemId}.jpg`, the user prefix is applied server-side
from the verified session, and deleting a gear item deletes its photo. The
`photo_uri` column itself is never synced in either direction: it's a
device-local path that means nothing on another device.

**Capture and local storage are native-only.** `expo-file-system` reports
`documentDirectory` as `null` on web, so the web build has nowhere to keep
a photo file, and has never been able to take one (see `PhotoPicker.tsx`).
Photo *sync* therefore reports a skip on web rather than an error.

**Web still displays them**, straight from `/photos/:itemId`
(`src/lib/sync/remotePhotoCache.ts`). It can't point an `<img>` at the
endpoint directly — image elements can't send an `Authorization` header —
so it fetches with the header and hands the browser a `blob:` URL. A
signed URL carrying a token in the query string was rejected: that puts a
credential into browser history, referrer headers, and intermediary logs.
A per-account manifest is fetched once and cached so a thirty-row gear
list costs one request rather than thirty 404s, and the blobs are revoked
on sign-out.

**Not synced at all:** device-local preferences (theme, 12h/24h,
crash-reporting opt-in). See `DECISIONS.md` (2026-07-28).

---

## Regenerating the auth schema

`auth-schema.sql` is generated. If you change plugins or auth options in
`src/auth.ts`, update `auth-cli.config.ts` to match and re-run:

```bash
npx @better-auth/cli generate --config auth-cli.config.ts --output auth-schema.sql -y
```

Note the CLI's latest published version trails the `better-auth` runtime
this Worker uses. The four core tables have been stable across 1.x, but if
sign-in ever fails with an error naming a missing column, regenerate with a
matching CLI version before debugging anything else.

---

## Verified behaviour

Checked end-to-end against a local D1 instance:

| Case | Expected | Result |
|---|---|---|
| Unauthenticated `/sync/pull` | 401 | ✅ |
| Invalid bearer token | 401 | ✅ |
| Second account pulling | sees nothing of the first's | ✅ |
| Stale row push vs newer stored row | stored row wins | ✅ |
| Newer row push | incoming row wins | ✅ |
| Stale delete vs newer row | row survives | ✅ |
| Newer delete | row removed, tombstone recorded | ✅ |
| Re-create after delete | row restored, tombstone cleared | ✅ |
| All four `/photos` routes unauthenticated | 401 | ✅ |
| Photo upload → manifest → download | byte-identical JPEG | ✅ |
| Item id containing `/` | 400, never reaches R2 | ✅ |
| Missing photo | 404 | ✅ |
| Gear tombstone | photo deleted from R2 too | ✅ |
| Account B reading A's photo by exact id | 404 | ✅ |

The client half is covered by `src/lib/sync/syncEngine.test.ts`, which
runs the same scenarios against two real SQLite databases.

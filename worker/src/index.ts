// Cloudflare Worker entry point — Phase 19 cloud sync
// (docs/13-extended-features.md §13.7).
//
// The entire server surface is: Better Auth's own routes, plus two sync
// endpoints. That's small on purpose — all of the sync intelligence
// (change detection, conflict resolution, watermarks) lives client-side in
// src/lib/sync/, so this Worker never has to be redeployed when that logic
// changes, and can't drift out of step with it.
import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { pullChanges, pushChanges, type ChangeSet } from "./sync";
import { deletePhoto, deletePhotosForTombstones, getPhoto, isValidItemId, listPhotos, putPhoto } from "./photos";
import { isEmailConfigured } from "./email";
import type { Env } from "./env";

type AppEnv = { Bindings: Env; Variables: { userId: string } };

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const configured = c.env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  return cors({
    // No wildcard: the bearer token is the credential, and echoing back
    // any origin would let a hostile page drive the API with a token it
    // had managed to read. Origins are declared in wrangler.toml.
    origin: (origin) => (configured.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    // PUT/DELETE are the photo endpoints (§3.3).
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })(c, next);
});

// Better Auth owns everything under /api/auth (sign-up, sign-in, session,
// sign-out). Constructed per request — see the note in auth.ts.
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// Every /sync route requires a valid session. Resolved from the bearer
// token rather than a cookie so web and native behave identically.
const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", session.user.id);
  await next();
};

app.use("/sync/*", requireSession);
app.use("/photos", requireSession);
app.use("/photos/*", requireSession);

app.post("/sync/push", async (c) => {
  let body: ChangeSet;
  try {
    body = await c.req.json<ChangeSet>();
  } catch {
    return c.json({ error: "invalid-json" }, 400);
  }
  if (!Array.isArray(body?.rows) || !Array.isArray(body?.tombstones)) {
    return c.json({ error: "invalid-body" }, 400);
  }

  // userId comes from the verified session, never from the request body —
  // it's the only thing separating one account's data from another's.
  const userId = c.get("userId");
  const serverTime = await pushChanges(c.env.DB, userId, body);
  // Deleting gear must take its photo with it, and this is the only point
  // that sees the delete regardless of which device issued it.
  await deletePhotosForTombstones(c.env.PHOTOS, userId, body.tombstones);
  return c.json({ serverTime });
});

app.get("/sync/pull", async (c) => {
  const since = c.req.query("since");
  const result = await pullChanges(c.env.DB, c.get("userId"), since || undefined);
  return c.json(result);
});

// ---- gear photos (docs/03-data-models.md §3.3) ----
//
// Same session gate as /sync/*, applied by the middleware above via the
// /photos/* prefix.

// What this account has stored, for the client to diff against its own
// local files.
app.get("/photos", async (c) => {
  const photos = await listPhotos(c.env.PHOTOS, c.get("userId"));
  return c.json({ photos });
});

app.put("/photos/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  if (!isValidItemId(itemId)) return c.json({ error: "invalid-item-id" }, 400);

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: "empty-body" }, 400);

  const result = await putPhoto(c.env.PHOTOS, c.get("userId"), itemId, body);
  if ("error" in result) return c.json({ error: result.error }, 413);
  return c.json(result);
});

app.get("/photos/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  if (!isValidItemId(itemId)) return c.json({ error: "invalid-item-id" }, 400);

  const object = await getPhoto(c.env.PHOTOS, c.get("userId"), itemId);
  if (!object) return c.json({ error: "not-found" }, 404);

  return new Response(object.body as unknown as BodyInit, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Content-Length": String(object.size),
      ETag: object.httpEtag,
    },
  });
});

app.delete("/photos/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  if (!isValidItemId(itemId)) return c.json({ error: "invalid-item-id" }, 400);
  await deletePhoto(c.env.PHOTOS, c.get("userId"), itemId);
  return c.json({ ok: true });
});

// What this deployment can do, so the app offers only what will actually
// work. Public on purpose (it's read before anyone is signed in) and
// deliberately narrow: capability flags, never configuration values.
app.get("/api/config", (c) => c.json({ passwordReset: isEmailConfigured(c.env) }));

// Cheap liveness check — also handy as the target for an uptime monitor.
app.get("/health", (c) => c.json({ ok: true }));

export default app;

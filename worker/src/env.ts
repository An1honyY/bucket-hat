import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  /** D1 binding, declared in wrangler.toml. */
  DB: D1Database;
  /**
   * R2 bucket for gear photos. Provisioned and bound, but nothing reads or
   * writes it yet — photo sync isn't built (see the comment in
   * wrangler.toml). Declared here so the binding is typed from the start
   * rather than being retrofitted alongside the feature.
   */
  PHOTOS: R2Bucket;
  /** Signing secret for Better Auth sessions. Set via `wrangler secret put`. */
  BETTER_AUTH_SECRET: string;
  /** Public URL this Worker is served from, e.g. https://cwp-sync.<you>.workers.dev */
  BETTER_AUTH_URL: string;
  /** Comma-separated origins allowed to call the API (the Expo web dev server, etc). */
  TRUSTED_ORIGINS?: string;
}

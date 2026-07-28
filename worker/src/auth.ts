// Better Auth over D1 — docs/13-extended-features.md §13.7's "managed auth
// ... avoids building session management ... from scratch".
//
// Two deviations from §13.7's auth sentence, both deliberate:
//
// 1. Email + password rather than magic link. §13.7 preferred magic link
//    "avoids a password-reset flow to build/maintain", but a magic link
//    needs an outbound email provider (Resend/Postmark/SES) — a second
//    vendor, a second API key, and a domain to verify. Email+password
//    needs none of that and keeps the whole backend to one Cloudflare
//    account. The password-reset flow §13.7 wanted to dodge is simply not
//    built: `sendResetPassword` is unset, so reset is unavailable, which
//    for a single-user app means re-registering. Swapping to magic link
//    later is a plugin change here plus a screen change on the client —
//    the sync layer is unaffected either way. See DECISIONS.md.
//
// 2. The `bearer` plugin, so the client authenticates with an explicit
//    token rather than a cookie. React Native has no cookie jar, and the
//    app must behave identically on web and native (the whole reason this
//    stack was chosen over a native SDK), so a token the client stores
//    itself is the only mechanism that works the same in both places.
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
// Imported from the standalone package rather than a `better-auth/adapters/kysely`
// subpath: better-auth 1.6 exports subpaths for prisma/drizzle/mongodb/memory
// only, and re-exports the Kysely adapter from this package instead.
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { Env } from "./env";

// Better Auth must be constructed per-request, not once at module scope:
// the D1 binding lives on the request's `env`, and a Worker isolate can
// be reused across requests belonging to different environments. Holding
// a binding from an earlier request is the documented way to get
// "Cannot perform I/O on behalf of a different request" in production.
export function createAuth(env: Env) {
  const db = new Kysely<Record<string, never>>({
    dialect: new D1Dialect({ database: env.DB }),
  });

  return betterAuth({
    // D1 has no interactive transactions, so the adapter must run
    // operations sequentially rather than wrapping them.
    database: kyselyAdapter(db, { type: "sqlite", transaction: false }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      // No reset flow — see the note above. Left explicit rather than
      // omitted so it reads as a decision, not an oversight.
      requireEmailVerification: false,
    },
    // The app is single-user by design (docs/02-external-apis.md §2.2);
    // an account exists to identify a person's own devices to each other,
    // not to enable sharing. Open registration is still needed for the
    // first sign-up, but this is the knob to close if that changes.
    plugins: [bearer()],
    trustedOrigins: env.TRUSTED_ORIGINS ? env.TRUSTED_ORIGINS.split(",").map((o) => o.trim()) : [],
  });
}

export type Auth = ReturnType<typeof createAuth>;

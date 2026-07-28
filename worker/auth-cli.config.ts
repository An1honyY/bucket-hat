// CLI-only config, used solely by `npx @better-auth/cli generate` to emit
// auth-schema.sql. The real runtime config is src/auth.ts, which needs a
// per-request D1 binding the CLI has no way to supply. Keep the options
// below (plugins, emailAndPassword) in step with src/auth.ts or the
// generated schema will not match what the Worker actually expects.
//
// The dialect here is a throwaway in-memory SQLite purely so the CLI can
// introspect; D1 speaks the same SQLite dialect, so the emitted DDL is
// what D1 needs.
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { DatabaseSync } from "node:sqlite";
import { NodeSqliteDialect } from "@better-auth/kysely-adapter/node-sqlite-dialect";

export const auth = betterAuth({
  // Passed as a raw dialect, not a pre-wrapped kyselyAdapter: the CLI
  // needs to introspect the dialect itself to emit migrations.
  database: {
    dialect: new NodeSqliteDialect({ database: new DatabaseSync(":memory:") }),
    type: "sqlite",
  },
  emailAndPassword: { enabled: true },
  plugins: [bearer()],
});

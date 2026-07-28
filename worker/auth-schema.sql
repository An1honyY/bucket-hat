-- GENERATED FILE — do not hand-edit.
--
-- Better Auth's own tables (user/session/account/verification), emitted by:
--   npx @better-auth/cli generate --config auth-cli.config.ts --output auth-schema.sql
--
-- Regenerate after changing the plugins or auth options in src/auth.ts,
-- and keep auth-cli.config.ts in step with it.
--
-- CAVEAT: @better-auth/cli's latest published version (1.4.21) trails the
-- better-auth runtime this Worker uses (1.6.x). The four core tables below
-- have been stable across 1.x, but if sign-in ever fails with an error
-- naming a missing column, regenerate with a CLI matching the runtime
-- version before debugging anything else.

create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null);

create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");
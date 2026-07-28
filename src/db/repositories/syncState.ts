// docs/13-extended-features.md §13.7 — cloud sync's own bookkeeping, kept
// in app_settings alongside the other device-local preferences. It lives
// here rather than in a synced table on purpose: high-water marks describe
// *this device's* progress against the server, so syncing them across
// devices would be actively wrong.
import { getDb } from "../index";

const LAST_PUSHED_AT = "sync_last_pushed_at";
const LAST_PULLED_AT = "sync_last_pulled_at";
const ACCOUNT_ID = "sync_account_id";
const SESSION_TOKEN = "sync_session_token";
const ACCOUNT_EMAIL = "sync_account_email";
const LAST_SYNCED_AT = "sync_last_synced_at";

async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>("SELECT value FROM app_settings WHERE key = ?", key);
  return row?.value ?? undefined;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export interface SyncMarks {
  lastPushedAt?: string;
  lastPulledAt?: string;
}

export async function getSyncMarks(): Promise<SyncMarks> {
  return {
    lastPushedAt: await getSetting(LAST_PUSHED_AT),
    lastPulledAt: await getSetting(LAST_PULLED_AT),
  };
}

export async function setSyncMarks(marks: SyncMarks): Promise<void> {
  if (marks.lastPushedAt !== undefined) await setSetting(LAST_PUSHED_AT, marks.lastPushedAt);
  if (marks.lastPulledAt !== undefined) await setSetting(LAST_PULLED_AT, marks.lastPulledAt);
}

export async function getSyncAccountId(): Promise<string | undefined> {
  return getSetting(ACCOUNT_ID);
}

// Signing in as a different account must not inherit the previous
// account's progress marks — the new account's remote state is unrelated,
// and reusing a mark would silently skip every row written before it.
// Returns true when the account actually changed, which the caller uses to
// decide whether a full resync is needed.
export async function setSyncAccountId(accountId: string): Promise<boolean> {
  const previous = await getSyncAccountId();
  if (previous === accountId) return false;
  await setSetting(ACCOUNT_ID, accountId);
  await clearSyncMarks();
  return true;
}

export async function clearSyncMarks(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM app_settings WHERE key IN (?, ?)`, LAST_PUSHED_AT, LAST_PULLED_AT);
}

// ---------- session ----------

// The session token lives in app_settings, i.e. in the same unencrypted
// SQLite file as everything else. That's consistent with the existing
// posture (see DECISIONS.md 2026-07-21, "SQLite left unencrypted at rest,
// disclosed in the privacy policy instead of SQLCipher") rather than a new
// decision, and it's the only store that behaves identically on web and
// native — expo-secure-store has no web implementation, which would put
// sign-in back into the platform-specific territory this whole stack was
// chosen to avoid. Tokens expire server-side regardless.
export interface StoredSession {
  token: string;
  accountId: string;
  email: string;
}

export async function getStoredSession(): Promise<StoredSession | undefined> {
  const token = await getSetting(SESSION_TOKEN);
  const accountId = await getSyncAccountId();
  const email = await getSetting(ACCOUNT_EMAIL);
  if (!token || !accountId || !email) return undefined;
  return { token, accountId, email };
}

/** Returns true when this is a different account than was stored before. */
export async function storeSession(session: StoredSession): Promise<boolean> {
  await setSetting(SESSION_TOKEN, session.token);
  await setSetting(ACCOUNT_EMAIL, session.email);
  return setSyncAccountId(session.accountId);
}

export async function getLastSyncedAt(): Promise<string | undefined> {
  return getSetting(LAST_SYNCED_AT);
}

export async function setLastSyncedAt(iso: string): Promise<void> {
  await setSetting(LAST_SYNCED_AT, iso);
}

// Sign-out. Local data is deliberately left completely intact — §13.7's
// "local-first stays true": the app is fully functional signed out, and a
// sign-out is not a request to delete anything. Only the credentials and
// this device's progress marks are dropped.
export async function clearSyncState(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM app_settings WHERE key IN (?, ?, ?, ?, ?, ?)`,
    LAST_PUSHED_AT,
    LAST_PULLED_AT,
    ACCOUNT_ID,
    SESSION_TOKEN,
    ACCOUNT_EMAIL,
    LAST_SYNCED_AT
  );
}

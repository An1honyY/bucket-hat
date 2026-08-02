// One set of words per auth failure, shared by every screen that can
// surface one (the auth screens and Settings → Sync & account). Split out
// of AccountScreen when the auth flow grew past a single form: two screens
// describing the same failure differently is exactly the copy drift
// docs/09-design-system.md §9.0.1 exists to prevent.
import type { AuthError } from "../../services/authService";

export const AUTH_ERROR_COPY: Record<AuthError, string> = {
  network: "Couldn't reach the sync service. Your data is safe on this device — try again when you're back online.",
  unreachable: "The sync service didn't respond as expected. Try again in a moment.",
  "invalid-credentials": "That email and password don't match an account.",
  "email-taken": "There's already an account with that email. Try signing in instead.",
  "weak-password": "Pick a longer password — at least 8 characters.",
  "not-configured": "Sync isn't set up in this build. See worker/SETUP.md.",
  "invalid-token": "That reset code has expired or has already been used. Request a new one.",
  "reset-unavailable": "This server can't send reset emails yet. See worker/SETUP.md.",
};

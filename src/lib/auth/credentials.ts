// Client-side credential checks for the auth screens
// (src/screens/auth/) — pure string work, kept out of the components so the
// sign-in, create-account and reset-password forms all reject the same
// things in the same words.
//
// These exist to catch the obvious cases before a network round-trip, not
// to enforce anything: the server is the authority on whether a password
// is acceptable, and its answer (authService's `weak-password`) still wins
// if the two ever disagree.

/** Better Auth's own default minimum, mirrored so the hint matches. */
export const MIN_PASSWORD_LENGTH = 8;

// Deliberately loose. Anything stricter starts rejecting real addresses
// (plus-tags, new TLDs, unicode locals) and the only way to truly know an
// address works is to send to it, which the reset flow already does.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_SHAPE.test(value.trim());
}

/** The message to show under the email field, or undefined when it's fine. */
export function emailProblem(value: string): string | undefined {
  if (value.trim().length === 0) return "Enter your email address.";
  if (!isValidEmail(value)) return "That doesn't look like an email address.";
  return undefined;
}

/** The message to show under a new-password field, or undefined when it's fine. */
export function passwordProblem(password: string): string | undefined {
  if (password.length === 0) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  return undefined;
}

/** The message to show under a confirm-password field, or undefined when it matches. */
export function confirmationProblem(password: string, confirmation: string): string | undefined {
  if (confirmation.length === 0) return "Type the password again.";
  if (password !== confirmation) return "Those passwords don't match.";
  return undefined;
}

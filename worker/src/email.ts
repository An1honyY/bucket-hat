// Outbound email, for exactly one message: the password-reset link.
//
// Resend over its plain HTTP API rather than an SDK — one fetch, no
// dependency, and nothing platform-specific, which matters on Workers.
// Everything here is optional: with no key configured the Worker still
// runs, and `isEmailConfigured()` is what makes the reset route report
// itself unavailable instead of accepting requests it can't act on.
import type { Env } from "./env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isEmailConfigured(env: Env): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESET_EMAIL_FROM);
}

interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(env: Env, message: Message): Promise<void> {
  if (!isEmailConfigured(env)) throw new Error("email-not-configured");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESET_EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    // Surfaced as a 500 from the auth route, which the client reads as
    // "try again in a moment". Deliberately not swallowed: a reset request
    // that silently sends nothing leaves someone waiting on an email that
    // will never arrive, which is the worse failure by a distance.
    throw new Error(`resend-failed-${response.status}`);
  }
}

/**
 * The reset message itself.
 *
 * Carries the raw token as well as the link because the app is on phones
 * too, where the email may well be read on a different device — the reset
 * screen accepts a pasted code for exactly that case
 * (src/lib/auth/resetLink.ts). Voice per docs/09-design-system.md §9.0.1:
 * short, plain, no exclamation marks.
 */
export function resetPasswordMessage(to: string, url: string, token: string): Message {
  const text = [
    "Someone asked to reset the password for your Bucket Hat account.",
    "",
    `Open this link to set a new one: ${url}`,
    "",
    `Or enter this code in the app: ${token}`,
    "",
    "The link and code both stop working in an hour. If this wasn't you, ignore this email — nothing has changed.",
  ].join("\n");

  const html = [
    `<p>Someone asked to reset the password for your Bucket Hat account.</p>`,
    `<p><a href="${url}">Set a new password</a></p>`,
    `<p>Or enter this code in the app:<br><code>${token}</code></p>`,
    `<p>The link and code both stop working in an hour. If this wasn't you, ignore this email — nothing has changed.</p>`,
  ].join("");

  return { to, subject: "Reset your Bucket Hat password", text, html };
}

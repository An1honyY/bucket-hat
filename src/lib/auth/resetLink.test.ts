import { readResetLink, RESET_PATH, resetRedirectUrl } from "./resetLink";

// The parsing half of the reset flow. Worth testing rather than eyeballing:
// every case here is a URL the server can genuinely produce, and getting
// the `error=` one wrong means showing someone a password form that was
// never going to work.

describe("readResetLink", () => {
  it("reads the token out of the redirect Better Auth sends", () => {
    expect(readResetLink(`https://bucket-hat.example.workers.dev${RESET_PATH}?token=abc123`)).toEqual({
      token: "abc123",
    });
  });

  it("reports an expired or spent link as expired, not as a missing token", () => {
    expect(readResetLink(`https://example.com${RESET_PATH}?error=INVALID_TOKEN`)).toEqual({ expired: true });
  });

  it("prefers the error even when a token rides along with it", () => {
    expect(readResetLink(`https://example.com${RESET_PATH}?token=abc&error=INVALID_TOKEN`)).toEqual({ expired: true });
  });

  it("ignores any other path — this is the app's only deep link", () => {
    expect(readResetLink("https://example.com/Main/Gear?token=abc")).toEqual({});
  });

  it("ignores the reset path with nothing on it", () => {
    expect(readResetLink(`https://example.com${RESET_PATH}`)).toEqual({});
  });

  it("survives a value that isn't a URL at all", () => {
    expect(readResetLink("not a url")).toEqual({});
  });
});

describe("resetRedirectUrl", () => {
  it("stays relative on web, where the API and the web build share an origin", () => {
    expect(resetRedirectUrl("")).toBe(RESET_PATH);
  });

  it("is absolute on native, where there's no origin to be relative to", () => {
    expect(resetRedirectUrl("https://bucket-hat.example.workers.dev")).toBe(
      `https://bucket-hat.example.workers.dev${RESET_PATH}`
    );
  });

  it("has nowhere to send anyone when sync isn't configured", () => {
    expect(resetRedirectUrl(undefined)).toBeUndefined();
  });
});

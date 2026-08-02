import { getServerCapabilities, requestPasswordReset, resetPassword } from "./authService";

// The password-reset half of authService (2026-08-02). Sign-in/sign-up
// aren't covered here — they're a straight pass-through to Better Auth —
// but reset carries real mapping logic: three different failures have to
// end up as three different messages, and the one that matters most (an
// expired link) is the one a naive mapping folds into "wrong password".

const BASE = "https://sync.test";

describe("authService password reset", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_SYNC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SYNC_API_URL = BASE;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv === undefined) delete process.env.EXPO_PUBLIC_SYNC_API_URL;
    else process.env.EXPO_PUBLIC_SYNC_API_URL = originalEnv;
  });

  it("asks the server to mail a link, passing where it should land", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await requestPasswordReset("you@example.com", "/reset-password");

    expect(result).toEqual({ data: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/auth/request-password-reset`);
    expect(JSON.parse(init.body)).toEqual({ email: "you@example.com", redirectTo: "/reset-password" });
  });

  it("reports a server with no email provider as reset-unavailable, not a generic outage", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: "RESET_PASSWORD_NOT_ENABLED" }),
    }) as unknown as typeof fetch;

    expect(await requestPasswordReset("you@example.com")).toEqual({ error: "reset-unavailable" });
  });

  it("keeps a genuine network failure distinguishable from an unsupported server", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;

    expect(await requestPasswordReset("you@example.com")).toEqual({ error: "network" });
  });

  it("sends the token and the new password to the reset endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await resetPassword("tok_123", "a-long-enough-password");

    expect(result).toEqual({ data: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/auth/reset-password`);
    expect(JSON.parse(init.body)).toEqual({ token: "tok_123", newPassword: "a-long-enough-password" });
  });

  it("calls an expired token what it is rather than 'wrong email or password'", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: "INVALID_TOKEN" }),
    }) as unknown as typeof fetch;

    expect(await resetPassword("stale", "a-long-enough-password")).toEqual({ error: "invalid-token" });
  });
});

describe("authService.getServerCapabilities", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_SYNC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SYNC_API_URL = BASE;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv === undefined) delete process.env.EXPO_PUBLIC_SYNC_API_URL;
    else process.env.EXPO_PUBLIC_SYNC_API_URL = originalEnv;
  });

  it("reads the flag off /api/config", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ passwordReset: true }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await getServerCapabilities()).toEqual({ data: { passwordReset: true } });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/config`);
  });

  it("treats an older server that doesn't know the endpoint as having no reset", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;

    expect(await getServerCapabilities()).toEqual({ data: { passwordReset: false } });
  });

  it("surfaces an unreachable server rather than guessing", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    expect(await getServerCapabilities()).toEqual({ error: "unreachable" });
  });
});

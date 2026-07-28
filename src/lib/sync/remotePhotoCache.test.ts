// docs/03-data-models.md §3.3 — web gear photo rendering.
//
// The behaviour worth pinning here is the request economy and the
// sign-out cleanup, not the fetch itself: a gear list renders one
// thumbnail per row, all mounting at once, so anything that fetches
// per-render or per-row turns a thirty-item list into thirty requests.
const mockListPhotos = jest.fn();
const mockFetchObjectUrl = jest.fn();
const mockGetStoredSession = jest.fn();
const mockRevoke = jest.fn();

jest.mock("react-native", () => ({ Platform: { OS: "web" } }));

jest.mock("../../services/syncBackendService", () => ({
  createPhotoBackend: () => ({ listPhotos: mockListPhotos }),
  fetchPhotoObjectUrl: (...args: unknown[]) => mockFetchObjectUrl(...args),
}));

jest.mock("../../db/repositories/syncState", () => ({
  getStoredSession: () => mockGetStoredSession(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cache = require("./remotePhotoCache") as typeof import("./remotePhotoCache");

beforeEach(() => {
  jest.clearAllMocks();
  cache.clearRemotePhotoCache();
  global.URL.revokeObjectURL = mockRevoke;
  mockGetStoredSession.mockResolvedValue({ token: "t", accountId: "a", email: "e@x.com" });
  mockListPhotos.mockResolvedValue({
    data: [{ itemId: "jacket", uploadedAt: "2026-07-28T00:00:00.000Z", size: 100 }],
  });
  mockFetchObjectUrl.mockResolvedValue("blob:fake-url");
});

describe("remote photo cache", () => {
  it("returns a displayable url for an item the account has a photo for", async () => {
    expect(await cache.getRemotePhotoUri("jacket")).toBe("blob:fake-url");
    expect(mockFetchObjectUrl).toHaveBeenCalledWith("t", "jacket");
  });

  it("returns undefined without a request when the item has no remote photo", async () => {
    // The manifest exists precisely so a list of items without photos
    // doesn't fire a 404 per row.
    expect(await cache.getRemotePhotoUri("no-photo-here")).toBeUndefined();
    expect(mockFetchObjectUrl).not.toHaveBeenCalled();
  });

  it("fetches the manifest once across many items", async () => {
    await Promise.all([
      cache.getRemotePhotoUri("jacket"),
      cache.getRemotePhotoUri("other"),
      cache.getRemotePhotoUri("another"),
    ]);
    expect(mockListPhotos).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent requests for the same item into one fetch", async () => {
    // Every row of a list mounts at once; without this the same image
    // would be fetched as many times as it appears on screen.
    await Promise.all([
      cache.getRemotePhotoUri("jacket"),
      cache.getRemotePhotoUri("jacket"),
      cache.getRemotePhotoUri("jacket"),
    ]);
    expect(mockFetchObjectUrl).toHaveBeenCalledTimes(1);
  });

  it("serves a repeat request from cache without refetching", async () => {
    await cache.getRemotePhotoUri("jacket");
    await cache.getRemotePhotoUri("jacket");
    expect(mockFetchObjectUrl).toHaveBeenCalledTimes(1);
  });

  it("revokes blob urls on sign-out so they stop resolving", async () => {
    await cache.getRemotePhotoUri("jacket");
    cache.clearRemotePhotoCache();

    expect(mockRevoke).toHaveBeenCalledWith("blob:fake-url");
    // And the next read genuinely refetches rather than serving the
    // previous account's image.
    mockFetchObjectUrl.mockClear();
    await cache.getRemotePhotoUri("jacket");
    expect(mockFetchObjectUrl).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when signed out rather than throwing", async () => {
    cache.clearRemotePhotoCache();
    mockGetStoredSession.mockResolvedValue(undefined);
    expect(await cache.getRemotePhotoUri("jacket")).toBeUndefined();
  });
});

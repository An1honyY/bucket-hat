// docs/03-data-models.md §3.3 — gear photo reconciliation.
//
// expo-file-system and the DB layer are both mocked here rather than run
// for real: the logic under test is the *decisions* (what to upload, what
// to download, what to leave alone), and those are entirely determined by
// which files exist, their mtimes, and what the server reports. Actual
// file IO is expo's problem, not this module's.
import type { PhotoBackend, RemotePhoto, SyncResult } from "./types";

const mockFiles = new Map<string, { mtime: number; contents: string }>();
const mockRows = new Map<string, { table: string; photoUri: string | null }>();
const mockPhotoRecords = new Map<string, { uploaded_file_mtime: number | null }>();

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

// Mirrors the modern File/Directory API: `exists`/`lastModified`/`write`/
// `create` are synchronous, `base64()` is async. `lastModified` is in
// milliseconds, unlike the legacy module's seconds — see migration 006.
jest.mock("expo-file-system", () => {
  class MockDirectory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      const base = typeof parts[0] === "string" ? parts[0] : parts[0].uri;
      const rest = parts.slice(1).map((p) => (typeof p === "string" ? p : p.uri));
      this.uri = [base.replace(/\/$/, ""), ...rest].join("/");
    }
    get exists() {
      return true; // the gear-photos directory is always present in these tests
    }
    create() {}
    list() {
      return [];
    }
  }
  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      const base = typeof parts[0] === "string" ? parts[0] : parts[0].uri;
      const rest = parts.slice(1).map((p) => (typeof p === "string" ? p : p.uri));
      this.uri = [base.replace(/\/$/, ""), ...rest].join("/");
    }
    private get key() {
      return this.uri.split("/").pop() as string;
    }
    get exists() {
      return mockFiles.has(this.key);
    }
    get lastModified() {
      return mockFiles.get(this.key)?.mtime ?? null;
    }
    create() {
      if (!mockFiles.has(this.key)) mockFiles.set(this.key, { mtime: 5000, contents: "" });
    }
    write(contents: string) {
      mockFiles.set(this.key, { mtime: 5000, contents });
    }
    async base64() {
      const file = mockFiles.get(this.key);
      if (!file) throw new Error("missing file");
      return file.contents;
    }
  }
  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: { uri: "file:///doc" }, cache: { uri: "file:///cache" } },
  };
});

jest.mock("../../db", () => ({
  getDb: async () => ({
    getAllAsync: async (sql: string) => {
      if (sql.includes("gear_photo_sync")) {
        return [...mockPhotoRecords.entries()].map(([item_id, r]) => ({ item_id, ...r }));
      }
      const table = sql.match(/FROM (\w+)/)?.[1];
      return [...mockRows.entries()]
        .filter(([, row]) => row.table === table && row.photoUri !== null)
        .map(([id]) => ({ id }));
    },
    getFirstAsync: async (sql: string, id: string) => {
      const table = sql.match(/FROM (\w+)/)?.[1];
      const row = mockRows.get(id);
      return row && row.table === table ? { id } : null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      if (sql.includes("gear_photo_sync")) {
        const itemId = params[0] as string;
        const mtime = params[params.length - 1] as number;
        mockPhotoRecords.set(itemId, { uploaded_file_mtime: mtime });
      }
      if (sql.includes("SET photo_uri")) {
        const [uri, id] = params as [string, string];
        const row = mockRows.get(id);
        if (row) row.photoUri = uri;
      }
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { syncPhotos } = require("./photoSync") as typeof import("./photoSync");

function makeBackend(remote: RemotePhoto[], store: Map<string, string> = new Map()): PhotoBackend & {
  puts: string[];
  gets: string[];
} {
  const puts: string[] = [];
  const gets: string[] = [];
  return {
    puts,
    gets,
    async listPhotos(): Promise<SyncResult<RemotePhoto[]>> {
      return { data: remote };
    },
    async putPhoto(itemId, base64) {
      puts.push(itemId);
      store.set(itemId, base64);
      return { data: { uploadedAt: new Date().toISOString() } };
    },
    async getPhoto(itemId) {
      gets.push(itemId);
      const found = store.get(itemId);
      return found ? { data: found } : { error: "unreachable" as const };
    },
  };
}

beforeEach(() => {
  mockFiles.clear();
  mockRows.clear();
  mockPhotoRecords.clear();
  jest.clearAllMocks();
});

describe("gear photo sync", () => {
  it("uploads a local photo the server doesn't have", async () => {
    mockRows.set("jacket", { table: "clothing_items", photoUri: "file:///doc/gear-photos/jacket.jpg?t=1" });
    mockFiles.set("jacket.jpg", { mtime: 1000, contents: "AAAA" });
    const backend = makeBackend([]);

    const summary = await syncPhotos(backend);

    expect(backend.puts).toEqual(["jacket"]);
    expect(summary.uploaded).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it("does not re-upload an unchanged photo", async () => {
    mockRows.set("jacket", { table: "clothing_items", photoUri: "file:///doc/gear-photos/jacket.jpg" });
    mockFiles.set("jacket.jpg", { mtime: 1000, contents: "AAAA" });
    const backend = makeBackend([{ itemId: "jacket", uploadedAt: "2026-07-28T00:00:00.000Z", size: 3 }]);
    mockPhotoRecords.set("jacket", { uploaded_file_mtime: 1000 });

    const summary = await syncPhotos(backend);

    expect(backend.puts).toEqual([]);
    expect(summary.uploaded).toBe(0);
  });

  it("re-uploads after a re-capture overwrites the file in place", async () => {
    // PhotoPicker writes to the same path on re-capture (§3.3), so the
    // filename is unchanged and only the mtime moves. If that weren't the
    // signal, replacing a photo would never propagate.
    mockRows.set("jacket", { table: "clothing_items", photoUri: "file:///doc/gear-photos/jacket.jpg" });
    mockFiles.set("jacket.jpg", { mtime: 9999, contents: "BBBB" });
    const backend = makeBackend([{ itemId: "jacket", uploadedAt: "2026-07-28T00:00:00.000Z", size: 3 }]);
    mockPhotoRecords.set("jacket", { uploaded_file_mtime: 1000 });

    const summary = await syncPhotos(backend);

    expect(backend.puts).toEqual(["jacket"]);
    expect(summary.uploaded).toBe(1);
  });

  it("downloads a photo this device is missing and points the row at it", async () => {
    mockRows.set("boots", { table: "shoe_items", photoUri: null });
    const store = new Map([["boots", "Q0NDQw=="]]);
    const backend = makeBackend([{ itemId: "boots", uploadedAt: "2026-07-28T00:00:00.000Z", size: 4 }], store);

    const summary = await syncPhotos(backend);

    expect(backend.gets).toEqual(["boots"]);
    expect(summary.downloaded).toBe(1);
    expect(mockFiles.has("boots.jpg")).toBe(true);
    // Without this the image is on disk but invisible — the UI reads
    // photoUri, not the filesystem.
    expect(mockRows.get("boots")!.photoUri).toContain("gear-photos/boots.jpg");
  });

  it("does not upload a downloaded photo straight back", async () => {
    // The record written on download has to make the file look already-
    // uploaded, or every device would ping-pong images forever.
    mockRows.set("boots", { table: "shoe_items", photoUri: null });
    const store = new Map([["boots", "Q0NDQw=="]]);
    const backend = makeBackend([{ itemId: "boots", uploadedAt: "2026-07-28T00:00:00.000Z", size: 4 }], store);

    await syncPhotos(backend);
    backend.puts.length = 0;
    const second = await syncPhotos(backend);

    expect(backend.puts).toEqual([]);
    expect(second.uploaded).toBe(0);
    expect(second.downloaded).toBe(0);
  });

  it("ignores an orphaned file whose row is gone", async () => {
    // Gear deleted while this device was offline leaves the file behind.
    // Uploading it would resurrect a photo for an item that no longer
    // exists — which is why the scan is driven off the database, not off
    // a directory listing.
    mockFiles.set("ghost.jpg", { mtime: 1000, contents: "AAAA" });
    const backend = makeBackend([]);

    const summary = await syncPhotos(backend);

    expect(backend.puts).toEqual([]);
    expect(summary.uploaded).toBe(0);
  });

  it("counts a failed transfer without throwing", async () => {
    mockRows.set("hat", { table: "clothing_items", photoUri: "file:///doc/gear-photos/hat.jpg" });
    mockFiles.set("hat.jpg", { mtime: 1000, contents: "AAAA" });
    const backend = makeBackend([]);
    backend.putPhoto = async () => ({ error: "network" as const });

    const summary = await syncPhotos(backend);

    expect(summary.failed).toBe(1);
    expect(summary.uploaded).toBe(0);
  });
});

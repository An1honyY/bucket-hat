// docs/10-production-readiness.md §10.3 — "Export my data" / "Import data."
// Serializes Inventory + SavedLocation[] + WarmthCalibration +
// AdvancedWarmthThresholds + Journey[] (including recommendationSnapshot)
// to data.json, bundles it with gear-photos/ into one zip via
// react-native-zip-archive, and shares it with expo-sharing. Import reverses
// the process: unzip, upsert data.json contents by id, copy photos back.
//
// react-native-zip-archive is native-only (no web implementation) — its JS
// entry point is safe to import on web (it lazily resolves the native
// module only when zip()/unzip() is actually called), so this file bundles
// fine for the `expo start --web` smoke check, but the actual export/import
// operations only work on a native build. See exportData()/importData()'s
// Platform.OS === "web" guard.
import { Platform } from "react-native";
// Modern File/Directory API (SDK 54+). `react-native-zip-archive` takes
// string paths, so `.uri` is passed at those boundaries — the same
// `file:///…` strings the legacy `documentDirectory`/`cacheDirectory`
// constants produced, so what reaches the zip library is unchanged.
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { zip, unzip } from "react-native-zip-archive";
import { listClothing, upsertClothing } from "../db/repositories/clothing";
import { listShoes, upsertShoe } from "../db/repositories/shoes";
import { listUmbrellas, upsertUmbrella } from "../db/repositories/umbrellas";
import { listVehicles, upsertVehicle } from "../db/repositories/vehicles";
import { listLocations, upsertLocation } from "../db/repositories/locations";
import { listAllJourneys, upsertJourney } from "../db/repositories/journeys";
import { getWarmthCalibration, saveWarmthCalibration } from "../db/repositories/calibration";
import { getAdvancedThresholds, saveAdvancedThresholds } from "../db/repositories/advancedThresholds";
import type {
  AdvancedWarmthThresholds,
  ClothingItem,
  Journey,
  SavedLocation,
  ShoeItem,
  UmbrellaItem,
  VehicleItem,
  WarmthCalibration,
} from "../types";

const EXPORT_SCHEMA_VERSION = 1;
// All three are lazy accessors, never module-scope constants. On web
// `expo-file-system` is unsupported, `Paths.document`/`Paths.cache` are
// stubs, and `new Directory(...)` throws on construction — at module scope
// that exception escapes the import and takes down every screen that
// transitively imports this file (Settings does). The legacy API merely
// returned null for those paths, so the old constants were harmless.
const gearPhotosDir = () => new Directory(Paths.document, "gear-photos");
const exportStagingDir = () => new Directory(Paths.cache, "export-staging");
const importStagingDir = () => new Directory(Paths.cache, "import-staging");

interface ExportBundle {
  exportedAt: string;
  schemaVersion: number;
  clothing: ClothingItem[];
  shoes: ShoeItem[];
  umbrellas: UmbrellaItem[];
  vehicles: VehicleItem[];
  locations: SavedLocation[];
  journeys: Journey[];
  calibration: WarmthCalibration;
  advancedThresholds: AdvancedWarmthThresholds;
}

function resetDir(dir: Directory): void {
  // Directory.delete() has no `idempotent` option (unlike create()), so the
  // exists check is required rather than defensive.
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });
}

async function copyDirContents(fromDir: Directory, toDir: Directory): Promise<void> {
  if (!fromDir.exists) return;
  if (!toDir.exists) toDir.create({ intermediates: true, idempotent: true });
  for (const entry of fromDir.list()) {
    // list() returns directories as well as files; gear-photos is flat, so
    // anything that isn't a File is skipped rather than recursed into.
    if (!(entry instanceof File)) continue;
    await entry.copy(new File(toDir, entry.name), { overwrite: true });
  }
}

export class ExportUnavailableError extends Error {}

export async function exportData(): Promise<void> {
  if (Platform.OS === "web") {
    throw new ExportUnavailableError("Export isn't available in the web preview — test this on a device or simulator build.");
  }

  const bundle: ExportBundle = {
    exportedAt: new Date().toISOString(),
    schemaVersion: EXPORT_SCHEMA_VERSION,
    clothing: await listClothing(),
    shoes: await listShoes(),
    umbrellas: await listUmbrellas(),
    vehicles: await listVehicles(),
    locations: await listLocations(),
    journeys: await listAllJourneys(),
    calibration: await getWarmthCalibration(),
    advancedThresholds: await getAdvancedThresholds(),
  };

  const staging = exportStagingDir();
  resetDir(staging);
  const dataJson = new File(staging, "data.json");
  dataJson.create({ overwrite: true });
  dataJson.write(JSON.stringify(bundle, null, 2));
  await copyDirContents(gearPhotosDir(), new Directory(staging, "gear-photos"));

  const zipDest = new File(Paths.cache, `bucket-hat-export-${Date.now()}.zip`);
  await zip(staging.uri, zipDest.uri);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new ExportUnavailableError("Sharing isn't available on this device.");
  await Sharing.shareAsync(zipDest.uri, { mimeType: "application/zip", dialogTitle: "Export your data" });
}

// Re-derives each gear item's photoUri from whatever photo files actually
// unzipped, rather than trusting the exported absolute path — documentDirectory
// is per-install/per-device, so a path recorded on the exporting device is
// meaningless after a reinstall or on a different device (§10.6's explicit
// "delete app, reinstall, import" test case).
async function relinkPhotos<T extends { id: string; photoUri?: string }>(
  items: T[],
  unzippedPhotosDir: Directory
): Promise<T[]> {
  if (!unzippedPhotosDir.exists) return items.map((item) => ({ ...item, photoUri: undefined }));

  const destDir = gearPhotosDir();
  if (!destDir.exists) destDir.create({ intermediates: true, idempotent: true });

  return Promise.all(
    items.map(async (item) => {
      const src = new File(unzippedPhotosDir, `${item.id}.jpg`);
      if (!src.exists) return { ...item, photoUri: undefined };
      const dest = new File(destDir, `${item.id}.jpg`);
      await src.copy(dest, { overwrite: true });
      return { ...item, photoUri: `${dest.uri}?t=${Date.now()}` };
    })
  );
}

export interface ImportResult {
  imported: boolean;
  error?: string;
}

export async function importData(): Promise<ImportResult> {
  if (Platform.OS === "web") {
    return { imported: false, error: "Import isn't available in the web preview — test this on a device or simulator build." };
  }

  const picked = await DocumentPicker.getDocumentAsync({ type: "application/zip", copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) return { imported: false };

  const staging = importStagingDir();
  resetDir(staging);
  await unzip(picked.assets[0].uri, staging.uri);

  const dataJson = new File(staging, "data.json");
  if (!dataJson.exists) {
    return { imported: false, error: "This file doesn't look like a Bucket Hat export." };
  }

  let bundle: ExportBundle;
  try {
    bundle = JSON.parse(await dataJson.text()) as ExportBundle;
  } catch {
    return { imported: false, error: "This export file is corrupted and couldn't be read." };
  }

  const photosDir = new Directory(staging, "gear-photos");
  const clothing = await relinkPhotos(bundle.clothing ?? [], photosDir);
  const shoes = await relinkPhotos(bundle.shoes ?? [], photosDir);
  const umbrellas = await relinkPhotos(bundle.umbrellas ?? [], photosDir);
  const vehicles = await relinkPhotos(bundle.vehicles ?? [], photosDir);

  for (const item of clothing) await upsertClothing(item);
  for (const item of shoes) await upsertShoe(item);
  for (const item of umbrellas) await upsertUmbrella(item);
  for (const item of vehicles) await upsertVehicle(item);
  for (const location of bundle.locations ?? []) await upsertLocation(location);
  for (const journey of bundle.journeys ?? []) await upsertJourney(journey);
  if (bundle.calibration) await saveWarmthCalibration(bundle.calibration);
  if (bundle.advancedThresholds) await saveAdvancedThresholds(bundle.advancedThresholds);

  return { imported: true };
}

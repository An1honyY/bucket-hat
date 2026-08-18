import { Platform } from "react-native";
import type { ComponentRef } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

// Phase 14's share plumbing — docs/13-extended-features.md §13.2.
//
// "The only new code is the capture-and-share plumbing", and this is it: no
// new data, no second recommendation pass. The card being captured
// (ShareableConditionsCard) is fed the same `RightNowState` the live card
// renders.
//
// Two platforms, two different last steps. Native captures to a temp file and
// hands the path to the OS share sheet. Web captures to a data URI (the
// library renders through html2canvas there) and offers the browser's own
// share sheet if it will take a file, falling back to saving the PNG — which
// is what "share this" means on a desktop browser anyway.

export type ShareConditionsResult =
  | { ok: true; how: "share-sheet" | "saved" }
  /** Nothing was produced. `reason` is safe to show the user as-is. */
  | { ok: false; reason: string };

/** Distinct enough to find in a downloads folder, and sortable there. */
export function shareCardFileName(nowMs: number): string {
  const d = new Date(nowMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `bucket-hat-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
}

/** `data:image/png;base64,…` → a real Blob, so the browser can treat it as a
 *  file rather than as a very long string. */
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(",");
  const mime = /:(.*?);/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function shareOnWeb(dataUri: string, fileName: string): Promise<ShareConditionsResult> {
  const file = new File([dataUriToBlob(dataUri)], fileName, { type: "image/png" });
  // `canShare` with files is the only honest test: Safari and Chrome on a
  // phone take it, most desktop browsers have `share` but refuse files, and
  // calling `share` blind there throws after the user has already tapped.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return { ok: true, how: "share-sheet" };
    } catch (error) {
      // The user closing the sheet lands here too, and is not a failure worth
      // reporting back at them.
      if (error instanceof DOMException && error.name === "AbortError") return { ok: true, how: "share-sheet" };
      return { ok: false, reason: "Couldn't open the share sheet." };
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked on the next tick rather than immediately: the click starts the
  // save asynchronously, and pulling the URL out from under it cancels the
  // download in Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { ok: true, how: "saved" };
}

/**
 * Capture the given view and hand the PNG to whatever this platform means by
 * "share".
 *
 * The ref must point at a mounted, laid-out view with an opaque background —
 * §13.2 flags transparent backgrounds as one of the two things view-shot is
 * historically bad at, and a card captured without one comes out with black
 * text on black.
 */
export async function shareConditionsCard(
  view: ComponentRef<typeof View>,
  nowMs: number = Date.now()
): Promise<ShareConditionsResult> {
  const fileName = shareCardFileName(nowMs);

  if (Platform.OS === "web") {
    try {
      const dataUri = await captureRef(view, { format: "png", quality: 1, result: "data-uri" });
      return await shareOnWeb(dataUri, fileName);
    } catch {
      return { ok: false, reason: "Couldn't make an image of the card." };
    }
  }

  let uri: string;
  try {
    uri = await captureRef(view, { format: "png", quality: 1, result: "tmpfile", fileName });
  } catch {
    return { ok: false, reason: "Couldn't make an image of the card." };
  }

  if (!(await Sharing.isAvailableAsync())) {
    return { ok: false, reason: "Sharing isn't available on this device." };
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      // iOS needs the UTI as well as the MIME type, or the sheet offers a
      // shorter list of destinations than it should.
      UTI: "public.png",
      dialogTitle: "Right now",
    });
    return { ok: true, how: "share-sheet" };
  } catch {
    return { ok: false, reason: "Couldn't open the share sheet." };
  }
}

import { useState } from "react";
import { ActionSheetIOS, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { showAlert } from "../lib/crossPlatformAlert";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
// The modern File/Directory API (SDK 54+). §3.3 is written against the old
// string-path calls, but the storage contract it describes is unchanged:
// still `gear-photos/{itemId}.jpg` under the document directory.
import { Directory, File, Paths } from "expo-file-system";
import useTheme from "../theme/useTheme";
import { useGearPhoto } from "./useGearPhoto";

// Optional photo well for gear add/edit forms — docs/03-data-models.md §3.3.
// Camera or library via an action sheet, resized/compressed to an 800px
// long edge at ~0.7 JPEG quality, copied into
// `${documentDirectory}gear-photos/{itemId}.jpg` (overwritten in place on
// re-capture) so the photo survives the user deleting it from their camera
// roll. `itemId` must be stable across the whole add flow — the owning
// form generates it up front via rowMapping.newId(), even for a
// not-yet-saved item, specifically so this component has somewhere to
// write to before "Save" is tapped.
// Constructed lazily, never at module scope. `expo-file-system` is
// unsupported on web, where `Paths.document` is a stub and
// `new Directory(...)` throws immediately ("this.validatePath is not a
// function"). At module scope that exception escapes the import itself and
// takes the entire web bundle down — this component is reachable from the
// gear forms, so nothing renders at all. The legacy API tolerated this by
// returning null for `documentDirectory`, which merely produced a useless
// path string; the class API does not.
function photoDir(): Directory {
  return new Directory(Paths.document, "gear-photos");
}

interface Props {
  itemId: string;
  photoUri: string | undefined;
  onChange: (photoUri: string | undefined) => void;
}

function ensurePhotoDir(): Directory {
  const dir = photoDir();
  // `idempotent` rather than checking `exists` first: create() throws on an
  // existing directory, and check-then-create is a race.
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function processAndStore(uri: string, itemId: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  const dir = ensurePhotoDir();
  const dest = new File(dir, `${itemId}.jpg`);
  // `overwrite` matters: re-capture deliberately writes over the same
  // filename (§3.3), and copy() throws onto an existing path without it.
  await new File(manipulated.uri).copy(dest, { overwrite: true });
  // Cache-bust the thumbnail — same filename, different content on re-capture.
  return `${dest.uri}?t=${Date.now()}`;
}

export default function PhotoPicker({ itemId, photoUri, onChange }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [busy, setBusy] = useState(false);
  // On web an existing item's photo lives only in object storage, so the
  // well would otherwise show "+ Add photo" over a photo that does exist —
  // and tapping it would silently replace one the user couldn't see.
  // `photoUri` still drives the Remove control, which acts on the row.
  const displayUri = useGearPhoto(itemId, photoUri);

  async function pickFrom(source: "camera" | "library") {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        source === "camera" ? "Camera access needed" : "Photo library access needed",
        "Allow access so you can attach a photo to this item."
      );
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    if (result.canceled || !result.assets[0]) return;

    setBusy(true);
    try {
      const stored = await processAndStore(result.assets[0].uri, itemId);
      onChange(stored);
    } finally {
      setBusy(false);
    }
  }

  function openPicker() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickFrom("camera");
          if (index === 2) pickFrom("library");
        }
      );
    } else if (Platform.OS === "web") {
      // A real 3-way choice (Take Photo / Choose from Library / Cancel) —
      // showAlert's web fallback only maps onto a binary window.confirm, so
      // a single call here would silently drop one option. Two sequential
      // confirms instead of Alert.alert's silent web no-op.
      if (window.confirm("Add a photo\n\nTake a photo now?")) {
        pickFrom("camera");
      } else if (window.confirm("Add a photo\n\nChoose from your photo library instead?")) {
        pickFrom("library");
      }
    } else {
      Alert.alert("Add a photo", undefined, [
        { text: "Take Photo", onPress: () => pickFrom("camera") },
        { text: "Choose from Library", onPress: () => pickFrom("library") },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={openPicker} style={styles.well} disabled={busy}>
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.photo} />
        ) : (
          <Text style={styles.placeholder}>{busy ? "Saving…" : "+ Add photo"}</Text>
        )}
      </Pressable>
      {photoUri && (
        <Pressable onPress={() => onChange(undefined)} hitSlop={8}>
          <Text style={styles.removeLabel}>Remove photo</Text>
        </Pressable>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { alignItems: "center", gap: 6 },
    well: {
      width: 96,
      height: 96,
      borderRadius: 12,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    photo: { width: "100%", height: "100%" },
    placeholder: { fontSize: 12, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 8 },
    removeLabel: { fontSize: 12, color: theme.conditionStorm },
  });
}

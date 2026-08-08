import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useKeyboardInset } from "./useKeyboardInset";
import useTheme from "../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../theme/typography";

// The one bottom sheet — §9.3. There were four hand-rolled copies of this
// (the Plan screen's place picker, Journey Detail's "Mark this spot", and
// both of Saved journeys' sheets), each with its own backdrop opacity, corner
// radius and dismiss area, and each with the same bug: a sheet anchored to
// the bottom of the screen puts its text field exactly where the software
// keyboard appears, so typing an address meant typing blind.
//
// Lifting the sheet by the keyboard's height (useKeyboardInset) is the fix,
// and it lives here rather than in each caller for the reason the sheets were
// worth unifying in the first place — a keyboard fix applied to three of four
// copies is a bug report waiting to happen. `SidePanel` remains separate: it
// slides from the right and is a panel, not a sheet.

// The sheet gives back a strip of backdrop even when its content is tall, so
// there's always somewhere to tap to dismiss.
const MAX_HEIGHT_RATIO = 0.85;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Heading inside the sheet. Omit for a sheet whose content titles itself. */
  title?: string;
  /** Spoken label for the tap-to-dismiss backdrop. */
  closeLabel?: string;
  /** Off for content that brings its own padding (a form with its own container). */
  padded?: boolean;
  children: ReactNode;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  closeLabel = "Close",
  padded = true,
  children,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const keyboardInset = useKeyboardInset();
  const { height } = useWindowDimensions();

  // The cap is computed against the space actually left over rather than
  // given as a percentage: with the keyboard up, "85% of the screen" is
  // taller than the screen still has, and the sheet's own content would be
  // what gets pushed off the top.
  const maxHeight = Math.max(160, (height - keyboardInset) * MAX_HEIGHT_RATIO);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardInset }]}>
        {/* A sibling of the sheet rather than a Pressable wrapping it: on
            react-native-web every Pressable is a <button>, and a sheet full
            of controls nested inside one is invalid markup that swallows
            their clicks. */}
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View style={[styles.sheet, padded && styles.sheetPadded, { maxHeight }]}>
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.35)", justifyContent: "flex-end", alignItems: "center" },
    dismissArea: { flex: 1, alignSelf: "stretch" },
    sheet: {
      width: "100%",
      // Centred and capped, so on a wide viewport the sheet stays a sheet
      // rather than a full-bleed strip across the bottom of the window.
      maxWidth: CONTENT_MAX_WIDTH,
      backgroundColor: theme.surfaceRaised,
      borderTopLeftRadius: RADIUS.card,
      borderTopRightRadius: RADIUS.card,
      borderWidth: theme.surfaceRaisedBorder === "transparent" ? 0 : 1,
      borderColor: theme.surfaceRaisedBorder,
      paddingTop: SPACING.md,
      gap: SPACING.sm,
    },
    sheetPadded: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl, paddingTop: SPACING.xl },
    title: { ...TYPE.subtitle, color: theme.textPrimary },
  });
}

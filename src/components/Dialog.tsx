import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ActionIcon from "./ActionIcon";
import useTheme from "../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../theme/typography";

// A centred dialog — the sibling of `BottomSheet` for content that is a thing
// to look at rather than a list to choose from.
//
// The distinction is worth one more component. A bottom sheet is a drawer of
// options: it enters from the thumb, it is as tall as its list, and the
// interesting part of the screen is the part it doesn't cover. That is the
// wrong frame for a preview, where the content *is* the point — anchored to
// the bottom edge it sits as far from the eye as it can get, and it competes
// with whatever of the screen is still showing above it. A dialog centres its
// subject and dims everything else, which is what "look at this before you
// send it" asks for.
//
// Same bones as BottomSheet otherwise: one backdrop that dismisses, the
// keyboard-agnostic max height, and the `surfaceRaised` treatment so the two
// read as the same family of surface.

/** Leaves a band of backdrop top and bottom, so there is always somewhere to
 *  tap to dismiss even when the content is tall. */
const MAX_HEIGHT_RATIO = 0.86;

/** Roomy enough for a share-card preview, narrow enough to still read as a
 *  dialog on a desktop browser. Exported because content that has to fit
 *  itself to the dialog (a preview that scales) needs the same number. */
export const DIALOG_MAX_WIDTH = 420;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Spoken label for the tap-to-dismiss backdrop and the close button. */
  closeLabel?: string;
  children: ReactNode;
  /** Pinned below the scrolling body — the dialog's actions, if it has any. */
  footer?: ReactNode;
}

export default function Dialog({ visible, onClose, title, closeLabel = "Close", children, footer }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { height, width } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* A sibling rather than a wrapper, for the same reason BottomSheet's
            is: on react-native-web a Pressable is a <button>, and controls
            nested inside one lose their clicks. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View
          style={[
            styles.dialog,
            { maxHeight: height * MAX_HEIGHT_RATIO, width: Math.min(width - SPACING.xl * 2, DIALOG_MAX_WIDTH) },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
            >
              <ActionIcon kind="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
          {footer !== undefined && <View style={styles.footer}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "center", alignItems: "center" },
    dialog: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: RADIUS.card,
      borderWidth: theme.surfaceRaisedBorder === "transparent" ? 0 : 1,
      borderColor: theme.surfaceRaisedBorder,
      overflow: "hidden",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingLeft: SPACING.lg,
      paddingRight: SPACING.xs,
      paddingTop: SPACING.sm,
    },
    title: { ...TYPE.subtitle, color: theme.textPrimary, flex: 1 },
    // §9.6's 44pt minimum, around an 18px glyph.
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    body: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
    footer: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
  });
}

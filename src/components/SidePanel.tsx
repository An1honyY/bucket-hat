import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ActionIcon from "./ActionIcon";
import useTheme from "../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../theme/typography";

// The shell shared by the reference panels — Today's "48h & week" forecast and
// Plan's "Full outlook". Both are things you read alongside what's behind
// them, which is why they're side panels rather than the bottom sheets the
// pickers use (SavedLocationPicker, UnavailabilitySheet): a sheet interrupts
// to take an answer, and a tall side panel fits stacked horizontal strips far
// better than one capped at 70% height.
//
// Both panels previously built this shell themselves, identically, down to the
// same backdrop row and the same block styling — so the two bugs below had to
// be fixed twice or not at all.
//
// **Slide direction.** They passed `animationType="slide"` to Modal, which
// always translates up from the bottom edge whatever the layout inside says.
// So a panel laid out against the right edge nonetheless flew in from the
// floor. React Native gives no "slide from the right" variant, so the
// animation is driven here (`animationType="none"` plus an Animated
// translateX) rather than asked for declaratively.
//
// **Width.** A flat 420px cap read as a narrow ribbon on a desktop browser
// with most of the window dimmed behind it — fine on the phone it was tuned
// for. The panel now takes a share of the viewport that grows with it.

// On a phone the panel is essentially the screen, leaving a strip of backdrop
// wide enough to show what it covers and to give a tap target for closing.
const NARROW_FRACTION = 0.86;
// The width past which "most of the screen" stops being the right answer —
// beyond it the backdrop is no longer a sliver, so the panel takes a share
// instead of nearly all.
const NARROW_CEILING = 700;
// The share of a large viewport. Applies only once it actually exceeds what
// the narrow rule was already giving, so the two never disagree.
const WIDE_FRACTION = 0.55;
// Past this the content (a 48-column strip, a 7-row day list) gains nothing
// from more width and the panel would just be a very wide column.
const MAX_WIDTH = 760;

const SLIDE_MS = 220;

/** The panel's width for a given viewport.
 *
 *  Deliberately the *larger* of the two rules rather than a hard switch
 *  between them. A plain `viewport < breakpoint ? 0.86 : 0.55` looks
 *  reasonable and is not: at 690px it yields 593 and at 700px it yields 385,
 *  so dragging a browser window wider makes the panel jump narrower. Taking
 *  the max of two non-decreasing functions is monotonic by construction —
 *  pinned by a test, since this is the kind of discontinuity that only shows
 *  up while actively resizing and is easy to reintroduce. */
export function sidePanelWidth(viewportWidth: number): number {
  const narrow = Math.min(viewportWidth, NARROW_CEILING) * NARROW_FRACTION;
  const wide = viewportWidth * WIDE_FRACTION;
  return Math.min(Math.max(narrow, wide), MAX_WIDTH);
}

interface Props {
  /** Panel title, in the header beside the close control. */
  heading: string;
  /** Optional second line under the heading — a suburb, a route summary. */
  subheading?: string | null;
  /** Spoken label for both the close button and the backdrop. */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export default function SidePanel({ heading, subheading, closeLabel, onClose, children }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { width } = useWindowDimensions();
  // Recomputed every render, so rotating a device or dragging a browser window
  // resizes the open panel rather than stranding it at its mount-time width.
  const panelWidth = sidePanelWidth(width);

  // Starts fully off the right edge. Measured in pixels rather than a 0-1
  // interpolation so the panel is off-screen at mount even on the first frame,
  // before any layout has been measured.
  //
  // A lazy useState initializer rather than a ref, matching MainTabs' indicator
  // — the value is created once and never reassigned, and reading a ref during
  // render (which the dependency arrays below do) is what react-hooks/refs
  // forbids.
  const [translateX] = useState(() => new Animated.Value(panelWidth));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  // translateX and opacity both qualify for the native driver; RNW has none.
  const useNative = Platform.OS !== "web";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: SLIDE_MS, useNativeDriver: useNative }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: SLIDE_MS, useNativeDriver: useNative }),
    ]).start();
  }, [translateX, backdropOpacity, useNative]);

  // The caller unmounts us on close, so the exit has to finish before we hand
  // control back — otherwise the panel vanishes instantly and only the entrance
  // is ever animated, which reads as a glitch rather than a dismissal.
  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: panelWidth, duration: SLIDE_MS, useNativeDriver: useNative }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: SLIDE_MS, useNativeDriver: useNative }),
    ]).start(({ finished }) => {
      // Only on a completed run: an interrupted animation means something else
      // already took over, and closing from under it would be a surprise.
      if (finished) onClose();
    });
  }, [translateX, backdropOpacity, panelWidth, useNative, onClose]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.backdropRow}>
        {/* Tapping the dimmed area closes, same as the bottom sheets. A sibling
            of the panel rather than its parent, so a tap inside the panel needs
            no stopPropagation. */}
        <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={closeLabel} />
        </Animated.View>
        <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>{heading}</Text>
              {subheading ? <Text style={styles.subheading}>{subheading}</Text> : null}
            </View>
            <Pressable onPress={close} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={closeLabel}>
              <ActionIcon kind="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdropRow: { flex: 1, flexDirection: "row" },
    backdropFill: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    panel: {
      backgroundColor: theme.surfaceRaised,
      borderTopLeftRadius: RADIUS.card,
      borderBottomLeftRadius: RADIUS.card,
      paddingTop: SPACING.xl,
      // The panel is the full height of the screen, so it needs to own its own
      // vertical space rather than inherit the row's cross-axis stretch.
      height: "100%",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.sm,
    },
    headerText: { flexShrink: 1 },
    heading: { ...TYPE.subtitle, color: theme.textPrimary },
    subheading: { ...TYPE.caption, color: theme.textSecondary },
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    body: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  });
}

/** Section card inside a panel body. Exported so both panels group their
 *  content identically — one card per section, giving each horizontal strip a
 *  visible edge to scroll against instead of bleeding into the next. Fill
 *  *and* border, because `surface` and `surfaceRaised` are the same white in
 *  the light theme and only the border separates them there. */
export function panelBlockStyle(theme: ReturnType<typeof useTheme>) {
  return {
    gap: SPACING.sm,
    backgroundColor: theme.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
  } as const;
}

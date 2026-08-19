import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import ActionIcon from "../../components/ActionIcon";
import BottomSheet from "../../components/BottomSheet";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import { shareConditionsCard } from "../../lib/shareConditions";
import { showAlert } from "../../lib/crossPlatformAlert";
import { reducedRecommendationFor, type RightNowState } from "../../lib/useRightNow";
import { shareableWindows, snapshotFromHour, summarizeWindow, type ForecastWindow } from "../../lib/forecastWindows";
import ShareableConditionsCard, { CARD_WIDTH, type ShareCardSubject } from "./ShareableConditionsCard";

// The share affordance on the "Right now" card, and everything behind it —
// docs/13-extended-features.md §13.2, extended past "right now" (2026-08-19).
//
// §13.2 shares the current conditions, and that card is stale the moment it
// arrives: "17°C, dry" is a fact about the minute it was sent, while the
// person reading it is deciding about this afternoon. So the button opens a
// short list of what the app can *say something about* — a named run of
// weather first ("Rain 2–5pm"), then the plain spans ("Tomorrow") — with
// right now at the top, because sometimes that is the answer.
//
// The gear on a forecast card is the real engine output for that hour, not
// today's picks relabelled: `reducedRecommendationFor` is the same call the
// live card makes, against the window's worst hour.

/** Where the app is, when the reverse geocode hasn't produced a suburb — a
 *  failed lookup, or a permission the user hasn't given. v1 is Auckland-only
 *  by design (docs/02-external-apis.md §2.1), so this is a fact about the app
 *  rather than a guess about the reading. */
const FALLBACK_PLACE = "Auckland";

function isSameLocalDay(iso: string, nowMs: number): boolean {
  const a = new Date(iso);
  const b = new Date(nowMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ShareConditions(state: RightNowState) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const { weather, recommendation, suburb, fetchedAt, hourly, coords } = state;

  const exportRef = useRef<View>(null);
  /** The pending animation frame, so an unmount mid-capture cancels it. */
  const frame = useRef<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /** What the off-screen card is currently rendering. Set just before a
   *  capture and cleared after it; null the rest of the time so the card
   *  isn't mounted for nothing. */
  const [subject, setSubject] = useState<ShareCardSubject | null>(null);
  const [mountedAt] = useState(() => Date.now());

  const place = suburb ?? FALLBACK_PLACE;
  // The reading's own timestamp, not the wall clock: `Date.now()` during
  // render is impure (react-hooks/purity), and the windows should be cut
  // against the forecast the card is holding anyway. `mountedAt` only stands
  // in before the first fetch lands, when there is no forecast to cut.
  const nowMs = fetchedAt ?? mountedAt;
  const windows = weather && recommendation ? shareableWindows(hourly, nowMs, hour12) : [];

  const capture = useCallback(async () => {
    if (!exportRef.current) return;
    const result = await shareConditionsCard(exportRef.current);
    if (!result.ok) showAlert("Couldn't share this", result.reason);
  }, []);

  // The capture waits for the card to exist. Two frames rather than one:
  // the first commits the new subject, the second is the first frame where
  // its layout is real — captured any earlier, a window card comes out with
  // the previous subject's height.
  useEffect(() => {
    if (!subject) return;
    let cancelled = false;
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(async () => {
        if (cancelled) return;
        await capture();
        if (cancelled) return;
        setSubject(null);
        setBusy(false);
      });
    });
    return () => {
      cancelled = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [subject, capture]);

  if (!weather || !recommendation) return null;

  function shareNow() {
    setBusy(true);
    setPickerOpen(false);
    setSubject({
      eyebrow: `${place} right now`,
      weather: weather!,
      recommendation: recommendation!,
      windKph: weather!.windKph,
      footerNote: formatTime(
        fetchedAt !== null && fetchedAt !== undefined ? new Date(fetchedAt).toISOString() : weather!.time,
        hour12
      ),
    });
  }

  async function shareWindow(window: ForecastWindow) {
    setBusy(true);
    setPickerOpen(false);
    const summary = summarizeWindow(window);
    // Drawn as the window's own time of day, not the peak hour's: see
    // `mostlyDaylight`. It only reaches the icon — the engine reads
    // `isDaylight` too (§7.6's darkness gear), and a night window should get
    // that treatment for the same reason.
    const peak = { ...snapshotFromHour(summary.peak, new Date(nowMs).toISOString()), isDaylight: summary.mostlyDaylight };
    // Gear for the window's worst hour, from the engine itself. Without
    // coordinates there is no synthetic journey to run it against, so the
    // card falls back to the live recommendation rather than inventing one.
    const forWindow = coords ? await reducedRecommendationFor(peak, coords) : recommendation!;
    setSubject({
      eyebrow: `${place} · ${window.cardTitle}`,
      weather: peak,
      recommendation: forWindow,
      tempRangeC: { minC: summary.minTempC, maxC: summary.maxTempC },
      windKph: summary.maxWindKph,
      footerNote: isSameLocalDay(window.startIso, nowMs) ? "Today" : "Tomorrow",
    });
  }

  return (
    <>
      <Pressable
        onPress={() => setPickerOpen(true)}
        disabled={busy}
        style={styles.shareButton}
        accessibilityRole="button"
        accessibilityLabel="Share conditions as an image"
      >
        {busy ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : (
          <ActionIcon kind="share" size={18} color={theme.textSecondary} />
        )}
      </Pressable>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Share conditions"
        closeLabel="Close share options"
      >
        <View style={styles.options}>
          <Pressable onPress={shareNow} style={styles.option} accessibilityRole="button">
            <Text style={styles.optionLabel}>Right now</Text>
            <ActionIcon kind="share" size={16} color={theme.textSecondary} />
          </Pressable>
          {windows.map((window) => (
            <Pressable
              key={window.id}
              onPress={() => shareWindow(window)}
              style={styles.option}
              accessibilityRole="button"
            >
              <Text style={styles.optionLabel}>{window.title}</Text>
              <ActionIcon kind="share" size={16} color={theme.textSecondary} />
            </Pressable>
          ))}
          {windows.length === 0 && (
            <Text style={styles.emptyNote}>The forecast hasn&apos;t loaded yet — only right now is ready to send.</Text>
          )}
        </View>
      </BottomSheet>

      {/* What the camera points at. Off screen rather than hidden: `opacity: 0`
          and `display: none` both capture as nothing, and Android needs
          `collapsable={false}` or the view is optimised out of the tree before
          there is anything to capture. */}
      {subject && (
        <View ref={exportRef} collapsable={false} style={styles.offscreen} pointerEvents="none" aria-hidden>
          <ShareableConditionsCard subject={subject} />
        </View>
      )}
    </>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // Top-right of the card it sits in, absolutely placed so the card's own
    // stack is untouched by it — and that corner is the one part of the
    // "Right now" card that never holds anything (the mascot stands above the
    // top edge, not inside it).
    shareButton: {
      position: "absolute",
      top: SPACING.xs,
      right: SPACING.xs,
      // §9.6's minimum target, around an 18px glyph.
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    offscreen: { position: "absolute", left: -CARD_WIDTH * 2, top: 0 },
    options: { gap: SPACING.sm },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.sm,
      minHeight: 48,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surfaceRaised,
    },
    optionLabel: { ...TYPE.body, color: theme.textPrimary },
    emptyNote: { ...TYPE.caption, color: theme.textSecondary },
  });
}

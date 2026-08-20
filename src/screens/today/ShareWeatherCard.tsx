import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ActionIcon from "../../components/ActionIcon";
import HorizontalStrip from "../../components/HorizontalStrip";
import AppButton, { buttonIconColor } from "../../components/AppButton";
import Dialog, { DIALOG_MAX_WIDTH } from "../../components/Dialog";
import useTheme from "../../theme/useTheme";
import { selectedChipLabelStyle, selectedChipStyle } from "../../theme/commonStyles";
import { cardElevationStyle } from "../../theme/tokens";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import { formatTime } from "../../lib/formatTime";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import { shareConditionsCard } from "../../lib/shareConditions";
import { showAlert } from "../../lib/crossPlatformAlert";
import { reducedRecommendationFor, type RightNowState } from "../../lib/useRightNow";
import { shareableWindows, snapshotFromHour, summarizeWindow, type ForecastWindow } from "../../lib/forecastWindows";
import ShareableConditionsCard, { CARD_WIDTH, type ShareCardSubject } from "./ShareableConditionsCard";

// The share affordance on the "Right now" card, and everything behind it —
// docs/13-extended-features.md §13.2, extended past "right now" (2026-08-19)
// and turned preview-first (2026-08-20).
//
// §13.2 shares the current conditions, and that card is stale the moment it
// arrives: "17°C, dry" is a fact about the minute it was sent, while the
// person reading it is deciding about this afternoon. So the button opens a
// short list of what the app can *say something about* — a named run of
// weather first ("Rain 2-5pm"), then the plain spans ("Tomorrow") — with
// right now at the top, because sometimes that is the answer.
//
// What you pick, you see. The card used to be built off screen, captured and
// sent in one motion from a tap on a list row, so the only way to find out
// what you had sent was to look at what arrived — and on a wide window the
// "off screen" card was not off screen at all, it flashed up beside the sheet
// on its way past. Now the same card *is* the preview and the preview *is*
// what gets captured: one card, always visible, nothing to keep in sync. That
// is also what every app that shares a generated image already does — show
// it, let people flick between versions of it, then one button to send.
//
// The gear on a forecast card is the real engine output for that hour, not
// today's picks relabelled: `reducedRecommendationFor` is the same call the
// live card makes, against the window's worst hour.

/** Where the app is, when the reverse geocode hasn't produced a suburb — a
 *  failed lookup, or a permission the user hasn't given. v1 is Auckland-only
 *  by design (docs/02-external-apis.md §2.1), so this is a fact about the app
 *  rather than a guess about the reading. */
const FALLBACK_PLACE = "Auckland";

/** The one subject that needs no forecast, and the selection it opens on. */
const NOW_ID = "now";

/** The inset around the preview. The card's own surface is `surfaceRaised`
 *  and so is the dialog's, so without a recessed stage behind it the picture
 *  dissolves into the chrome and there is nothing to tell you where the thing
 *  you are about to send begins and ends. */
const STAGE_PADDING = SPACING.md;

/** Resolves after `count` painted frames. A zero timeout is not the same
 *  thing: it can run before the layout a state change asked for exists. */
function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    requestAnimationFrame(() => step(count - 1));
  });
}

/**
 * The footer stamp: when the card was true.
 *
 * Always a date, because a picture outlives the day it describes and a card
 * reading only "Today" is undatable the moment it is forwarded. A moment adds
 * its clock time; a span doesn't have one, and its own name ("Tonight") is
 * already in the eyebrow. Same date format as Journey Detail's summary, so
 * the app writes a date one way.
 */
function formatStamp(iso: string, hour12: boolean, withTime: boolean): string {
  const day = new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return withTime ? `${formatTime(iso, hour12)}, ${day}` : day;
}

export default function ShareWeatherCard(state: RightNowState) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  const { width } = useWindowDimensions();
  const { weather, recommendation, suburb, fetchedAt, hourly, coords } = state;

  const exportRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(NOW_ID);
  /** What the preview is showing. Null while a window's gear is being worked
   *  out — a DB read and an engine pass, fast but not free. */
  const [subject, setSubject] = useState<ShareCardSubject | null>(null);
  const [busy, setBusy] = useState(false);
  /** True for the two frames the camera needs the card at its true size. */
  const [capturing, setCapturing] = useState(false);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const [mountedAt] = useState(() => Date.now());
  /** Subjects already built, so flicking back to one you have seen doesn't
   *  blank the preview. Keyed by the reading as well as the window: a refresh
   *  behind the dialog makes every one of them a different card. */
  const built = useRef(new Map<string, ShareCardSubject>());

  const place = suburb ?? FALLBACK_PLACE;
  // The reading's own timestamp, not the wall clock: `Date.now()` during
  // render is impure (react-hooks/purity), and the windows should be cut
  // against the forecast the card is holding anyway. `mountedAt` only stands
  // in before the first fetch lands, when there is no forecast to cut.
  const nowMs = fetchedAt ?? mountedAt;
  const ready = weather !== null && weather !== undefined && recommendation !== null && recommendation !== undefined;
  const windows = useMemo(() => (ready ? shareableWindows(hourly, nowMs, hour12) : []), [ready, hourly, nowMs, hour12]);

  const buildSubject = useCallback(
    async (window: ForecastWindow | null): Promise<ShareCardSubject> => {
      if (!window) {
        const takenAt =
          fetchedAt !== null && fetchedAt !== undefined ? new Date(fetchedAt).toISOString() : weather!.time;
        return {
          eyebrow: `${place} · Right now`,
          weather: weather!,
          recommendation: recommendation!,
          windKph: weather!.windKph,
          stamp: formatStamp(takenAt, hour12, true),
        };
      }
      const summary = summarizeWindow(window);
      const fetchedIso = new Date(nowMs).toISOString();
      // What the card is *drawn* from: the hour that decides the icon and the
      // condition, shown as the window's own time of day rather than that
      // hour's (see `mostlyDaylight` — "Tonight" peaks at its first, still-lit
      // hour and was getting a midday sun).
      const peak = { ...snapshotFromHour(summary.peak, fetchedIso), isDaylight: summary.mostlyDaylight };
      // What the gear is recommended *across*: every hour in the window, as its
      // own leg. The engine folds them the way it folds a journey — warmth from
      // the coldest, gusts from the windiest, darkness from any dark one — so a
      // day card dresses you for the day's edges rather than for its middle.
      // Without coordinates there is no synthetic journey to run at all, so the
      // card falls back to the live recommendation rather than inventing one.
      const hours = window.hours.map((h) => snapshotFromHour(h, fetchedIso));
      const forWindow = coords ? await reducedRecommendationFor(hours, coords) : recommendation!;
      return {
        eyebrow: `${place} · ${window.cardTitle}`,
        weather: peak,
        recommendation: forWindow,
        tempRangeC: { minC: summary.minTempC, maxC: summary.maxTempC },
        windKph: summary.maxWindKph,
        stamp: formatStamp(window.startIso, hour12, false),
      };
    },
    [place, weather, recommendation, fetchedAt, hour12, nowMs, coords]
  );

  useEffect(() => {
    if (!open || !ready) return;
    let cancelled = false;
    // A refresh behind the dialog can retire the window you were looking at.
    // Right now is the one option that is always there.
    const window = windows.find((w) => w.id === selectedId) ?? null;
    const key = `${window ? window.id : NOW_ID}|${nowMs}`;
    const cached = built.current.get(key);
    if (cached) {
      setSubject(cached);
      return;
    }
    setSubject(null);
    buildSubject(window).then((next) => {
      if (cancelled) return;
      built.current.set(key, next);
      setSubject(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, ready, selectedId, windows, nowMs, buildSubject]);

  if (!ready) return null;

  async function share() {
    if (busy || subject === null) return;
    setBusy(true);
    // The card goes back to its true size for the shot — see `fitScale`. Two
    // frames, because the layout that answers a state change is not real until
    // the frame after the commit; the veil covers the swap either way.
    setCapturing(true);
    await nextFrames(2);
    const node = exportRef.current;
    const result = node
      ? await shareConditionsCard(node)
      : ({ ok: false, reason: "The card wasn't ready to capture." } as const);
    setCapturing(false);
    setBusy(false);
    if (result.ok) setOpen(false);
    else showAlert("Couldn't share this", result.reason);
  }

  // The preview is the capture, so it is laid out at its real CARD_WIDTH and
  // only *scaled* down when the dialog is narrower than that — and never while
  // the camera is open.
  //
  // That exception is not tidiness. On web the capture goes through
  // html2canvas, which sizes its canvas from `getBoundingClientRect()` — the
  // *transformed* box — but draws each word at its computed font size. At 0.89
  // every word came out about a tenth too wide for the gap it was given, so
  // the words closed up and swallowed the spaces between them: "Wind up to
  // 8 km/h" exported as "Windup to 8 km/h". Shooting at scale 1 is the only
  // fix here that doesn't involve second-guessing a text renderer.
  //
  // The stage keeps the height it had while scaled, so un-scaling reflows
  // nothing, and the veil below hides the moment it happens.
  //
  // A scaled view still occupies its full unscaled box, so the stage would
  // keep a band of dead space top and bottom. The negative margin takes back
  // exactly what the scale gave up. It leans on the transform origin being the
  // centre, which is the default on both platforms — naming an origin instead
  // would be clearer, but `transformOrigin` doesn't survive react-native-web
  // (it arrives at the DOM node as an unrecognised prop, which is what the
  // console has been complaining about since the mascot started hopping).
  const room = Math.min(width - SPACING.xl * 2, DIALOG_MAX_WIDTH) - (SPACING.lg + STAGE_PADDING) * 2;
  const fitScale = Math.min(1, room / CARD_WIDTH);
  const scale = capturing ? 1 : fitScale;
  const scaleInset = -((cardHeight ?? 0) * (1 - scale)) / 2;
  const stageHeight = cardHeight === null ? undefined : cardHeight * fitScale + STAGE_PADDING * 2;

  const options: { id: string; label: string; window: ForecastWindow | null }[] = [
    { id: NOW_ID, label: "Right now", window: null },
    ...windows.map((w) => ({ id: w.id, label: w.title, window: w })),
  ];
  const selected = options.some((o) => o.id === selectedId) ? selectedId : NOW_ID;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.shareButton}
        accessibilityRole="button"
        accessibilityLabel="Share a weather card"
      >
        <ActionIcon kind="share" size={18} color={theme.textSecondary} />
      </Pressable>

      <Dialog
        visible={open}
        onClose={() => setOpen(false)}
        title="Share a weather card"
        closeLabel="Close the share preview"
        footer={
          <AppButton
            label={busy ? "Sharing…" : "Share this card"}
            onPress={share}
            disabled={busy || subject === null}
            icon={<ActionIcon kind="share" size={16} color={buttonIconColor(theme, "primary")} />}
          />
        }
      >
        {/* The picker, above the thing it changes: what the app can say
            something about, scrolling sideways because a busy day has six of
            them and a stacked list would push the preview off the screen. */}
        {options.length > 1 && (
          <HorizontalStrip style={styles.chipRow} contentContainerStyle={styles.chips}>
            {options.map((option) => {
              const active = option.id === selected;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelectedId(option.id)}
                  disabled={busy}
                  style={[styles.chip, active && selectedChipStyle(theme)]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipLabel, active && selectedChipLabelStyle(theme)]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </HorizontalStrip>
        )}

        <View style={[styles.preview, { height: stageHeight }]}>
          {subject === null ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            // §9.0's elevation, on the wrapper rather than the card: it lifts
            // the picture off the stage in the light theme, where card and
            // stage are both near-white, without putting a shadow into the
            // PNG (the capture is the child, and a parent's shadow is not
            // part of it).
            <View style={[styles.lift, { transform: [{ scale }], marginVertical: scaleInset }]}>
              {/* What the camera points at. `collapsable={false}` because
                  Android would otherwise optimise a plain wrapper out of the
                  view tree, leaving nothing to capture. */}
              <View ref={exportRef} collapsable={false} onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
                <ShareableConditionsCard subject={subject} />
              </View>
            </View>
          )}
          {/* Opaque, and the stage's own colour, so the un-scaling underneath
              is invisible rather than merely dimmed. */}
          {capturing && (
            <View style={styles.veil}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          )}
        </View>
      </Dialog>
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
    // `flexGrow: 0`, or the row claims the dialog's whole scrolling height and
    // pushes the preview out of it. The negative margin lets the chips bleed
    // to the dialog's edges, so the last one doesn't look clipped mid-word.
    chipRow: { flexGrow: 0, marginHorizontal: -SPACING.lg },
    chips: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
    chip: {
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipLabel: { ...TYPE.caption, color: theme.textPrimary },
    lift: { borderRadius: RADIUS.card, ...cardElevationStyle(theme) },
    veil: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.bg,
      borderRadius: RADIUS.card,
    },
    preview: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 140,
      // Contains the card while it is briefly at full size for the capture —
      // otherwise it spills a sliver past the top and bottom of the veil that
      // is meant to be hiding it. Verified not to reach the PNG: html2canvas
      // renders the node it is handed, and an ancestor's clip is not part of
      // that node.
      overflow: "hidden",
      padding: STAGE_PADDING,
      borderRadius: RADIUS.card,
      // The app's own page colour, not `surface` — in the light theme
      // `surface`, `surfaceRaised` and the dialog are all white, and the
      // preview dissolved into its own chrome. `bg` is the one neutral that
      // sits behind a card in both themes, and the hairline gives the stage
      // an edge of its own where even that is subtle.
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
    },
  });
}

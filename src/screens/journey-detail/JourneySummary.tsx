import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ModeIcon from "../../components/ModeIcon";
import ActionIcon from "../../components/ActionIcon";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { NUMERIC, RADIUS, SPACING, TYPE } from "../../theme/typography";
import { formatTime } from "../../lib/formatTime";
import { formatDuration, spokenDuration } from "../../lib/formatDuration";
import { longTransferWaitMin } from "../../lib/deferDeparture";
import { useTimeFormatStore } from "../../lib/useTimeFormatStore";
import type { Journey } from "../../types";

// docs/09-design-system.md §9.3 — the answer to "what am I looking at?",
// which this screen previously never gave. You arrive here from a Today
// card, a notification or History and the first thing on screen was a map
// with no caption, followed straight by a gear card: where you're going,
// when you leave, when you get there and how long it takes all had to be
// reverse-engineered from the leg rows further down. The stack header only
// ever said "Journey."
//
// One card, four facts, top of the scroll. Times respect the 12/24h
// setting like everywhere else, and the mode icons are the same glyph set
// the leg rows use so the summary reads as a compressed version of the list
// below it rather than a second visual language.
interface Props {
  journey: Journey;
  totalDurationMin: number;
}

function formatDay(iso: string, nowMs: number): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDelta = Math.round((startOfDay(date) - startOfDay(new Date(nowMs))) / 86_400_000);
  if (dayDelta === 0) return "Today";
  if (dayDelta === 1) return "Tomorrow";
  if (dayDelta === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function JourneySummary({ journey, totalDurationMin }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");
  // Date.now() is impure to call during render — a lazy initializer runs it
  // once at mount, the same pattern the rest of this screen uses.
  const [nowMs] = useState(() => Date.now());
  const day = formatDay(journey.departTime, nowMs);
  const departMs = new Date(journey.departTime).getTime();
  const arriveIso = new Date(departMs + totalDurationMin * 60_000).toISOString();
  // Modes in the order they happen, de-duplicated — a bus trip that starts
  // and ends on foot is "walk, bus," not "walk, bus, walk."
  const modes = journey.legs
    .filter((leg) => leg.outdoor && !leg.isStationary)
    .map((leg) => leg.mode)
    .filter((mode, i, all) => all.indexOf(mode) === i);
  const stopCount = journey.waypoints?.length ?? 0;
  // A long wait *between* rides. The planner shifts a long wait at the start
  // of a journey into a later departure (deferDeparture.ts), but a transfer
  // can't be shifted — you're already out — so it's real time standing at a
  // stop, and it's the single biggest thing about a journey that has one.
  // Stated here rather than left to be discovered halfway down the leg list.
  const transferWaitMin = longTransferWaitMin(journey.legs);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${journey.origin.label} to ${journey.destination.label}, ${day}, leaving ${formatTime(journey.departTime, hour12)}, arriving ${formatTime(arriveIso, hour12)}, ${spokenDuration(totalDurationMin)}${transferWaitMin !== undefined ? `, includes a ${spokenDuration(transferWaitMin)} wait between services` : ""}`}
    >
      <View style={styles.routeRow}>
        <Text style={styles.endpoint} numberOfLines={1}>
          {journey.origin.label}
        </Text>
        <ActionIcon kind="arrowRight" size={14} color={theme.textSecondary} />
        <Text style={styles.endpoint} numberOfLines={1}>
          {journey.destination.label}
        </Text>
      </View>

      {/* Leaving is the hero, arriving supports it. You open this screen to
          answer "when do I need to be out the door" — the arrival time
          matters, but never first. §9.2's display step, tabular figures. */}
      <View style={styles.timeRow}>
        <View>
          <Text style={styles.timeLabel}>Leave</Text>
          <Text style={styles.departTime}>{formatTime(journey.departTime, hour12)}</Text>
        </View>
        <View style={styles.timeArrow}>
          <ActionIcon kind="arrowRight" size={16} color={theme.textSecondary} />
        </View>
        <View>
          <Text style={styles.timeLabel}>Arrive</Text>
          <Text style={styles.arriveTime}>{formatTime(arriveIso, hour12)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{day}</Text>
        <Text style={styles.meta}>{formatDuration(totalDurationMin)}</Text>
        {modes.length > 0 && (
          <View style={styles.modeRow}>
            {modes.map((mode) => (
              <ModeIcon key={mode} kind={mode} size={14} color={theme.textSecondary} />
            ))}
          </View>
        )}
        {stopCount > 0 && (
          <Text style={styles.meta}>
            {stopCount} stop{stopCount === 1 ? "" : "s"} on the way
          </Text>
        )}
      </View>

      {transferWaitMin !== undefined && (
        <Text style={styles.waitNote}>
          Includes a {formatDuration(transferWaitMin)} wait between services.
        </Text>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      gap: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    routeRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    endpoint: { ...TYPE.subtitle, color: theme.textPrimary, flexShrink: 1 },
    // flex-start, not center: the two blocks are different heights (display
    // vs title), so centring them staggered the two eyebrows against each
    // other. Aligning at the top puts both labels on one line and lets the
    // numerals hang at their natural sizes underneath.
    timeRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.lg },
    timeLabel: { ...TYPE.eyebrow, color: theme.textSecondary, marginBottom: SPACING.xs },
    timeArrow: { marginTop: SPACING.xxl },
    departTime: { ...TYPE.display, ...NUMERIC, color: theme.accentWalk },
    arriveTime: { ...TYPE.title, ...NUMERIC, color: theme.textPrimary },
    // Wider gap in place of the dots that used to divide these facts; the
    // mode glyphs keep their own tight grouping inside `modeRow`.
    metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACING.lg },
    meta: { ...TYPE.caption, color: theme.textSecondary },
    modeRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
    waitNote: { ...TYPE.caption, color: theme.textPrimary, fontWeight: "600" },
  });
}

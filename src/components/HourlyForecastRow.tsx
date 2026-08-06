import { StyleSheet, Text, View } from "react-native";
import { dayLabelFor, formatHourLabel, iconKindFor, localDayKey } from "../lib/outlookDisplay";
import { useTimeFormatStore } from "../lib/useTimeFormatStore";
import type { HourlyReading } from "../services/weatherService";
import { conditionColorForIcon } from "../theme/conditionColor";
import type { ThemeTokens } from "../theme/tokens";
import useTheme from "../theme/useTheme";
import HorizontalStrip from "./HorizontalStrip";
import RainGauge from "./RainGauge";
import { WEATHER_ICON_LABEL } from "./WeatherIcon";

// One horizontally scrolling row of hourly readings, split into day groups
// with the day's name above its own hours.
//
// The label sits *inside* the scrolling content, at the head of each group,
// rather than pinned above the row. That is what makes it track its own hours:
// scroll two days out and the second label arrives exactly over that day's
// first column, which is midnight. A single label above the whole strip would
// have gone stale the moment you scrolled past the first day, and a sticky one
// would need measurement plumbing that neither platform gives cheaply.
//
// Shared by every hourly surface — the Today card, the Today 48h panel, and
// both Plan outlooks — so day boundaries read the same everywhere.
interface Props {
  readings: HourlyReading[];
  // Anchors "Today"/"Tomorrow". Defaults to the real clock; passed explicitly
  // by the Plan screen, where the row can start at a future departure time.
  nowIso?: string;
  // The horizontal padding of the card this row sits in, cancelled so the
  // strip runs to the card's own edges.
  //
  // Without it the tinted day/night runs are a rounded block inset on all four
  // sides of a rounded card — a card drawn inside a card, which on a phone
  // (where the card is nearly the full screen) is the dominant thing you see
  // and reads as a rendering fault rather than as grouping. Bleeding the strip
  // to the edges makes the tint read as banding *within* the card, which is
  // what it was always meant to be: a background for the hours, not a
  // container around them.
  //
  // The padding is added back inside the scroll content, so the first column
  // still lines up with the card's heading and the last one clears the edge.
  bleed?: number;
  // The palette of the card hosting this row, for any caller whose card is on
  // a different palette from the app-wide one.
  //
  // Without it this row read the global theme while its container read the
  // reading's, which stranded the day labels — "TODAY"/"TOMORROW" sit in
  // `accentWalk`, and that's one of the tokens the mood moves. Opening a cold
  // suburb left them in the ambient accent, pink on a blue card. Same prop,
  // same reason, as JourneyCard's.
  theme?: ThemeTokens;
}

interface DayGroup {
  key: string;
  label: string;
  readings: HourlyReading[];
  /** Index of this group's first reading in the flat list. */
  offset: number;
}

function groupByDay(readings: HourlyReading[], nowIso?: string): DayGroup[] {
  const groups: DayGroup[] = [];
  readings.forEach((reading, i) => {
    const key = localDayKey(reading.time);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: dayLabelFor(reading.time, nowIso), readings: [reading], offset: i });
    } else {
      last.readings.push(reading);
    }
  });
  return groups;
}

export default function HourlyForecastRow({ readings, nowIso, bleed = 0, theme: themeProp }: Props) {
  const baseTheme = useTheme();
  const theme = themeProp ?? baseTheme;
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");

  const groups = groupByDay(readings, nowIso);
  if (groups.length === 0) return null;

  return (
    <HorizontalStrip
      style={bleed ? { marginHorizontal: -bleed } : undefined}
      contentContainerStyle={[styles.content, bleed ? { paddingLeft: bleed, paddingRight: bleed } : null]}
    >
      {groups.map((group, groupIndex) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.dayLabel} numberOfLines={1}>
            {group.label}
          </Text>
          <View style={styles.hours}>
            {group.readings.map((reading, i) => {
              const kind = iconKindFor(reading);
              // Night runs are computed against the *flat* list, not the day
              // group: a night starts before midnight and ends after it, so
              // grouping by day would break every night block in two at
              // exactly the point it's meant to read as continuous.
              const index = group.offset + i;
              const isNight = !reading.isDaylight;
              // A run is a stretch of hours on the same side of sunrise or
              // sunset — day runs get rounded ends too, so the strip reads
              // as alternating blocks rather than one tinted band with gaps
              // punched in it.
              const runStart = index === 0 || readings[index - 1].isDaylight === isNight;
              const runEnd = index === readings.length - 1 || readings[index + 1].isDaylight === isNight;
              return (
                <RainGauge
                  key={reading.time}
                  padded
                  isNight={isNight}
                  runStart={runStart}
                  runEnd={runEnd}
                  hour={formatHourLabel(reading.time, hour12)}
                  rainIntensity={reading.rainIntensity}
                  tempC={reading.tempC}
                  precipMm={reading.precipMm}
                  windKph={reading.windKph}
                  conditionKind={kind}
                  conditionColor={conditionColorForIcon(theme, kind)}
                  conditionLabel={WEATHER_ICON_LABEL[kind]}
                />
              );
            })}
          </View>
          {/* A hairline between days, so the boundary is visible even when the
              label above it has scrolled out of view. Not drawn before the
              first group, which has no previous day to divide from. */}
          {groupIndex < groups.length - 1 && <View style={styles.dayDivider} />}
        </View>
      ))}
    </HorizontalStrip>
  );
}

function getStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    content: { paddingRight: 4 },
    group: { flexDirection: "column", gap: 6 },
    dayLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.accentWalk,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      paddingLeft: 2,
    },
    // No gap between columns: each RainGauge carries its own horizontal
    // padding instead, so consecutive night hours tint as one continuous
    // block rather than a row of separate chips. Same pitch as before
    // (36px column + 2×6px padding = the old 36 + 12 gap).
    hours: { flexDirection: "row", paddingRight: 12 },
    dayDivider: {
      position: "absolute",
      right: 4,
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: theme.border,
    },
  });
}

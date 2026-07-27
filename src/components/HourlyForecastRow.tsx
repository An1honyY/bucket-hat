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
}

interface DayGroup {
  key: string;
  label: string;
  readings: HourlyReading[];
}

function groupByDay(readings: HourlyReading[], nowIso?: string): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const reading of readings) {
    const key = localDayKey(reading.time);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: dayLabelFor(reading.time, nowIso), readings: [reading] });
    } else {
      last.readings.push(reading);
    }
  }
  return groups;
}

export default function HourlyForecastRow({ readings, nowIso }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const hour12 = useTimeFormatStore((s) => s.timeFormatPreference !== "24h");

  const groups = groupByDay(readings, nowIso);
  if (groups.length === 0) return null;

  return (
    <HorizontalStrip contentContainerStyle={styles.content}>
      {groups.map((group, groupIndex) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.dayLabel} numberOfLines={1}>
            {group.label}
          </Text>
          <View style={styles.hours}>
            {group.readings.map((reading) => {
              const kind = iconKindFor(reading);
              return (
                <RainGauge
                  key={reading.time}
                  hour={formatHourLabel(reading.time, hour12)}
                  rainIntensity={reading.rainIntensity}
                  tempC={reading.tempC}
                  precipMm={reading.precipMm}
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
    hours: { flexDirection: "row", gap: 12, paddingRight: 12 },
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

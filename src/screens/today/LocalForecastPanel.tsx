import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { collectKeyEntries } from "../../lib/outlookDisplay";
import type { DailyReading, HourlyReading } from "../../services/weatherService";
import { conditionColorForIcon } from "../../theme/conditionColor";
import useTheme from "../../theme/useTheme";
import { RADIUS, SPACING , TYPE } from "../../theme/typography";

import ActionIcon from "../../components/ActionIcon";
import HourlyForecastRow from "../../components/HourlyForecastRow";
import WeatherKey from "../../components/WeatherKey";
import WeatherIcon, { hourlyIconKindForCode, WEATHER_ICON_LABEL } from "../../components/WeatherIcon";

// The Today card's "48h & week" panel — the next two days hour by hour, then
// the week as a day-per-row list. Slides in from the right, matching the Plan
// screen's full-outlook panel rather than the bottom sheets used for pickers:
// this is reference material you read, not a prompt for an answer.
//
// One key at the bottom covering both sections, for the same reason the Plan
// panel has one — the glyphs mean the same thing in the hourly strip and the
// day list, and repeating the legend would be most of the panel's height.
//
// A daily row has no is_day flag of its own (it spans both), so the week list
// resolves its icon as daytime — a row summarising a whole day should read as
// that day's character, not as the night that ends it.
function dayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  // Parsed as UTC noon rather than midnight: a bare YYYY-MM-DD is UTC in JS,
  // and formatting that back through a negative-offset locale can land on the
  // previous day. Noon has enough slack to survive any real timezone.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long" });
}

interface Props {
  suburb: string | null;
  hourly: HourlyReading[];
  daily: DailyReading[];
  onClose: () => void;
}

export default function LocalForecastPanel({ suburb, hourly, daily, onClose }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Collected across both sections. The week list can show a glyph the next
  // 48 hours never do — a dry two days followed by a wet Friday — and a key
  // that only read the hourly strip left that day's icon unexplained.
  const { rainBuckets, skyKinds } = collectKeyEntries(hourly);
  for (const day of daily) skyKinds.add(hourlyIconKindForCode(day.weatherCode, true, 0));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropRow}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the forecast" />
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>Forecast</Text>
              {suburb && <Text style={styles.suburbLabel}>{suburb}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel="Close the forecast">
              <ActionIcon kind="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.block}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Next {hourly.length} hours</Text>
                {/* 48 columns in a ~390px panel means about seven are visible
                    and the rest are off to the right. The row always scrolled,
                    but with no indicator it read as clipped and static — which
                    is how it was reported. A themed hint says so on every
                    platform; turning the scrollbar on instead only helps on
                    web, and there it renders as unstyled OS chrome. */}
                <Text style={styles.scrollHint}>swipe across →</Text>
              </View>
              <HourlyForecastRow readings={hourly} />
            </View>

            <View style={styles.block}>
              <Text style={styles.sectionLabel}>This week</Text>
              {daily.map((day, i) => {
                const kind = hourlyIconKindForCode(day.weatherCode, true, 0);
                return (
                  <View
                    key={day.date}
                    style={styles.dayRow}
                    accessible
                    accessibilityLabel={`${dayLabel(day.date, i)}, ${WEATHER_ICON_LABEL[kind]}, high ${Math.round(day.tempMaxC)} degrees, low ${Math.round(day.tempMinC)} degrees${day.precipMm > 0 ? `, ${Math.round(day.precipMm * 10) / 10} millimetres of rain` : ""}`}
                  >
                    <Text style={styles.dayName} numberOfLines={1}>
                      {dayLabel(day.date, i)}
                    </Text>
                    <WeatherIcon kind={kind} size={20} color={conditionColorForIcon(theme, kind)} />
                    {day.precipMm > 0 ? (
                      <Text style={styles.dayPrecip}>{Math.round(day.precipMm * 10) / 10}mm</Text>
                    ) : (
                      <Text style={styles.dayPrecip} />
                    )}
                    <Text style={styles.dayTemps}>
                      <Text style={styles.dayMax}>{Math.round(day.tempMaxC)}°</Text>
                      <Text style={styles.dayMin}> {Math.round(day.tempMinC)}°</Text>
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* The key gets the same treatment, so it reads as one more block
                in the stack rather than loose text after the last card. Its
                own top margin is cancelled — the body's gap already spaces
                it. */}
            <View style={[styles.block, styles.keyBlock]}>
              <WeatherKey rainBuckets={rainBuckets} skyKinds={skyKinds} showsWind />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdropRow: { flex: 1, flexDirection: "row" },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    panel: {
      width: "86%",
      maxWidth: 420,
      backgroundColor: theme.surfaceRaised,
      borderTopLeftRadius: RADIUS.card,
      borderBottomLeftRadius: RADIUS.card,
      paddingTop: SPACING.xl,
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
    suburbLabel: { ...TYPE.caption, color: theme.textSecondary },
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    body: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
    // Each section is its own card rather than three runs of text sharing one
    // background — closer to how the rest of the app groups things, and it
    // gives the 48-hour row a visible edge to scroll against instead of
    // bleeding into the week list below it.
    //
    // Fill *and* border, because the two carry the separation in different
    // themes: in dark, `surface` is a step down from the panel's
    // `surfaceRaised`; in light the two tokens are both #FFFFFF, so without
    // the border the cards would be invisible.
    block: {
      gap: SPACING.sm,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: theme.border,
      padding: SPACING.md,
    },
    // WeatherKey carries its own marginTop for the un-containerized callers
    // (the Plan card stacks it straight under the card); inside a block of its
    // own that becomes a stray gap at the top.
    keyBlock: { paddingTop: 0 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
    sectionLabel: { ...TYPE.micro, fontWeight: "700", color: theme.textSecondary, textTransform: "uppercase" },
    scrollHint: { ...TYPE.micro, color: theme.textSecondary, opacity: 0.8 },
    dayRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 40 },
    dayName: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary, width: 92 },
    dayPrecip: { ...TYPE.micro, fontWeight: "600", color: theme.conditionRain, width: 48 },
    dayTemps: { marginLeft: "auto", ...TYPE.body },
    dayMax: { fontWeight: "700", color: theme.textPrimary },
    dayMin: { color: theme.textSecondary, fontWeight: "500" },
  });
}

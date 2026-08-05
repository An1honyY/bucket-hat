import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";
import useTheme from "../theme/useTheme";
import { hourlyCellPalette, hourlyIconColor } from "../theme/hourlyPalette";
import { formatWindKph, type RainIntensity } from "../lib/weather";
import WeatherIcon, { type WeatherIconKind } from "./WeatherIcon";

// docs/09-design-system.md §9.5 — a vertical "droplet fill": a droplet-
// shaped SVG clipped so a solid fill rises from the bottom to a height
// proportional to the rain-intensity bucket (docs/06-weather-
// classification.md §6), one per hour in a horizontal ScrollView
// (src/components/HourlyOutlook.tsx renders the row). Extended (this pass)
// with a condition icon + temperature above the droplet, so the strip
// carries the same "what's it actually like" detail the leg badges/Right
// now card already do, not just a rain-only reading.
const BUCKET_FILL_PCT: Record<RainIntensity, number> = { none: 0, low: 0.33, med: 0.66, high: 1 };

// A teardrop in a 28x28 box — pointed top, round bottom. All four
// quadrants are cubics that share tangents at the join points, so the
// outline reads as one continuous curve; the previous version spliced a
// circular arc onto two curves, and the two visible seams where they met
// were what made the bottom look faceted at this size.
const DROPLET_PATH = [
  "M14,2.2",
  "C14,2.2 22.4,12.2 23.4,17.4", // upper right flank
  "C24.5,23.1 20.1,27.6 14,27.6", // lower right, into the base
  "C7.9,27.6 3.5,23.1 4.6,17.4", // lower left, out of the base
  "C5.6,12.2 14,2.2 14,2.2",
  "Z",
].join(" ");

// "low" reads as a lightened tint of conditionRain (not a separate hue —
// still unmistakably "rain", just visibly less of it), "med" the full
// conditionRain, "high" the deeper conditionHeavy. A flat opacity on the
// fill (rather than a separate light/dark hex per theme) keeps this in
// sync with conditionRain automatically if that token ever changes.
const BUCKET_FILL_OPACITY: Record<RainIntensity, number> = { none: 1, low: 0.45, med: 1, high: 1 };

// One decimal below 10mm, none above — 0.4mm and 12mm are both readable, but
// "12.3mm" is more precision than an hourly forecast actually carries and
// makes the column wider than the droplet it sits under.
function formatMm(mm: number): string {
  return mm < 10 ? `${Math.round(mm * 10) / 10}mm` : `${Math.round(mm)}mm`;
}

interface Props {
  hour: string; // formatted label, e.g. "3pm"
  rainIntensity: RainIntensity;
  tempC?: number;
  conditionKind?: WeatherIconKind;
  conditionLabel?: string;
  // Condition-derived icon colour (see theme/conditionColor.ts). Optional so
  // the key's swatches can stay neutral; without it the icon falls back to the
  // flat textSecondary every strip used to draw.
  conditionColor?: string;
  // Rendered only when > 0 — a 12-hour row of "0mm" is noise, and the empty
  // droplet already says "dry" on its own.
  precipMm?: number;
  // Wind speed for the hour, in km/h. Unlike precipMm this renders at every
  // value including 0: "how windy is it" is a question with a meaningful
  // answer on a still day ("not at all"), whereas "0mm of rain" is just a
  // wordier empty droplet. Omitted entirely (not zero) by the key's swatches,
  // which have no reading behind them.
  windKph?: number;
  // §9.5 (2026-08-03) — the strip breaks into day and night blocks at
  // sunrise and sunset, the two times that actually matter to someone
  // deciding when to head out. *Both* get a wash: leaving daylight hours
  // transparent meant they showed the card underneath, which in dark mode
  // is the darkest thing on screen — the exact opposite of what daylight
  // should look like. The run flags round only the outer corners, so
  // consecutive hours read as one block rather than a row of chips.
  isNight?: boolean;
  runStart?: boolean;
  runEnd?: boolean;
  // Absorbs the row's column gap into the cell itself, so a tinted night run
  // is continuous instead of striped. Only the hourly row wants this; the
  // key's swatches and the compact Plan strip keep the bare 36px column.
  padded?: boolean;
  // Legend swatch: just the droplet, sized to sit level with the key's 16px
  // condition icons. A full-size gauge is a 36×40 column built to head a
  // stack of readings, so in the key it towered over the sky row beside it
  // and made the three rows visibly uneven — the thing this prop exists to
  // fix. Same droplet and the same fill maths, so a swatch can never drift
  // from the column it explains.
  swatch?: boolean;
}

// Matches WeatherKey's condition icons; the droplet is drawn a touch larger
// because its silhouette is narrower than a sun or cloud at the same box size.
const SWATCH_SIZE = 18;
const FULL_SIZE = 28;

export default function RainGauge({
  hour,
  rainIntensity,
  tempC,
  conditionKind,
  conditionLabel,
  conditionColor,
  precipMm,
  windKph,
  isNight = false,
  runStart = false,
  runEnd = false,
  padded = false,
  swatch = false,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  // The clip path used to be keyed on the hour label ("3pm"), which is not
  // unique: the Today card, its 48-hour panel and both Plan outlooks can
  // have a "3pm" column mounted at the same time, and SVG ids are global to
  // the document. Every duplicate resolved to whichever definition rendered
  // first, so the fill was clipped to the wrong droplet — or to none at
  // all, spilling a rectangle across the column. useId() is unique per
  // component instance, which is exactly the scope this needs.
  const clipId = `droplet-${useId().replace(/:/g, "")}`;
  // A padded cell is one in a real day/night strip, so it commits to a light
  // or dark surface and takes the matching token set — see hourlyPalette.ts
  // for why a mid-tone can't work for both halves of the condition palette.
  // Everything else (the key's swatches, the compact Plan row) sits on the
  // card and keeps the active theme.
  const cell = padded ? hourlyCellPalette(isNight) : undefined;
  const tokens = cell?.tokens ?? theme;
  const fillPct = BUCKET_FILL_PCT[rainIntensity];
  const fillColor = rainIntensity === "high" ? tokens.conditionHeavy : tokens.conditionRain;
  const fillOpacity = BUCKET_FILL_OPACITY[rainIntensity];
  const fillHeight = 28 * fillPct;
  const fillY = 28 - fillHeight;

  const showMm = precipMm !== undefined && precipMm > 0;
  const rainDescription =
    rainIntensity === "none"
      ? "no rain expected"
      : showMm
        ? `${rainIntensity} rain expected, ${formatMm(precipMm)}`
        : `${rainIntensity} rain expected`;
  // §9.6 — the tint is never the only signal that an hour is after dark.
  const accessibilityLabel = [
    hour,
    isNight ? "after dark" : undefined,
    conditionLabel,
    tempC !== undefined ? `${Math.round(tempC)} degrees` : undefined,
    rainDescription,
    // Spoken in full — "18 km/h" is read as a unit, where the visual column
    // can lean on the glyph beside it to say "wind".
    windKph !== undefined ? `wind ${formatWindKph(windKph)}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View
      style={[
        styles.container,
        swatch && styles.swatch,
        padded && styles.padded,
        cell && { backgroundColor: cell.bg },
        padded && runStart && styles.runStart,
        padded && runEnd && styles.runEnd,
      ]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {conditionKind && (
        <WeatherIcon
          kind={conditionKind}
          size={16}
          // In a strip the colour is re-resolved against the cell's own
          // surface; the caller's `conditionColor` was computed against the
          // card, which is the wrong backdrop by definition here.
          color={cell ? hourlyIconColor(cell, conditionKind) : (conditionColor ?? theme.textSecondary)}
        />
      )}
      {/* The viewBox stays 28-wide whatever the rendered size, so the droplet
          path and the fill rectangle below keep one coordinate space and a
          swatch is a true scale model of the column it explains. */}
      <Svg width={swatch ? SWATCH_SIZE : FULL_SIZE} height={swatch ? SWATCH_SIZE : FULL_SIZE} viewBox="0 0 28 28">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={DROPLET_PATH} />
          </ClipPath>
        </Defs>
        {/* The hollow. `border` is a hairline colour: against a day cell it
            was all but invisible, which made a dry hour look like an empty
            column rather than an empty droplet. */}
        <Path d={DROPLET_PATH} fill={cell ? cell.dropletEmpty : theme.border} />
        {fillPct > 0 && (
          <Rect
            x={0}
            y={fillY}
            width={28}
            height={fillHeight}
            fill={fillColor}
            fillOpacity={fillOpacity}
            clipPath={`url(#${clipId})`}
          />
        )}
      </Svg>
      {/* A dry hour still renders this line, so every column keeps the same
          height and the temperatures below stay on one baseline — but an
          empty string is not a line: it has no glyphs, so the Text collapses
          to zero height and the day/night blocks behind them came out
          ragged. A space is a glyph. Skipped entirely when the caller passes
          no precipMm at all — that's the key's swatches, which have no
          reading behind them and shouldn't gain a blank line. */}
      {precipMm !== undefined && (
        <Text style={[styles.mm, cell && { color: cell.tokens.conditionRain }]}>{showMm ? formatMm(precipMm) : " "}</Text>
      )}
      {tempC !== undefined && (
        <Text style={[styles.temp, cell && { color: cell.text }]}>{Math.round(tempC)}°</Text>
      )}
      {/* The glyph carries the unit so the number doesn't have to: "km/h"
          spelled out is wider than the 36px column and would force either a
          wrap or a smaller size than the millimetres above it. The wind icon
          is already the strip's vocabulary for "windy" (it's one of the sky
          kinds), so it needs no separate introduction — the key names it. */}
      {windKph !== undefined && (
        <View style={styles.windRow}>
          <WeatherIcon kind="wind" size={9} color={cell ? cell.muted : theme.textSecondary} />
          <Text style={[styles.wind, cell && { color: cell.muted }]}>{Math.round(windKph)}</Text>
        </View>
      )}
      <Text style={[styles.label, cell && { color: cell.muted }]}>{hour}</Text>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // 36, not 32 — wide enough for "0.4mm" without wrapping.
    container: { width: 36, alignItems: "center", gap: 3, paddingVertical: 6 },
    // No column width and no vertical padding: in the key this is one inline
    // item in a wrapped row, not a column heading a stack of readings.
    swatch: { width: SWATCH_SIZE, gap: 0, paddingVertical: 0 },
    padded: { width: 48, paddingHorizontal: 6 },
    runStart: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
    runEnd: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
    mm: { fontSize: 10, color: theme.conditionRain, fontWeight: "600" },
    // Temperature is the one number people scan a forecast row for, so it
    // outranks the hour beneath it — previously both were 11px and the row
    // read as an undifferentiated grid of small text.
    temp: { fontSize: 13, fontWeight: "700", color: theme.textPrimary },
    // Quieter than the temperature and the millimetres: wind is context for
    // the hour, not the number anyone scans the row for.
    windRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    wind: { fontSize: 10, color: theme.textSecondary },
    label: { fontSize: 10, color: theme.textSecondary },
  });
}

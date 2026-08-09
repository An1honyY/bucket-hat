// docs/09-design-system.md §9.1 — dark and light token sets, same shape.
// Components must never import these directly; read colors via useTheme()
// (src/theme/useTheme.ts) so theme switching doesn't require touching every
// screen. "Paua Pop" palette (§9.1, 2026-07-21 redesign) — see DECISIONS.md
// for the round-by-round design review this came out of.
import type { WeatherMood } from "../lib/weather";

export type ThemeTokens = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accentTransit: string;
  accentWalk: string;
  accentDrive: string;
  conditionDry: string;
  conditionLight: string;
  conditionRain: string;
  conditionHeavy: string;
  conditionStorm: string;
  acBadge: string;
  uvBadge: string;
  feedbackPositive: string;
  confidenceLow: string;
  favoriteStar: string;
  annotationPin: string;
  // Not in §9.1's table but needed consistently across screens that were
  // previously hardcoded: a destructive-action color and a raised border
  // used only in the light theme's surfaceRaised outline (§9.1's own note).
  danger: string;
  surfaceRaisedBorder: string;
  // §9.1 (2026-07-21) — the color a `cardElevationStyle()` shadow should
  // render in; distinct per theme since a light-mode shadow needs far less
  // opacity than a dark-mode one to read as "lifted" rather than "smudged."
  shadowColor: string;
  // §9.1 (2026-07-23) — a softly branded header/chrome wash + the tint used
  // by the subtle screen background pattern, so light mode reads as coloured
  // rather than plain black-on-white. In dark mode both sit close to the
  // existing surface tokens (the navy already provides depth). Both are
  // mood-tracked (§9.1.3): they share an edge with `bg`/`surface`, so a
  // fixed value here reads as a mismatched strip once the mood shifts.
  headerBg: string;
  patternTint: string;
  // Set once per base theme (dark/light) and left untouched by weather-mood
  // overrides (useWeatherTheme.ts) — cardElevationStyle() needs a stable
  // way to pick shadow opacity that survives a mood-merged token object,
  // where `theme === lightTheme` identity checks no longer hold.
  isLight: boolean;
};

export const darkTheme: ThemeTokens = {
  bg: "#171B36",
  surface: "#1F2447",
  surfaceRaised: "#262B52",
  border: "#383D6E",
  textPrimary: "#F5F3FF",
  textSecondary: "#A8A4CC",
  accentTransit: "#1FE0C4",
  accentWalk: "#FF4D8D",
  accentDrive: "#8A5CFF",
  conditionDry: "#6B7094",
  conditionLight: "#FFD23F",
  conditionRain: "#4FA7E0",
  conditionHeavy: "#3B6FD6",
  conditionStorm: "#B45CFF",
  acBadge: "#4FC8E8",
  uvBadge: "#FFD23F",
  feedbackPositive: "#4FBF7F",
  confidenceLow: "#A8A4CC",
  favoriteStar: "#FFD23F",
  annotationPin: "#C86BFF",
  danger: "#E0685A",
  surfaceRaisedBorder: "transparent",
  shadowColor: "#000000",
  headerBg: "#1D2242",
  patternTint: "#8A5CFF",
  isLight: false,
};

export const lightTheme: ThemeTokens = {
  bg: "#FAF7FC",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  border: "#E4DFF0",
  textPrimary: "#1C1930",
  textSecondary: "#6B6584",
  accentTransit: "#0E9A87",
  accentWalk: "#D6266E",
  accentDrive: "#6636E0",
  conditionDry: "#6B6584",
  conditionLight: "#C99515",
  conditionRain: "#2E7CC4",
  conditionHeavy: "#2953A8",
  conditionStorm: "#9438DB",
  acBadge: "#1583A3",
  uvBadge: "#C99515",
  feedbackPositive: "#3F9A5C",
  confidenceLow: "#6B6584",
  favoriteStar: "#C99515",
  annotationPin: "#7A2FC4",
  danger: "#C0392B",
  surfaceRaisedBorder: "#E4DFF0",
  shadowColor: "#28204A",
  headerBg: "#FBEAF2",
  patternTint: "#D6266E",
  isLight: true,
};

// §9.1 (2026-08-09) — a translucent wash of a token colour, for surfaces that
// need to read as "the accent, quietly" rather than as the accent itself: a
// tonal button, a selected chip, an accent-tinted strip.
//
// Derived at call time from whatever colour is passed rather than stored as
// its own token, deliberately: `accentWalk` is mood-tracked (moodOverrides
// below), so a fixed soft-accent token would keep the base pink while the
// accent beside it turned blue on a cold day. Deriving keeps the two in step
// by construction.
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// §9.1/§9.6 (2026-08-09) — the label colour to use *on* a `withAlpha` wash of
// the same accent. Not the accent itself: measured against the composited
// chip background, `accentWalk` gives 4.02:1 in dark and 3.89:1 in light at
// the fills we use — both under WCAG AA's 4.5:1 for text this size. Light
// mode's accent only reaches 4.81:1 on *pure white*, so any tint sinks it.
//
// Derived rather than tokenised for the same reason `withAlpha` is: the
// accent is mood-tracked, so a fixed "on-tonal pink" would be stranded on a
// blue chip during a cold snap. The two shift amounts are verified against
// all six accent/mood/theme combinations (5.2:1 to 8.7:1) — if you change
// them, re-measure rather than eyeball it.
const ON_TONAL_LIGHTEN = 0.42;
const ON_TONAL_DARKEN = 0.3;

export function onTonal(hex: string, isLight: boolean): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  if (channels.some(Number.isNaN)) return hex;
  const target = isLight ? 0 : 255;
  const amount = isLight ? ON_TONAL_DARKEN : ON_TONAL_LIGHTEN;
  const [r, g, b] = channels.map((c) => Math.round(c + (target - c) * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Fill opacity for a tonal surface. Dark themes need more to read at all. */
export function tonalFillAlpha(isLight: boolean): number {
  return isLight ? 0.12 : 0.18;
}

// §6/9.1 — maps classifyWeather()'s severity (0-4) to the active theme's
// condition* tokens via a lookup array, theme-agnostic (indexes into
// whichever token object useTheme() currently returns).
export function conditionColorForSeverity(theme: ThemeTokens, severity: number): string {
  const lookup = [theme.conditionDry, theme.conditionLight, theme.conditionRain, theme.conditionHeavy, theme.conditionStorm];
  return lookup[severity] ?? theme.conditionDry;
}

// §9.0 (2026-07-21 redesign) — replaces the original "no drop shadows" rule:
// content-box components (the "Right now" card, journey cards, the gear
// recommendation card) now lift off the background with a shadow instead of
// a hairline border. One shared helper so every card gets the same
// elevation rather than each screen inventing its own shadow values;
// `elevation` covers Android (RN's shadow* props are iOS-only).
export function cardElevationStyle(theme: ThemeTokens) {
  return {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.isLight ? 0.1 : 0.35,
    shadowRadius: 14,
    elevation: 6,
  } as const;
}

// §9.1 (2026-07-21) — Today tab weather-reactive tint (useWeatherTheme.ts).
// Only the tokens that actually change with mood are listed per variant;
// everything else (condition*, accent hues other than accentWalk, badges)
// stays fixed so per-leg dots/badges keep their existing, unrelated meaning
// regardless of the screen's overall mood. "mild" has no entry — it *is*
// darkTheme/lightTheme unchanged, so useWeatherTheme() skips merging
// anything for it rather than duplicating the base values here.
type MoodOverride = Partial<
  Pick<
    ThemeTokens,
    | "bg"
    | "surface"
    | "surfaceRaised"
    | "border"
    | "textPrimary"
    | "textSecondary"
    | "accentWalk"
    | "patternTint"
    // Chrome, not content — but it sits directly against `bg` and `surface`,
    // so leaving it on the base palette left a violet-navy header stranded
    // above a blue screen on a cold day (and above a brown one when warm).
    // Anything that shares an edge with a mood-tinted surface has to move
    // with it.
    | "headerBg"
    | "surfaceRaisedBorder"
  >
>;

export const moodOverrides: Record<Exclude<WeatherMood, "mild">, { dark: MoodOverride; light: MoodOverride }> = {
  cold: {
    dark: {
      bg: "#10192E",
      surface: "#16233E",
      surfaceRaised: "#1C2C4A",
      border: "#2A3D63",
      textPrimary: "#EAF6FF",
      textSecondary: "#8FB3D6",
      accentWalk: "#2FB8E8",
      // The sky takes the mood's own accent, so the wash behind the cards and
      // the accent on them are the same hue rather than two colours arguing.
      patternTint: "#2FB8E8",
      // Sits between this mood's bg and surface, exactly as the base
      // headerBg sits between the base pair.
      headerBg: "#142138",
    },
    light: {
      bg: "#EFF6FB",
      surface: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      border: "#D3E4F0",
      textPrimary: "#10202E",
      textSecondary: "#57748A",
      accentWalk: "#0E86B0",
      patternTint: "#0E86B0",
      // Light mode's header is a *tinted wash*, more saturated than bg, not
      // a midpoint — the base pink becomes this mood's blue.
      headerBg: "#E2EFF8",
      surfaceRaisedBorder: "#D3E4F0",
    },
  },
  warm: {
    dark: {
      bg: "#241A12",
      surface: "#33241A",
      surfaceRaised: "#402D20",
      border: "#5C4530",
      textPrimary: "#FFF6EC",
      textSecondary: "#D9B99A",
      accentWalk: "#FFD23F",
      patternTint: "#FFD23F",
      headerBg: "#2C1F16",
    },
    light: {
      bg: "#FBF3EA",
      surface: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      border: "#EEDCC4",
      textPrimary: "#2E2013",
      textSecondary: "#8A6F52",
      accentWalk: "#B8790E",
      patternTint: "#B8790E",
      headerBg: "#F7E6D0",
      surfaceRaisedBorder: "#EEDCC4",
    },
  },
};

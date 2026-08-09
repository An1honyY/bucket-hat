import { darkTheme, lightTheme, moodOverrides, onTonal, tonalFillAlpha, withAlpha } from "./tokens";

// §9.6 — a tonal chip/button puts an accent-derived label on a wash of that
// same accent, which is the easiest place in the app to accidentally ship
// unreadable text: both colours move together, so a change that looks fine
// in one theme can quietly fail in the other. The raw accent *does* fail —
// 4.02:1 in dark, 3.89:1 in light — which is why onTonal() exists.
//
// Pinned across every accent the app can actually show, because accentWalk is
// mood-tracked: a cold snap turns it blue and a warm day gold, and each has
// its own luminance.
const AA_NORMAL_TEXT = 4.5;

function parseColor(value: string): [number, number, number] {
  const rgb = value.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(",").map((n) => parseFloat(n));
    return [parts[0], parts[1], parts[2]];
  }
  const hex = value.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function alphaOf(value: string): number {
  const rgba = value.match(/rgba\(([^)]+)\)/);
  if (!rgba) return 1;
  const parts = rgba[1].split(",").map((n) => parseFloat(n));
  return parts[3] ?? 1;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrast(fg: string, bg: string): number {
  const a = relativeLuminance(parseColor(fg)) + 0.05;
  const b = relativeLuminance(parseColor(bg)) + 0.05;
  return Math.max(a, b) / Math.min(a, b);
}

/** The wash composited over the page background it actually sits on. */
function compositedChip(accent: string, pageBg: string, isLight: boolean): string {
  const wash = withAlpha(accent, tonalFillAlpha(isLight));
  const alpha = alphaOf(wash);
  const [fr, fg, fb] = parseColor(wash);
  const [br, bg, bb] = parseColor(pageBg);
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  return `rgb(${mix(fr, br)}, ${mix(fg, bg)}, ${mix(fb, bb)})`;
}

const cases: { name: string; accent: string; bg: string; isLight: boolean }[] = [
  { name: "dark / mild", accent: darkTheme.accentWalk, bg: darkTheme.bg, isLight: false },
  { name: "light / mild", accent: lightTheme.accentWalk, bg: lightTheme.bg, isLight: true },
  {
    name: "dark / cold",
    accent: moodOverrides.cold.dark.accentWalk!,
    bg: moodOverrides.cold.dark.bg!,
    isLight: false,
  },
  {
    name: "light / cold",
    accent: moodOverrides.cold.light.accentWalk!,
    bg: moodOverrides.cold.light.bg!,
    isLight: true,
  },
  {
    name: "dark / warm",
    accent: moodOverrides.warm.dark.accentWalk!,
    bg: moodOverrides.warm.dark.bg!,
    isLight: false,
  },
  {
    name: "light / warm",
    accent: moodOverrides.warm.light.accentWalk!,
    bg: moodOverrides.warm.light.bg!,
    isLight: true,
  },
];

describe("tonal surfaces stay readable", () => {
  it.each(cases)("$name clears AA for normal text", ({ accent, bg, isLight }) => {
    const label = onTonal(accent, isLight);
    const chip = compositedChip(accent, bg, isLight);
    expect(contrast(label, chip)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("is a real shift, not a pass-through of the accent", () => {
    // Guards the failure mode where someone "simplifies" onTonal back to
    // returning its input: the cases above would still be computed, just
    // against the colour that already failed.
    for (const { accent, isLight } of cases) {
      expect(onTonal(accent, isLight)).not.toBe(accent);
    }
  });

  // The "Right now" card's notable-fact chip (a diverging feels-like, or wind
  // at/over HIGH_WIND_KPH) is a second tonal pairing: `conditionLight` on
  // `surfaceRaised` rather than `accentWalk` on `bg`. Different hue, different
  // backdrop, so it earns its own check rather than inheriting the one above.
  const notableTones = [
    { tone: "conditionLight" as const, why: "a diverging feels-like, or notable wind" },
    { tone: "uvBadge" as const, why: "the UV badge, and the wash reminder" },
  ];
  const surfaces = [
    { name: "dark", theme: darkTheme },
    { name: "light", theme: lightTheme },
  ];
  it.each(
    surfaces.flatMap(({ name, theme }) => notableTones.map(({ tone, why }) => ({ name, theme, tone, why })))
  )("$name: $why clears AA on the raised card", ({ theme, tone }) => {
    const label = onTonal(theme[tone], theme.isLight);
    const chip = compositedChip(theme[tone], theme.surfaceRaised, theme.isLight);
    expect(contrast(label, chip)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("the raw accent is what actually fails, in both base themes", () => {
    // The measurement this whole helper exists for. Deliberately only the
    // mild/base pair: the warm-mood gold happens to clear AA on its own, so
    // asserting "every accent fails" would be false — and a test that
    // overstates the problem is the kind that gets deleted rather than fixed.
    for (const theme of [darkTheme, lightTheme]) {
      const chip = compositedChip(theme.accentWalk, theme.bg, theme.isLight);
      expect(contrast(theme.accentWalk, chip)).toBeLessThan(AA_NORMAL_TEXT);
    }
  });
});

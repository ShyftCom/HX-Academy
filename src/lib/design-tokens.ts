/**
 * OBSIDIAN FLUX — design tokens (TypeScript mirror)
 * ============================================================
 * The canonical values live in `src/app/globals.css` as CSS custom
 * properties. This module mirrors them for the places CSS cannot
 * reach: recharts series/axis colours, canvas, inline SVG, and
 * chart gradients — anything rendered by JS that needs a literal.
 *
 * Rule: never hardcode a hex in a component. Import from here, or
 * use `var(--ob-*)` in CSS/className. Keep this file in sync with
 * the `:root` block of globals.css.
 */

/** Tonal surface ladder — elevation is communicated by lightening, not shadow. */
export const surface = {
  /** Level -1 — deepest well (page gutters, inset areas) */
  lowest: "#0e0e0e",
  /** Level 0 — application background */
  base: "#131313",
  /** Level 1 — cards, sidebar */
  low: "#1c1b1b",
  /** Level 1.5 — nested panels, table headers */
  container: "#201f1f",
  /** Level 2 — popovers, hover states on containers */
  high: "#2a2a2a",
  /** Level 3 — active/pressed, selected rows */
  highest: "#353534",
  /** Level 4 — rarely used, top of ladder */
  bright: "#393939",
} as const;

export const text = {
  /** Primary reading colour */
  primary: "#e5e2e1",
  /** Secondary / supporting copy */
  secondary: "#c1c6d7",
  /** Muted metadata, placeholders, disabled */
  muted: "#8b90a0",
  /** On a filled primary surface */
  onPrimary: "#ffffff",
} as const;

export const brand = {
  /** Electric blue — primary action, exclusively for interactive elements */
  primary: "#0070f3",
  primaryHover: "#1a84ff",
  primaryActive: "#0059c5",
  /** Light blue — primary text/icon on dark, chart series highlight */
  primaryLight: "#aec6ff",
  /** Cyan tertiary — accents, success, secondary chart series */
  accent: "#3cd7ff",
  accentDim: "#00819c",
} as const;

export const status = {
  success: "#3cd7ff",
  successDim: "#004e5f",
  warning: "#f5b544",
  warningDim: "#4a3413",
  error: "#ffb4ab",
  errorDim: "#93000a",
  info: "#aec6ff",
  neutral: "#8b90a0",
} as const;

export const line = {
  /** Hairline — 1px silver at 10% (DESIGN.md Level 1 border) */
  hairline: "rgba(229,226,225,0.10)",
  /** Stronger divider — 20% */
  strong: "rgba(229,226,225,0.20)",
  /** Named outline tokens from the palette */
  outline: "#8b90a0",
  outlineVariant: "#414754",
} as const;

/** Corner radii — "Soft" shape language, no pills on structural elements. */
export const radius = {
  /** Buttons, inputs, badges */
  control: "4px",
  /** Cards, sections, tables */
  container: "8px",
  /** Modals, hero cards */
  feature: "12px",
} as const;

/** 4px base rhythm. */
export const space = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
  gutter: 24,
  marginMobile: 16,
  marginDesktop: 40,
} as const;

/**
 * Chart palette — ordered. Series 1 is always electric blue; cyan is the
 * natural second. Kept to six so dashboards never turn into a rainbow.
 * `dataviz`-style rule: distinguish by hue *and* lightness so the set
 * survives greyscale printing and the common colour-vision deficiencies.
 */
export const chartSeries = [
  brand.primary,      // #0070f3
  brand.accent,       // #3cd7ff
  brand.primaryLight, // #aec6ff
  "#7a5cff",          // violet — still in the blue family
  status.warning,     // #f5b544
  status.error,       // #ffb4ab
] as const;

/** Recharts axis/grid/tooltip theming — spread into chart props. */
export const chartTheme = {
  grid: "rgba(229,226,225,0.07)",
  axis: "#8b90a0",
  axisLine: "rgba(229,226,225,0.10)",
  tooltipBg: "rgba(32,31,31,0.92)",
  tooltipBorder: "rgba(229,226,225,0.14)",
  tooltipText: "#e5e2e1",
  tickFontSize: 11,
} as const;

export const fontFamily = {
  sans: "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace",
} as const;

const tokens = { surface, text, brand, status, line, radius, space, chartSeries, chartTheme, fontFamily };
export default tokens;

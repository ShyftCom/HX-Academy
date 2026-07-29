import { Barlow_Condensed, Oswald, Roboto_Condensed, Inter, Manrope, Montserrat } from "next/font/google";

// Curated, pre-loaded font set for the Showcase Website typography settings
// (Super Admin picks one display + one body font; see ThemeVars.tsx for how
// the pick is applied). Loaded via next/font so files are self-hosted and
// subset at build time — no runtime <link> requests, no layout shift.

export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

export const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

export const fsaInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fsa-inter",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const DISPLAY_FONT_OPTIONS = {
  "Barlow Condensed": "var(--font-barlow-condensed)",
  Oswald: "var(--font-oswald)",
  "Roboto Condensed": "var(--font-roboto-condensed)",
} as const;

export const BODY_FONT_OPTIONS = {
  Inter: "var(--font-fsa-inter)",
  Manrope: "var(--font-manrope)",
  Montserrat: "var(--font-montserrat)",
} as const;

export type DisplayFontName = keyof typeof DISPLAY_FONT_OPTIONS;
export type BodyFontName = keyof typeof BODY_FONT_OPTIONS;

// Applied together on the [locale] layout wrapper so every font's CSS
// variable is defined; ThemeVars.tsx then points --font-fsa-display /
// --font-fsa-body at whichever one is selected in Super Admin.
export const allFontVariables = [
  barlowCondensed.variable,
  oswald.variable,
  robotoCondensed.variable,
  fsaInter.variable,
  manrope.variable,
  montserrat.variable,
].join(" ");

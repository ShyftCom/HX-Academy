import { getSettings } from "@/lib/settings";
import { DISPLAY_FONT_OPTIONS, BODY_FONT_OPTIONS, type DisplayFontName, type BodyFontName } from "./fonts";

const KEYS = [
  "website_color_navy_900",
  "website_color_navy_800",
  "website_color_sky",
  "website_color_heading_blue",
  "website_color_pale_bg",
  "website_color_text",
  "website_color_text_muted",
  "website_color_border",
  "website_color_success",
  "website_color_error",
  "website_font_display",
  "website_font_body",
  "website_heading_weight",
  "website_heading_uppercase",
] as const;

// Defaults mirror the @theme fallbacks in tokens.css and the spec's initial palette —
// kept here too so Super Admin edits and the CSS build-time defaults never silently diverge.
const DEFAULTS: Record<(typeof KEYS)[number], string> = {
  website_color_navy_900: "#1B1315",
  website_color_navy_800: "#3B1E22",
  website_color_sky: "#A32F33",
  website_color_heading_blue: "#C0453F",
  website_color_pale_bg: "#F8F2F2",
  website_color_text: "#1F1719",
  website_color_text_muted: "#6E6164",
  website_color_border: "#E8DDDD",
  website_color_success: "#157347",
  website_color_error: "#B3261E",
  website_font_display: "Barlow Condensed",
  website_font_body: "Inter",
  website_heading_weight: "700",
  website_heading_uppercase: "false",
};

/**
 * Server component: reads admin-editable Showcase Website theme Settings and
 * emits a <style> block scoped to `.fsa-site`, overriding the tokens.css
 * @theme fallbacks at runtime. Never touches `:root` globally and never
 * references the admin's --primary-red/--accent variables (src/app/layout.tsx)
 * — the two theming systems are intentionally independent.
 */
export async function ThemeVars() {
  let s: Record<string, string> = {};
  try {
    s = await getSettings([...KEYS]);
  } catch {
    // DB unavailable — fall back to DEFAULTS below, same defensive pattern as RootLayout's brandCss.
  }
  const v = (key: (typeof KEYS)[number]) => s[key] || DEFAULTS[key];

  const displayFont = DISPLAY_FONT_OPTIONS[v("website_font_display") as DisplayFontName] ?? DISPLAY_FONT_OPTIONS["Barlow Condensed"];
  const bodyFont = BODY_FONT_OPTIONS[v("website_font_body") as BodyFontName] ?? BODY_FONT_OPTIONS.Inter;
  const uppercase = v("website_heading_uppercase") === "true";

  const css = `
    .fsa-site {
      --color-fsa-navy-900: ${v("website_color_navy_900")};
      --color-fsa-navy-800: ${v("website_color_navy_800")};
      --color-fsa-sky: ${v("website_color_sky")};
      --color-fsa-heading-blue: ${v("website_color_heading_blue")};
      --color-fsa-pale-bg: ${v("website_color_pale_bg")};
      --color-fsa-text: ${v("website_color_text")};
      --color-fsa-text-muted: ${v("website_color_text_muted")};
      --color-fsa-border: ${v("website_color_border")};
      --color-fsa-success: ${v("website_color_success")};
      --color-fsa-error: ${v("website_color_error")};
      --font-fsa-display: ${displayFont}, "Arial Narrow", sans-serif;
      --font-fsa-body: ${bodyFont}, ui-sans-serif, system-ui, sans-serif;
      --fsa-heading-weight: ${v("website_heading_weight")};
    }
    .fsa-site :where(h1, h2, h3, h4, h5, h6) {
      font-weight: var(--fsa-heading-weight);
      ${uppercase ? "text-transform: uppercase;" : ""}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

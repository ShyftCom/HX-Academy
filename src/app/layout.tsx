import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getSettings } from "@/lib/settings";
import { derivePrimaryTokens } from "@/lib/color";
import { dirFor } from "@/i18n/routing";
import { LOCALE_HEADER } from "@/proxy";

// OBSIDIAN FLUX typography. Geist carries the whole interface — its tabular
// lining figures are what keep dashboard columns aligned without per-cell
// classes. JetBrains Mono is the label face: statuses, IDs, codes, timestamps.
// Both are self-hosted and subset by next/font, so there is no runtime request
// to fonts.googleapis.com and no layout shift on first paint.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Read from the Setting table rather than hardcoding, so renaming the academy
// in Super Admin propagates to the document title. Falls back to the canonical
// name if the DB is unavailable. Locale pages override this with their own
// generateMetadata.
export async function generateMetadata(): Promise<Metadata> {
  let academyName = "Football Skills Academy";
  try {
    const s = await getSettings(["academy_name"]);
    if (s.academy_name) academyName = s.academy_name;
  } catch {
    // DB unavailable — keep the fallback.
  }
  // Deliberately no description here. This layout also wraps the admin, and the
  // public [locale] pages each supply their own localised title + description
  // via generateMetadata — an English fallback sentence at the root would leak
  // into any public page that forgot to override it.
  return {
    title: academyName,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://footballskillsacademy.com"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by src/proxy.ts on public-site requests only. Admin, auth and player
  // routes are not matched by the proxy, so they keep the French LTR default
  // they have always had.
  const locale = (await headers()).get(LOCALE_HEADER) ?? "fr";
  const dir = dirFor(locale);

  // Admin-editable branding still overrides the palette, but it now feeds the
  // Obsidian token names rather than the retired --primary-red / --card pair.
  // Defaults are the Obsidian Flux values, so an academy that never opened
  // Branding gets the designed look rather than an accidental legacy red.
  let brandCss = "";
  try {
    const s = await getSettings(["primary_color", "secondary_color", "dark_bg_color", "card_dark_color"]);
    const primary   = s.primary_color   || "#0070f3";
    const secondary = s.secondary_color || "#0059c5";
    const darkBg    = s.dark_bg_color   || "#131313";
    const cardDark  = s.card_dark_color || "#1c1b1b";

    // Hover and pressed are derived from the primary rather than read from
    // `secondary_color`.
    //
    // Branding presents those as two independent colour pickers, so nothing
    // keeps them related: production ran primary=#ae1e1e (red) with
    // secondary=#0f172a (near-black slate), and every primary button turned
    // almost black on hover. One setting was also feeding *both* the hover and
    // the pressed state, so they were indistinguishable regardless.
    //
    // Deriving guarantees the states are relatives of whatever brand colour an
    // academy picks. `secondary_color` still drives --accent-hover, which is
    // what the legacy (non-Obsidian) call sites read.
    //
    // *Every* primary-derived token is covered, not just hover/active. An
    // earlier pass derived only those two and left --ob-primary-light,
    // --ob-primary-soft and --ob-primary-glow at their hardcoded blues, so the
    // red-branded production install rendered a blue active sidebar item, blue
    // soft fills and a blue focus glow. The tint is contrast-checked against
    // the card surface it actually sits on, since it is used as text.
    const { hover, active, light, soft, glow } = derivePrimaryTokens(primary, cardDark);

    // The brand colour is theme-agnostic. The two surface settings are not —
    // Branding labels them "Dark Mode Background" and "Dark Mode Card Surface"
    // — so they are scoped to :not(.light). Emitting them on plain `:root`
    // pinned the whole app to charcoal: this <style> is injected after
    // globals.css, and `:root` and `.light` have identical specificity, so
    // source order let it beat the light theme and the toggle did nothing
    // below the top bar.
    brandCss =
      `:root{--ob-primary:${primary};--ob-primary-hover:${hover};` +
      `--ob-primary-active:${active};--ob-primary-light:${light};` +
      `--ob-primary-soft:${soft};--ob-primary-glow:${glow};` +
      `--accent:${primary};--accent-hover:${secondary};--ring:${primary};}` +
      `:root:not(.light){--ob-surface-base:${darkBg};--ob-surface-low:${cardDark};}`;
  } catch {
    // DB unavailable at build/dev time — fall back to globals.css defaults.
  }

  return (
    // The font variable classes go on <html>, not <body>. globals.css declares
    // `--ob-font-sans: var(--font-geist), …` inside `:root`, and a var() is
    // resolved in the scope of the element that *declares* it — so with the
    // classes on <body>, --font-geist was undefined at :root, the whole
    // declaration was invalid, and the UI silently fell back to system-ui.
    <html
      lang={locale}
      dir={dir}
      className={`${geist.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Cairo covers the Arabic locale, which Geist has no glyphs for.
            It stays a <link> because next/font cannot subset per-locale here. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}
      </head>
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

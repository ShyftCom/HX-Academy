import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getSettings } from "@/lib/settings";

const inter = Inter({ subsets: ["latin"] });

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
  return {
    title: academyName,
    description: "Complete Football Academy Management Platform",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let brandCss = "";
  try {
    const s = await getSettings(["primary_color", "secondary_color", "dark_bg_color", "card_dark_color"]);
    const primary   = s.primary_color   || "#A02020";
    const secondary = s.secondary_color || "#903030";
    const darkBg    = s.dark_bg_color   || "#101010";
    const cardDark  = s.card_dark_color || "#202020";

    brandCss = `
      :root {
        --primary-red: ${primary};
        --secondary-red: ${secondary};
        --accent: ${primary};
        --accent-hover: ${secondary};
        --ring: ${primary};
      }
      .dark {
        --background: ${darkBg};
        --card: ${cardDark};
      }
    `;
  } catch {
    // DB unavailable at build/dev time — fall back to globals.css defaults
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

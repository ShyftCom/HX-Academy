import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://footballskillsacademy.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/player/", "/login", "/forgot-password", "/reset-password"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

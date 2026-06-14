import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("station_id") ?? "";
  const theme = searchParams.get("theme") ?? "light";
  const count = parseInt(searchParams.get("count") ?? "6");

  const where: Record<string, unknown> = { status: "approved" };
  if (stationId) where.stationId = stationId;

  const reviews = await db.review.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: count,
    select: {
      id: true, reviewerName: true, rating: true, title: true, content: true,
      isVerified: true, createdAt: true,
    },
  });

  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const cardBg = isDark ? "#16213e" : "#f8f9fa";
  const text = isDark ? "#e0e0e0" : "#1a1a2e";
  const border = isDark ? "#2a2a4e" : "#e9ecef";
  const starFill = "#fbbf24";

  const reviewCards = reviews.map((r) => `
    <div style="background:${cardBg};border:1px solid ${border};border-radius:12px;padding:16px;min-width:260px;max-width:300px;flex-shrink:0;snap-align:start;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${isDark ? "#2a2a5e" : "#e8f0fe"};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:${isDark ? "#7b9ef0" : "#3b82f6"};">${r.reviewerName.charAt(0).toUpperCase()}</div>
        <div>
          <p style="margin:0;font-weight:600;font-size:13px;color:${text};">${r.reviewerName}${r.isVerified ? ' <span style="color:#3b82f6;font-size:11px;">✓</span>' : ""}</p>
          <div style="display:flex;gap:2px;">${[1,2,3,4,5].map(i => `<span style="color:${i<=r.rating?starFill:"#d1d5db"};font-size:13px;">★</span>`).join("")}</div>
        </div>
      </div>
      ${r.title ? `<p style="margin:0 0 6px;font-weight:600;font-size:13px;color:${text};">${r.title}</p>` : ""}
      <p style="margin:0;font-size:12px;color:${isDark ? "#aaa" : "#555"};line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${r.content}</p>
    </div>
  `).join("");

  const js = `
(function() {
  var containers = document.querySelectorAll('[data-hx-reviews]');
  if (!containers.length) return;

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:${bg};border-radius:16px;padding:20px;overflow:hidden;">' +
    '<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;">' +
    ${JSON.stringify(reviewCards)} +
    '</div>' +
    '</div>';

  containers.forEach(function(el) { el.innerHTML = html; });
})();
`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=300",
    },
  });
}

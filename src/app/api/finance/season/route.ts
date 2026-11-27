import { NextResponse } from "next/server";
import { getSettings, setSetting } from "@/lib/settings";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { SEASON_SETTINGS } from "@/lib/setting-keys";
import { DEFAULT_SEASON, isMonthDay } from "@/lib/date-range";

/** The configured sports season, for the finance period filter. */
export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.FINANCE_VIEW);
  if (denied) return denied;
  const s = await getSettings([SEASON_SETTINGS.start, SEASON_SETTINGS.end]);
  const start = s[SEASON_SETTINGS.start];
  const end = s[SEASON_SETTINGS.end];
  return NextResponse.json({
    start: isMonthDay(start) ? start : DEFAULT_SEASON.start,
    end: isMonthDay(end) ? end : DEFAULT_SEASON.end,
  });
}

export async function PUT(req: Request) {
  const denied = await requirePermissionResponse(PERMISSIONS.SETTINGS_EDIT);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!isMonthDay(body.start) || !isMonthDay(body.end) || body.start === body.end) {
    return NextResponse.json({ error: "Invalid season dates", code: "invalid_date" }, { status: 400 });
  }
  await setSetting(SEASON_SETTINGS.start, body.start);
  await setSetting(SEASON_SETTINGS.end, body.end);
  return NextResponse.json({ start: body.start, end: body.end });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.APPLICATIONS_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const statusId = searchParams.get("statusId") ?? "";
  const planId = searchParams.get("planId") ?? "";
  const leadType = searchParams.get("leadType") ?? "";

  // leadType is a more precise discriminator than source (which is "website"
  // for both academy and summer-camp leads); when provided it replaces the
  // default source filter so callers like the Squads/Contact submissions
  // views can select their own leadType without pulling in academy leads.
  const where: any = leadType ? { leadType } : { source: "website" };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (statusId) where.statusId = statusId;
  if (planId) where.selectedPlanId = planId;

  const [data, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: {
        status: true,
        selectedPlan: true,
        _count: { select: { applicationFiles: true, surveyAnswers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

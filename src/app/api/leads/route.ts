import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logLeadActivity } from "@/lib/lead-activity";
import { z } from "zod";

const createSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  categoryInterest: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  statusId: z.string().optional(),
  assignedStaffId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const statusId = searchParams.get("statusId") ?? "";
  const source = searchParams.get("source") ?? "";
  const leadType = searchParams.get("leadType") ?? "";
  const stationId = searchParams.get("stationId") ?? "";
  const isConverted = searchParams.get("isConverted");

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
      { parentName: { contains: q } },
    ];
  }
  if (statusId) where.statusId = statusId;
  if (source) where.source = source;
  if (leadType) where.leadType = leadType;
  if (stationId) where.stationId = stationId;
  if (isConverted !== null && isConverted !== undefined && isConverted !== "") {
    where.isConverted = isConverted === "true";
  }

  const [data, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: { status: true, assignedStaff: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const data = parsed.data;
    const defaultStatus = await db.leadStatus.findFirst({ where: { isDefault: true } });

    const lead = await db.lead.create({
      data: {
        fullName: data.fullName,
        phone: data.phone ?? null,
        email: data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        age: data.dateOfBirth ? Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
        parentName: data.parentName ?? null,
        parentPhone: data.parentPhone ?? null,
        address: data.address ?? null,
        categoryInterest: data.categoryInterest ?? null,
        notes: data.notes ?? null,
        source: data.source ?? null,
        statusId: data.statusId ?? defaultStatus?.id ?? null,
        assignedStaffId: data.assignedStaffId ?? null,
      },
      include: { status: true, assignedStaff: { select: { id: true, name: true } }, station: true },
    });

    const actor = session.user as { id: string; name?: string | null; role?: string };
    const performedByName = actor.name ?? "Admin";
    const performedByRole = actor.role ?? "admin";

    await logLeadActivity({
      leadId: lead.id,
      actionType: "lead_created",
      description: "Lead created",
      performedById: session.user.id,
      performedByName,
      performedByRole,
      metadata: { source: lead.source, status: lead.status?.name },
    });

    if (data.assignedStaffId && lead.assignedStaff) {
      await logLeadActivity({
        leadId: lead.id,
        actionType: "lead_assigned",
        description: `Lead assigned to ${lead.assignedStaff.name}`,
        performedById: session.user.id,
        performedByName,
        performedByRole,
        metadata: { assignedToId: lead.assignedStaff.id, assignedToName: lead.assignedStaff.name },
      });
    }

    await logActivity({
      userId: session.user.id,
      action: "create",
      module: "leads",
      description: `Created lead: ${lead.fullName}`,
      metadata: { leadId: lead.id },
    });

    if (lead.stationId) {
      fetch(`${process.env.NEXTAUTH_URL ?? ""}/api/pixels/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Lead",
          stationId: lead.stationId,
          userData: {
            email: lead.email ?? undefined,
            phone: lead.phone ?? undefined,
            firstName: lead.fullName,
          },
          eventData: { contentName: lead.categoryInterest ?? undefined },
        }),
      }).catch(() => {});
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

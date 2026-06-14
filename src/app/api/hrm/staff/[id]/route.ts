import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const staff = await db.staffProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      station: { select: { name: true } },
      attendances: { orderBy: { date: "desc" }, take: 60 },
      leaveRequests: { orderBy: { createdAt: "desc" } },
      payrolls: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(staff);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const staff = await db.staffProfile.update({
    where: { id },
    data: {
      fullName: body.fullName,
      role: body.role,
      phone: body.phone,
      nationalId: body.nationalId,
      hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      baseSalary: body.baseSalary !== undefined ? Number(body.baseSalary) : undefined,
      salaryType: body.salaryType,
      bankAccount: body.bankAccount,
      status: body.status,
      stationId: body.stationId ?? undefined,
    },
  });
  return NextResponse.json(staff);
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const staff = await db.staffProfile.findMany({
    where: { ...(stationId ? { stationId } : {}) },
    include: {
      user: { select: { id: true, name: true, email: true } },
      station: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { userId, stationId, fullName, role, phone, nationalId, hireDate, baseSalary, salaryType, bankAccount } = body;

  if (!userId || !fullName) return NextResponse.json({ error: "userId and fullName required" }, { status: 400 });

  const profile = await db.staffProfile.create({
    data: {
      userId,
      stationId: stationId ?? null,
      fullName,
      role: role ?? null,
      phone: phone ?? null,
      nationalId: nationalId ?? null,
      hireDate: hireDate ? new Date(hireDate) : null,
      baseSalary: baseSalary ? Number(baseSalary) : null,
      salaryType: salaryType ?? "monthly",
      bankAccount: bankAccount ?? null,
    },
  });
  return NextResponse.json(profile, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let working = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 5 && dow !== 6) working++; // Friday & Saturday are weekend in Algeria
  }
  return working;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const payrolls = await db.payroll.findMany({
    where: {
      ...(stationId ? { stationId } : {}),
      ...(month ? { month: parseInt(month) } : {}),
      ...(year ? { year: parseInt(year) } : {}),
    },
    include: { staff: { select: { fullName: true } }, paidBy: { select: { name: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return NextResponse.json(payrolls);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId, month, year } = await req.json();
  if (!month || !year) return NextResponse.json({ error: "month and year required" }, { status: 400 });

  const staffList = await db.staffProfile.findMany({
    where: { status: "active", ...(stationId ? { stationId } : {}) },
  });

  const workingDays = getWorkingDays(Number(year), Number(month));
  const from = new Date(Number(year), Number(month) - 1, 1);
  const to = new Date(Number(year), Number(month), 0, 23, 59, 59);

  const results = [];
  for (const s of staffList) {
    const existing = await db.payroll.findUnique({ where: { staffId_month_year: { staffId: s.id, month: Number(month), year: Number(year) } } });
    if (existing) { results.push(existing); continue; }

    const absentCount = await db.attendance.count({ where: { staffId: s.id, status: "absent", date: { gte: from, lte: to } } });
    const base = Number(s.baseSalary ?? 0);
    const absencesDeduction = workingDays > 0 ? (base / workingDays) * absentCount : 0;
    const netSalary = base - absencesDeduction;

    const payroll = await db.payroll.create({
      data: {
        staffId: s.id,
        stationId: s.stationId ?? null,
        month: Number(month),
        year: Number(year),
        baseSalary: base,
        bonuses: 0,
        deductions: 0,
        absencesDeduction,
        netSalary,
      },
    });
    results.push(payroll);
  }

  return NextResponse.json(results, { status: 201 });
}

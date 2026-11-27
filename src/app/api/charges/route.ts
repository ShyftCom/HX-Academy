import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";
import { parsePayerFields } from "@/lib/charge-input";
import { parseDayRange } from "@/lib/date-range";

export async function GET(req: Request) {
  const denied = await requirePermissionResponse(PERMISSIONS.FINANCE_VIEW);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const categoryId = searchParams.get("categoryId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const isSalary = searchParams.get("isSalary");
  const dates = parseDayRange(dateFrom, dateTo);
  if ("error" in dates) return NextResponse.json({ error: dates.error, code: "invalid_date" }, { status: 400 });

  const charges = await db.charge.findMany({
    where: {
      ...(stationId && { stationId }),
      ...(categoryId && { categoryId }),
      ...(isSalary !== null && isSalary !== "" && { isSalary: isSalary === "true" }),
      ...(dateFrom || dateTo ? { chargeDate: dates.range } : {}),
    },
    include: {
      category: true,
      paidBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      staff: { select: { fullName: true } },
    },
    orderBy: { chargeDate: "desc" },
  });

  return NextResponse.json(charges);
}

export async function POST(req: Request) {
  const denied = await requirePermissionResponse(PERMISSIONS.CHARGES_CREATE);
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stationId, categoryId, title, amount, chargeDate, notes, isSalary, staffId, receiptUrl } = body;

  if (!title || amount === undefined || !chargeDate) return NextResponse.json({ error: "title, amount, chargeDate required" }, { status: 400 });
  const day = typeof chargeDate === "string" ? parseDayRange(chargeDate.slice(0, 10), null) : null;
  if (!day || "error" in day) return NextResponse.json({ error: "Invalid date", code: "invalid_date" }, { status: 400 });
  if (!(Number(amount) > 0)) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  const payer = await parsePayerFields(body);
  if (payer instanceof NextResponse) return payer;

  const charge = await db.charge.create({
    data: {
      stationId: stationId ?? null,
      categoryId: categoryId ?? null,
      title,
      amount,
      chargeDate: day.range.gte!,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      isSalary: !!isSalary,
      staffId: staffId ?? null,
      receiptUrl: receiptUrl ?? null,
      paymentMethod: payer.paymentMethod ?? null,
      paidById: payer.paidById ?? null,
      paidByName: payer.paidByName ?? null,
      createdById: session.user.id,
    },
    include: { category: true, paidBy: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(charge, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const categoryId = searchParams.get("categoryId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const isSalary = searchParams.get("isSalary");

  const charges = await db.charge.findMany({
    where: {
      ...(stationId && { stationId }),
      ...(categoryId && { categoryId }),
      ...(isSalary !== null && isSalary !== "" && { isSalary: isSalary === "true" }),
      ...(dateFrom || dateTo ? {
        chargeDate: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      } : {}),
    },
    include: {
      category: true,
      paidBy: { select: { name: true } },
      staff: { select: { fullName: true } },
    },
    orderBy: { chargeDate: "desc" },
  });

  return NextResponse.json(charges);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stationId, categoryId, title, amount, chargeDate, notes, isSalary, staffId, receiptUrl } = body;

  if (!title || amount === undefined || !chargeDate) return NextResponse.json({ error: "title, amount, chargeDate required" }, { status: 400 });

  const charge = await db.charge.create({
    data: {
      stationId: stationId ?? null,
      categoryId: categoryId ?? null,
      title,
      amount,
      chargeDate: new Date(chargeDate),
      notes: notes ?? null,
      isSalary: !!isSalary,
      staffId: staffId ?? null,
      receiptUrl: receiptUrl ?? null,
      paidById: session.user.id,
    },
    include: { category: true },
  });

  return NextResponse.json(charge, { status: 201 });
}

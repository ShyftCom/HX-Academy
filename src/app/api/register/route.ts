import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.fullName || !body.phone) {
      return NextResponse.json({ error: "Full name and phone are required" }, { status: 400 });
    }

    const refCode = body.ref || req.nextUrl.searchParams.get("ref");

    const defaultStatus = await db.leadStatus.findFirst({ where: { isDefault: true } });

    const notesWithRef = [body.notes, refCode ? `__ref:${refCode}__` : null].filter(Boolean).join(" ").trim() || null;

    const lead = await db.lead.create({
      data: {
        fullName: body.fullName,
        phone: body.phone,
        email: body.email || null,
        age: body.age ? parseInt(body.age) : null,
        parentName: body.parentName || null,
        parentPhone: body.parentPhone || null,
        categoryInterest: body.category || null,
        notes: notesWithRef,
        source: "website",
        statusId: defaultStatus?.id ?? null,
      },
    });

    // Save survey answers if provided
    if (body.surveyAnswers?.length && body.surveyId) {
      await db.surveyAnswer.createMany({
        data: body.surveyAnswers.map((a: { questionId: string; answer: string }) => ({
          surveyId: body.surveyId,
          questionId: a.questionId,
          answer: a.answer,
          leadId: lead.id,
        })),
      });
    }

    // Notify admins
    const admins = await db.user.findMany({
      where: { role: { name: { in: ["Admin", "Super Admin"] } } },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "New Registration",
        message: `${lead.fullName} submitted a registration form`,
        type: "info",
        link: "/dashboard/leads",
      });
    }

    return NextResponse.json({ message: "Registration submitted successfully", leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

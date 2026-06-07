import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fields = await db.formField.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const count = await db.formField.count();
    const field = await db.formField.create({
      data: {
        label: body.label,
        fieldName: body.fieldName ?? body.label.toLowerCase().replace(/\s+/g, "_"),
        fieldType: body.fieldType ?? "text",
        placeholder: body.placeholder ?? null,
        options: body.options ? JSON.stringify(body.options) : null,
        isRequired: body.isRequired ?? false,
        isDefault: false,
        isActive: true,
        order: count,
      },
    });
    return NextResponse.json(field, { status: 201 });
  } catch { return NextResponse.json({ error: "Create failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  // Bulk reorder
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    await Promise.all(
      body.items.map((item: { id: string; order: number }) =>
        db.formField.update({ where: { id: item.id }, data: { order: item.order } })
      )
    );
    return NextResponse.json({ message: "Reordered" });
  } catch { return NextResponse.json({ error: "Reorder failed" }, { status: 500 }); }
}

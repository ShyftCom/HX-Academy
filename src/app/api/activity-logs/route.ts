import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "30");
  const q = searchParams.get("q") ?? "";
  const module = searchParams.get("module") ?? "";
  const action = searchParams.get("action") ?? "";

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ description: { contains: q } }, { user: { name: { contains: q } } }];
  if (module) where.module = module;
  if (action) where.action = action;

  const [data, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.activityLog.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

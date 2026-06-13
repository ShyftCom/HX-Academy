import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");

  const rolesParam = searchParams.get("roles");
  const includeAvailability = searchParams.get("include_availability") === "true" || !!rolesParam;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
  if (rolesParam) {
    const roleNames = rolesParam.split(",").map((r) => r.trim());
    where.role = { name: { in: roleNames } };
    where.isActive = true;
  }

  const [data, total] = await Promise.all([
    db.user.findMany({
      where,
      include: { role: true, ...(includeAvailability && { agentAvailability: true }) },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const hashed = await hashPassword(body.password);
    const user = await db.user.create({
      data: { name: body.name, email: body.email, password: hashed, roleId: body.roleId ?? null, isActive: body.isActive ?? true },
      include: { role: true },
    });
    const { password: _, ...safeUser } = user as any;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

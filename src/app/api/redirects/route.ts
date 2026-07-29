import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_VIEW);
  if (denied) return denied;
  const redirects = await db.redirect.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(redirects);
}

export async function POST(req: NextRequest) {
  const denied = await requirePermissionResponse(PERMISSIONS.WEBSITE_EDIT);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.fromPath?.startsWith("/") || !body.toPath) {
      return NextResponse.json({ error: "fromPath (starting with /) and toPath are required" }, { status: 400 });
    }
    const redirect = await db.redirect.create({
      data: { fromPath: body.fromPath, toPath: body.toPath, statusCode: body.statusCode ?? 308, isActive: body.isActive ?? true },
    });
    return NextResponse.json(redirect, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "A redirect from this path already exists" }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

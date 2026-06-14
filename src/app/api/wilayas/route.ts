import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const wilayas = await db.wilaya.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(wilayas);
}

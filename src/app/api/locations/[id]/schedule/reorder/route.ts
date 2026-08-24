import { NextRequest } from "next/server";
import { reorderSlots } from "@/lib/schedule-api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reorderSlots(await req.json(), id);
}

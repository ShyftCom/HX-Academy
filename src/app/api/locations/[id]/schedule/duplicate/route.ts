import { NextRequest } from "next/server";
import { duplicateSchedule } from "@/lib/schedule-api";

/** Seed this location's schedule from another one's, as a starting template. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return duplicateSchedule(await req.json(), id);
}

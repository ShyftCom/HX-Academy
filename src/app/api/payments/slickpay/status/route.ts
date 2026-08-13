/**
 * Is online payment available to the current user?
 *
 * The player portal needs to know whether to offer a "Pay by card" button
 * without learning anything about the merchant's credentials, so this returns
 * a single boolean and the mode banner flag — nothing else.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSlickPayConfig, isSlickPayUsable } from "@/lib/slickpay";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getSlickPayConfig();
  const available = isSlickPayUsable(config);

  return NextResponse.json({
    available,
    // Surfaced so a test-mode checkout is visibly labelled and nobody mistakes
    // a sandbox payment for a real one.
    sandbox: available && config.mode === "sandbox",
  });
}

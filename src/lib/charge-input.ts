import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/charge-fields";

type PayerFields = { paymentMethod?: string | null; paidById?: string | null; paidByName?: string | null };

/**
 * Validates the "how and by whom was it paid" part of a charge body.
 *
 * Both are optional — salary charges from payroll and charges recorded before
 * these fields existed carry neither — but what is sent must make sense: a
 * known payment method, and a payer who is either an active staff account or
 * a typed name, never both.
 *
 * Returns the normalized fields, or a 400 response.
 */
export async function parsePayerFields(body: Record<string, unknown>): Promise<PayerFields | NextResponse> {
  const out: PayerFields = {};

  if (body.paymentMethod !== undefined) {
    const m = body.paymentMethod;
    if (m === null || m === "") out.paymentMethod = null;
    else if (typeof m === "string" && (PAYMENT_METHODS as readonly string[]).includes(m)) out.paymentMethod = m;
    else return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const id = typeof body.paidById === "string" ? body.paidById.trim() : "";
  const name = typeof body.paidByName === "string" ? body.paidByName.trim() : "";
  if (id && name) return NextResponse.json({ error: "Choose a payer or type a name, not both" }, { status: 400 });
  if (name.length > 120) return NextResponse.json({ error: "Payer name is too long" }, { status: 400 });
  if (id) {
    const payer = await db.user.findFirst({ where: { id, isActive: true, role: { name: { not: "Player" } } }, select: { id: true } });
    if (!payer) return NextResponse.json({ error: "Unknown payer" }, { status: 400 });
  }
  if (body.paidById !== undefined || body.paidByName !== undefined) {
    out.paidById = id || null;
    out.paidByName = name || null;
  }
  return out;
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermissionResponse, PERMISSIONS } from "@/lib/permissions";

function esc(val: unknown): string {
  const s = String(val ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET() {
  // Every applicant's name, phone and email in one file — gated like the
  // export it is, not on a bare login.
  const denied = await requirePermissionResponse(PERMISSIONS.APPLICATIONS_EXPORT);
  if (denied) return denied;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await db.lead.findMany({
    where: { source: "website" },
    include: { status: true, selectedPlan: true },
    orderBy: { createdAt: "desc" },
  });

  const header = ["ID", "Full Name", "Phone", "Email", "Selected Plan", "Status", "Submitted At", "Converted"].map(esc).join(",");
  const rows = leads.map((l) =>
    [l.id, l.fullName, l.phone || l.parentPhone || "", l.email ?? "", l.selectedPlan?.name ?? "", l.status?.name ?? "", l.createdAt.toISOString(), l.isConverted ? "Yes" : "No"]
      .map(esc)
      .join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="applications.csv"',
    },
  });
}

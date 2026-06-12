import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type LeadActionType =
  | "lead_created"
  | "lead_assigned"
  | "lead_reassigned"
  | "status_change"
  | "note_added"
  | "field_edited"
  | "file_attached"
  | "call_logged"
  | "email_sent"
  | "task_created"
  | "task_completed"
  | "lead_converted"
  | "lead_archived";

interface LogLeadActivityParams {
  leadId: string;
  actionType: LeadActionType;
  description: string;
  performedById?: string | null;
  performedByName?: string;
  performedByRole?: string;
  metadata?: Record<string, unknown>;
}

export async function logLeadActivity({
  leadId,
  actionType,
  description,
  performedById,
  performedByName = "System",
  performedByRole = "system",
  metadata,
}: LogLeadActivityParams) {
  try {
    await db.leadActivity.create({
      data: {
        leadId,
        actionType,
        description,
        performedById: performedById ?? null,
        performedByName,
        performedByRole,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    // Never fail the parent operation
  }
}

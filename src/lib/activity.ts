import { db } from "@/lib/db";

interface LogActivityParams {
  userId?: string | null;
  action: string;
  module: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity({
  userId,
  action,
  module,
  description,
  metadata,
  ipAddress,
  userAgent,
}: LogActivityParams) {
  try {
    await db.activityLog.create({
      data: {
        userId: userId ?? null,
        action,
        module,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch {
    // Don't fail the request if logging fails
  }
}

export async function createNotification({
  userId,
  playerId,
  title,
  message,
  type = "info",
  link,
}: {
  userId?: string | null;
  playerId?: string | null;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: userId ?? null,
        playerId: playerId ?? null,
        title,
        message,
        type,
        link: link ?? null,
      },
    });
  } catch {
    // Don't fail
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, buildReminderEmail } from "@/lib/email";

// GET /api/cron/meeting-reminders
// Should be called every minute by an external cron (e.g. cron-job.org or Vercel cron)
// Sends a reminder email 60 minutes before each meeting, idempotent via reminderSent flag
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const now = new Date();
  const targetTime = new Date(now.getTime() + 60 * 60 * 1000);

  const todayDate = targetTime.toISOString().slice(0, 10);
  const targetHour = targetTime.getHours().toString().padStart(2, "0");
  const targetMinute = targetTime.getMinutes().toString().padStart(2, "0");
  const targetTimeStr = `${targetHour}:${targetMinute}`;

  // Match meetings within ±1 minute window
  const [minuteBefore, minuteAfter] = [
    new Date(targetTime.getTime() - 60 * 1000),
    new Date(targetTime.getTime() + 60 * 1000),
  ];

  const meetings = await db.meeting.findMany({
    where: {
      date: todayDate,
      status: "scheduled",
      reminderSent: false,
    },
    include: {
      agent: { select: { email: true, name: true } },
    },
  });

  const toRemind = meetings.filter((m) => {
    const [h, min] = m.time.split(":").map(Number);
    const meetingMs = new Date(todayDate).setHours(h, min, 0, 0);
    return meetingMs >= minuteBefore.getTime() && meetingMs <= minuteAfter.getTime();
  });

  const results: { meetingId: string; sent: boolean }[] = [];

  for (const meeting of toRemind) {
    if (!meeting.agent.email) continue;
    const { subject, text } = buildReminderEmail({
      agentName: meeting.agent.name ?? "Agent",
      leadName: meeting.leadName,
      time: meeting.time,
      duration: meeting.durationMinutes,
      leadId: meeting.leadId,
      baseUrl,
    });
    try {
      await sendEmail(meeting.agent.email, subject, text);
      await db.meeting.update({ where: { id: meeting.id }, data: { reminderSent: true } });
      results.push({ meetingId: meeting.id, sent: true });
    } catch {
      results.push({ meetingId: meeting.id, sent: false });
    }
  }

  return NextResponse.json({
    checked: meetings.length,
    reminded: toRemind.length,
    results,
    targetTime: targetTimeStr,
    date: todayDate,
  });
}

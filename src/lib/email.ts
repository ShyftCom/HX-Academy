import nodemailer from "nodemailer";
import { createServerTranslator } from "./i18n.server";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}

export function buildBookingConfirmationEmail(params: {
  agentName: string;
  leadName: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  bookedByName: string;
  leadId: string;
  baseUrl: string;
  lang?: string;
}): { subject: string; text: string } {
  const t = createServerTranslator(params.lang ?? "fr", "emails");
  const subject = t("meeting_confirmation.subject", {
    lead: params.leadName,
    date: params.date,
    time: params.time,
  });
  const text = t("meeting_confirmation.body", {
    agent_name: params.agentName,
    lead: params.leadName,
    date: params.date,
    time: params.time,
    duration: String(params.duration),
    type: params.type,
    booked_by: params.bookedByName,
    link: `${params.baseUrl}/dashboard/leads/${params.leadId}`,
  });
  return { subject, text };
}

export function buildReminderEmail(params: {
  agentName: string;
  leadName: string;
  time: string;
  duration: number;
  leadId: string;
  baseUrl: string;
  lang?: string;
}): { subject: string; text: string } {
  const t = createServerTranslator(params.lang ?? "fr", "emails");
  const subject = t("meeting_reminder.subject", { lead: params.leadName });
  const text = t("meeting_reminder.body", {
    agent_name: params.agentName,
    lead: params.leadName,
    time: params.time,
    duration: String(params.duration),
    link: `${params.baseUrl}/dashboard/leads/${params.leadId}`,
  });
  return { subject, text };
}

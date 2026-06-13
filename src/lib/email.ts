import nodemailer from "nodemailer";

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
}): { subject: string; text: string } {
  const subject = `Meeting scheduled — ${params.leadName} · ${params.date} at ${params.time}`;
  const text = `Hi ${params.agentName},

A meeting has been booked for you:

  Lead:      ${params.leadName}
  Date:      ${params.date}
  Time:      ${params.time} (Africa/Algiers)
  Duration:  ${params.duration} minutes
  Type:      ${params.type}

Booked by: ${params.bookedByName}

View lead → ${params.baseUrl}/dashboard/leads/${params.leadId}`;
  return { subject, text };
}

export function buildReminderEmail(params: {
  agentName: string;
  leadName: string;
  time: string;
  duration: number;
  leadId: string;
  baseUrl: string;
}): { subject: string; text: string } {
  const subject = `Reminder — Call with ${params.leadName} in 1 hour`;
  const text = `Hi ${params.agentName},

This is a reminder that you have a call starting in 1 hour:

  Lead:     ${params.leadName}
  Time:     ${params.time} today
  Duration: ${params.duration} minutes

View lead → ${params.baseUrl}/dashboard/leads/${params.leadId}`;
  return { subject, text };
}

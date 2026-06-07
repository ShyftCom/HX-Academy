import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await db.user.findUnique({ where: { email } });
    // Always return success to avoid user enumeration
    if (!user) {
      return NextResponse.json({ message: "If that email exists, a reset link was sent" });
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.passwordResetToken.deleteMany({ where: { email } });
    await db.passwordResetToken.create({
      data: { email, token, expires },
    });

    // In production, send email here
    // For development, we log the token
    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset URL: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}`);

    return NextResponse.json({ message: "Reset link sent" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

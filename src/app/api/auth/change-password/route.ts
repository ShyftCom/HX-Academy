import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user?.password) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({ where: { id: session.user.id }, data: { password: hashedPassword } });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

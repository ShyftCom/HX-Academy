import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalStaff, presentToday, absentToday, onLeave, monthlySalaryCost, totalAttendanceDays, totalAbsentDays] = await Promise.all([
    db.staffProfile.count({ where: { status: "active", ...(stationId ? { stationId } : {}) } }),
    db.attendance.count({ where: { date: todayStr, status: "present", ...(stationId ? { staff: { stationId } } : {}) } }),
    db.attendance.count({ where: { date: todayStr, status: "absent", ...(stationId ? { staff: { stationId } } : {}) } }),
    db.leaveRequest.count({ where: { status: "approved", startDate: { lte: now }, endDate: { gte: now }, ...(stationId ? { staff: { stationId } } : {}) } }),
    db.payroll.aggregate({ where: { status: "paid", ...(stationId ? { stationId } : {}), paidAt: { gte: monthStart } }, _sum: { netSalary: true } }),
    db.attendance.count({ where: { date: { gte: monthStart }, ...(stationId ? { staff: { stationId } } : {}) } }),
    db.attendance.count({ where: { date: { gte: monthStart }, status: "absent", ...(stationId ? { staff: { stationId } } : {}) } }),
  ]);

  const attendanceRate = totalAttendanceDays > 0 ? Math.round(((totalAttendanceDays - totalAbsentDays) / totalAttendanceDays) * 100) : 0;

  return NextResponse.json({
    totalStaff,
    presentToday,
    absentToday,
    onLeave,
    monthlySalaryCost: Number(monthlySalaryCost._sum.netSalary ?? 0),
    attendanceRate,
  });
}

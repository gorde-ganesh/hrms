import { Request, Response } from 'express';
import { SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';

const todayStart = () => new Date(new Date().setHours(0, 0, 0, 0));
const todayEnd = () => new Date(new Date().setHours(23, 59, 59, 999));

export const getDashboardSummary = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { role, employeeId } = user;

  let stats: any = {};

  if (role === 'ADMIN') {
    const [totalEmployees, totalDepartments, pendingLeaves, todayAttendance, recentJoiners] =
      await prisma.$transaction([
        prisma.employee.count({ where: { status: 'ACTIVE' } }),
        prisma.department.count(),
        prisma.leave.count({ where: { status: 'PENDING' } }),
        prisma.attendance.count({
          where: { attendanceDate: { gte: todayStart(), lt: todayEnd() } },
        }),
        prisma.employee.findMany({
          where: { status: 'ACTIVE' },
          orderBy: { joiningDate: 'desc' },
          take: 5,
          include: {
            user: { select: { name: true, email: true } },
            designation: { select: { name: true } },
          },
        }),
      ]);

    stats = { totalEmployees, totalDepartments, pendingLeaves, todayAttendance, recentJoiners };
  } else if (role === 'HR') {
    const [totalEmployees, pendingLeaves, todayAttendance, pendingPayrolls] =
      await prisma.$transaction([
        prisma.employee.count({ where: { status: 'ACTIVE' } }),
        prisma.leave.count({ where: { status: 'PENDING' } }),
        prisma.attendance.count({
          where: { attendanceDate: { gte: todayStart(), lt: todayEnd() } },
        }),
        prisma.payroll.count(),
      ]);

    stats = { totalEmployees, pendingLeaves, todayAttendance, pendingPayrolls };
  } else if (role === 'MANAGER') {
    const teamMembers = await prisma.employee.findMany({
      where: { managerId: employeeId },
      select: { id: true },
    });
    const teamIds = teamMembers.map((e) => e.id);

    const [teamSize, teamLeaves, teamAttendance] = await prisma.$transaction([
      prisma.employee.count({ where: { managerId: employeeId, status: 'ACTIVE' } }),
      prisma.leave.count({ where: { employeeId: { in: teamIds }, status: 'PENDING' } }),
      prisma.attendance.count({
        where: {
          employeeId: { in: teamIds },
          attendanceDate: { gte: todayStart(), lt: todayEnd() },
        },
      }),
    ]);

    stats = { teamSize, teamLeaves, teamAttendance };
  } else {
    const [leaveBalance, attendanceSummary] = await prisma.$transaction([
      prisma.leaveBalance.findFirst({
        where: { employeeId, year: new Date().getFullYear() },
      }),
      prisma.attendance.count({
        where: {
          employeeId,
          attendanceDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: todayEnd(),
          },
        },
      }),
    ]);

    stats = { leaveBalance, attendanceSummary };
  }

  return successResponse(res, stats, 'Dashboard stats fetched successfully', SUCCESS_CODES.SUCCESS, 200);
};

// Alias kept for backwards compatibility
export const getDashboardStats = getDashboardSummary;

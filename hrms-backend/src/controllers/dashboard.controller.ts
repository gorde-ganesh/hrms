import { Request, Response } from 'express';
import { SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';

const dayRangeUtc = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

const monthRangeUtc = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
};

const getTodayPresentCount = async (employeeIds?: string[]) => {
  const { start, end } = dayRangeUtc();
  const grouped = await prisma.attendance.groupBy({
    by: ['employeeId'],
    where: {
      attendanceDate: { gte: start, lte: end },
      ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
    },
  });

  return grouped.length;
};

const getAdminStats = async () => {
  const [totalEmployees, totalDepartments, pendingLeaves, todayAttendance, recentJoiners] =
    await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.department.count(),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      getTodayPresentCount(),
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

  return { totalEmployees, totalDepartments, pendingLeaves, todayAttendance, recentJoiners };
};

const getHrStats = async () => {
  const currentDate = new Date();
  const [totalEmployees, pendingLeaves, todayAttendance, processedPayrollsForCurrentMonth] =
    await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      getTodayPresentCount(),
      prisma.payroll.count({
        where: {
          month: currentDate.getUTCMonth() + 1,
          year: currentDate.getUTCFullYear(),
        },
      }),
    ]);

  const pendingPayrolls = Math.max(totalEmployees - processedPayrollsForCurrentMonth, 0);

  return { totalEmployees, pendingLeaves, todayAttendance, pendingPayrolls };
};

const getManagerStats = async (employeeId: string) => {
  const teamMembers = await prisma.employee.findMany({
    where: { managerId: employeeId, status: 'ACTIVE' },
    select: { id: true },
  });

  const teamIds = teamMembers.map((e) => e.id);
  if (!teamIds.length) {
    return { teamSize: 0, teamLeaves: 0, teamAttendance: 0 };
  }

  const [teamSize, teamLeaves, teamAttendance] = await Promise.all([
    prisma.employee.count({ where: { id: { in: teamIds }, status: 'ACTIVE' } }),
    prisma.leave.count({ where: { employeeId: { in: teamIds }, status: 'PENDING' } }),
    getTodayPresentCount(teamIds),
  ]);

  return { teamSize, teamLeaves, teamAttendance };
};

const getEmployeeStats = async (employeeId: string) => {
  const currentYear = new Date().getUTCFullYear();
  const { start, end } = monthRangeUtc();

  const [leaveBalance, attendanceSummary] = await Promise.all([
    prisma.leaveBalance.findFirst({ where: { employeeId, year: currentYear, leaveType: 'ANNUAL' } }),
    prisma.attendance.count({
      where: {
        employeeId,
        attendanceDate: {
          gte: start,
          lt: end,
        },
      },
    }),
  ]);

  return { leaveBalance, attendanceSummary };
};

export const getDashboardSummary = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { role, employeeId } = user;

  let stats: any = {};

  if (role === 'ADMIN') {
    stats = await getAdminStats();
  } else if (role === 'HR') {
    stats = await getHrStats();
  } else if (role === 'MANAGER') {
    stats = await getManagerStats(employeeId);
  } else {
    stats = await getEmployeeStats(employeeId);
  }

  return successResponse(
    res,
    stats,
    'Dashboard stats fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const getDashboardStats = getDashboardSummary;

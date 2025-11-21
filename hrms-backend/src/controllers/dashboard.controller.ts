import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/client';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { role, employeeId } = user;

  let stats: any = {};

  try {
    if (role === 'ADMIN') {
      const [totalEmployees, totalDepartments, recentJoiners] =
        await Promise.all([
          prisma.employee.count({ where: { status: 'ACTIVE' } }),
          prisma.department.count(),
          prisma.employee.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { joiningDate: 'desc' },
            take: 5,
            include: {
              user: { select: { name: true, email: true } },
              designation: true,
            },
          }),
        ]);

      stats = {
        totalEmployees,
        totalDepartments,
        recentJoiners,
      };
    } else if (role === 'HR') {
      const [pendingLeaves, todayAttendance] = await Promise.all([
        prisma.leave.count({ where: { status: 'PENDING' } }),
        prisma.attendance.count({
          where: {
            attendanceDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);
      stats = {
        pendingLeaves,
        todayAttendance,
      };
    } else if (role === 'MANAGER') {
      // Get employees reporting to this manager
      const teamMembers = await prisma.employee.findMany({
        where: { managerId: employeeId },
        select: { id: true },
      });
      const teamIds = teamMembers.map((e) => e.id);

      const [teamLeaves, teamAttendance] = await Promise.all([
        prisma.leave.count({
          where: {
            employeeId: { in: teamIds },
            status: 'PENDING',
          },
        }),
        prisma.attendance.count({
          where: {
            employeeId: { in: teamIds },
            attendanceDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

      stats = {
        teamLeaves,
        teamAttendance,
      };
    } else if (role === 'EMPLOYEE') {
      // Employee stats are mostly handled by specific endpoints (attendance summary, etc.),
      // but we can aggregate some here if needed.
      // For now, we'll return basic info or rely on existing endpoints.
      // Let's add leave balance here as a quick stat.
      const leaveBalance = await prisma.leaveBalance.findFirst({
        where: { employeeId: employeeId, year: new Date().getFullYear() },
      });
      stats = {
        leaveBalance,
      };
    }

    return successResponse(
      res,
      stats,
      'Dashboard stats fetched successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw new HttpError(
      500,
      'Failed to fetch dashboard stats',
      ERROR_CODES.SERVER_ERROR
    );
  }
};

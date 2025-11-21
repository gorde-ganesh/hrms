import { PrismaClient } from '../../generated/prisma/client';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { Request, Response } from 'express';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

// GET /api/dashboard/summary?month=10&year=2025

export const getDashboardSummary = async (req: Request, res: Response) => {
  const userId = req.user.id; // from auth middleware
  const month = Number(req.query.month) || dayjs().month() + 1;
  const year = Number(req.query.year) || dayjs().year();

  try {
    const employee = await prisma.employee.findFirst({
      where: { userId },
      include: { attendance: true, leaveBalance: true, performance: true },
    });

    if (!employee)
      return res.status(404).json({ message: 'Employee not found' });

    // Working Days & Attendance Summary
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        attendanceDate: {
          gte: new Date(`${year}-${month}-01`),
          lt: dayjs(`${year}-${month}-01`).add(1, 'month').toDate(),
        },
      },
    });

    const presentDays = attendances.filter(
      (a) => a.status === 'PRESENT'
    ).length;
    const absentDays = attendances.filter((a) => a.status === 'ABSENT').length;
    const avgHours =
      attendances.length > 0
        ? attendances.reduce((sum, a) => sum + (a.totalHours || 0), 0) /
          attendances.length
        : 0;

    // Payroll
    const payroll = await prisma.payroll.findFirst({
      where: { employeeId: employee.id, month, year },
    });

    // Performance
    const performance = await prisma.performance.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    // Leave Balance
    const leaveBalance = await prisma.leaveBalance.findFirst({
      where: { employeeId: employee.id, year },
    });

    res.json({
      workingDays: attendances.length,
      presentDays,
      absentDays,
      avgHours,
      today: {
        isCheckedIn: attendances.some(
          (a) => dayjs(a.attendanceDate).isSame(dayjs(), 'day') && a.checkIn
        ),
        checkInTime: attendances.find((a) =>
          dayjs(a.attendanceDate).isSame(dayjs(), 'day')
        )?.checkIn,
      },
      leaveBalance: leaveBalance
        ? {
            total: leaveBalance.totalLeaves,
            used: leaveBalance.usedLeaves,
            remaining: leaveBalance.totalLeaves - leaveBalance.usedLeaves,
          }
        : { total: 0, used: 0, remaining: 0 },
      payroll: payroll ? payroll.netSalary : 0,
      performanceScore: performance[0]?.rating || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const leaveReport = async (req: Request, res: Response) => {
  const { month, year } = req.query;

  if (!month || !year) {
    throw new HttpError(
      400,
      'month and year required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const leaves = await prisma.leave.findMany({
    where: { startDate: { gte: start, lt: end } },
    include: { employee: { include: { user: true } } },
  });

  return res.status(200).json({
    message: 'Leave report fetched successfully',
    data: leaves,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const payrollReport = async (req: Request, res: Response) => {
  const { month, year } = req.query;

  if (!month || !year) {
    throw new HttpError(
      400,
      'month and year required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const payrolls = await prisma.payroll.findMany({
    where: { month: Number(month), year: Number(year) },
    include: {
      employee: { include: { user: true } },
      components: { include: { componentType: true } },
    },
  });

  return res.status(200).json({
    message: 'Payroll report fetched successfully',
    data: payrolls,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const attendanceReport = async (req: Request, res: Response) => {
  const { month, year } = req.query;

  // 🔸 Validation
  if (!month || !year) {
    throw new HttpError(
      400,
      'month and year required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // 🔸 Date range
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

  // 🔸 Fetch attendance with employee and user details
  const attendance = await prisma.attendance.findMany({
    where: {
      attendanceDate: { gte: start, lte: end },
    },
    include: {
      employee: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      attendanceDate: 'asc',
    },
  });

  // 🔸 No records found
  if (!attendance || attendance.length === 0) {
    throw new HttpError(
      404,
      'No attendance records found',
      ERROR_CODES.NOT_FOUND
    );
  }

  // 🔸 Response
  return res.status(200).json({
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
    message: 'Attendance report fetched successfully',
    data: attendance,
  });
};

import { PrismaClient, LeaveType } from '../../generated/prisma';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { sendNotification } from '../utils/notification';
import dayjs from 'dayjs';
import {
  updateUsedLeaves,
  checkSufficientBalance,
} from './leave-balance.controller';
import { successResponse } from '../utils/response-helper';
let ioInstance: any;
let onlineUsersRef: Record<number, string> = {};

export const initNotificationService = (
  io: any,
  onlineUsers: Record<number, string>
) => {
  ioInstance = io;
  onlineUsersRef = onlineUsers;
};

const prisma = new PrismaClient();

// ----------------- Helper Functions -----------------

// Calculate number of leave days (excluding weekends)
export const calculateLeaveDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// Check for overlapping leaves
export const checkOverlappingLeaves = async (
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeLeaveId?: string
): Promise<boolean> => {
  const overlappingLeaves = await prisma.leave.findMany({
    where: {
      employeeId,
      id: excludeLeaveId ? { not: excludeLeaveId } : undefined,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
  });

  return overlappingLeaves.length > 0;
};

// ----------------- Apply Leave -----------------
export const applyLeave = async (req: Request, res: Response) => {
  const {
    employeeId,
    startDate,
    endDate,
    reason,
    managerApprovalId,
    leaveType,
  } = req.body;

  if (
    !employeeId ||
    !startDate ||
    !endDate ||
    !reason ||
    !managerApprovalId ||
    !leaveType
  ) {
    throw new HttpError(
      400,
      'Employee ID, Start Date, End Date, Reason, Manager ID, and Leave Type are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new HttpError(
      400,
      'Start date cannot be after end date',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Check for past dates (allow HR/Admin to apply for past dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    throw new HttpError(
      400,
      'Cannot apply leave for past dates',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Fetch employee with manager
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { manager: true, user: true },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  // Check for overlapping leaves
  const hasOverlap = await checkOverlappingLeaves(employeeId, start, end);
  if (hasOverlap) {
    throw new HttpError(
      400,
      'You already have a leave request for overlapping dates',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Calculate leave days
  const leaveDays = calculateLeaveDays(start, end);

  if (leaveDays === 0) {
    throw new HttpError(
      400,
      'Leave request must include at least one working day',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Check if employee has sufficient balance
  const currentYear = start.getFullYear();
  const hasSufficientBalance = await checkSufficientBalance(
    employeeId,
    currentYear,
    leaveType as LeaveType,
    leaveDays
  );

  if (!hasSufficientBalance) {
    throw new HttpError(
      400,
      `Insufficient leave balance. You need ${leaveDays} days but don't have enough ${leaveType} leave balance.`,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Create leave
  const leave = await prisma.leave.create({
    data: {
      employeeId: employee.id,
      startDate: start,
      endDate: end,
      reason,
      leaveType: leaveType as LeaveType,
      managerApprovalId: managerApprovalId,
    },
  });

  await sendNotification({
    employeeIds: [],
    managerId: employee.manager?.id,
    type: 'LEAVE',
    message: `New ${leaveType} leave request from ${
      employee.user.name
    } (${dayjs(startDate).format('DD/MM/YYYY')} to ${dayjs(endDate).format(
      'DD/MM/YYYY'
    )}) - ${leaveDays} day(s)`,
  });

  return successResponse(
    res,
    { ...leave, leaveDays },
    'Leave applied successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// ----------------- Update Leave Status -----------------
export const updateLeaveStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;

  if (!approvedBy) {
    throw new HttpError(
      400,
      'Approved by missing',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const leave = await prisma.leave.findUnique({
    where: { id: id },
    include: { employee: { include: { manager: true, user: true } } },
  });

  if (!leave) {
    throw new HttpError(404, 'Leave not found', ERROR_CODES.NOT_FOUND);
  }

  const approvedByUser = await prisma.user.findUnique({
    where: {
      id: approvedBy,
    },
  });

  if (!approvedByUser) {
    throw new HttpError(404, 'User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Calculate leave days
  const leaveDays = calculateLeaveDays(leave.startDate, leave.endDate);
  const leaveYear = leave.startDate.getFullYear();
  const previousStatus = leave.status;

  // Update leave status
  const updatedLeave = await prisma.leave.update({
    where: { id: id },
    data: {
      status,
      approvedById: approvedBy,
    },
  });

  // Handle balance updates based on status change
  if (status === 'APPROVED' && previousStatus !== 'APPROVED') {
    // Deduct from balance when approving
    await updateUsedLeaves(
      leave.employeeId,
      leaveYear,
      leave.leaveType,
      leaveDays
    );
  } else if (
    (status === 'REJECTED' || status === 'CANCELLED') &&
    previousStatus === 'APPROVED'
  ) {
    // Restore balance when rejecting/cancelling previously approved leave
    await updateUsedLeaves(
      leave.employeeId,
      leaveYear,
      leave.leaveType,
      -leaveDays
    );
  }

  await sendNotification({
    employeeIds: [leave.employee.id],
    managerId: leave.employee.manager?.id,
    type: 'LEAVE',
    message: `Your ${
      leave.leaveType
    } leave (${leave.startDate.toDateString()} to ${leave.endDate.toDateString()}) has been ${status}`,
  });

  return successResponse(
    res,
    updatedLeave,
    'Leave status updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// ----------------- Get Employee Leaves -----------------
export const getEmployeeLeaves = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  if (!employeeId) {
    throw new HttpError(
      400,
      'Employee Id required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const [leaves, totalRecords] = await Promise.all([
    prisma.leave.findMany({
      where: { employeeId: employeeId },
      orderBy: { id: 'desc' },
      include: { employee: { include: { manager: true, user: true } } },
    }),
    prisma.leave.count({ where: { employeeId: employeeId } }),
  ]);

  return successResponse(
    res,
    { content: leaves, totalRecord: totalRecords },
    'Data fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const getTeamLeaves = async (req: Request, res: Response) => {
  const { managerId } = req.params;

  if (!managerId) {
    throw new HttpError(
      400,
      'Manager Id required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const [leaves, totalRecords] = await Promise.all([
    prisma.leave.findMany({
      where: { employee: { managerId: managerId } },
      orderBy: { id: 'desc' },
      include: { employee: { include: { manager: true, user: true } } },
    }),
    prisma.leave.count({ where: { employee: { managerId: managerId } } }),
  ]);

  return successResponse(
    res,
    { content: leaves, totalRecord: totalRecords },
    'Data fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// ----------------- Get All Leaves -----------------
export const getAllLeaves = async (req: Request, res: Response) => {
  const { status, month, year, pageno, top } = req.query;

  const pageNumber: number = Number(pageno) || 1;
  const topNumber: number = Number(top) || 10;
  const skip = (pageNumber - 1) * topNumber;

  const where: any = {};
  if (status) where.status = status;
  if (month && year) {
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.startDate = { gte: start, lt: end };
  } else if (year) {
    where.startDate = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${Number(year) + 1}-01-01`),
    };
  }

  const [leaves, totalRecords] = await Promise.all([
    prisma.leave.findMany({
      where,
      take: topNumber,
      skip,
      orderBy: { id: 'asc' },
      include: { employee: { include: { manager: true, user: true } } },
    }),
    prisma.leave.count({ where }),
  ]);

  return successResponse(
    res,
    { content: leaves, totalRecord: totalRecords },
    'Data fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// GET /api/leaves/upcoming
export const getUpcomingLeaves = async (req: Request, res: Response) => {
  const userId = req.user.id;
  try {
    const employee = await prisma.employee.findFirst({ where: { userId } });
    if (!employee)
      return res.status(404).json({ message: 'Employee not found' });

    const leaves = await prisma.leave.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        startDate: { gt: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
    });

    return successResponse(
      res,
      leaves.map((l) => ({
        title: l.reason,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
      })),
      'Upcoming leaves fetched',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (e: any) {
    return successResponse(res, null, e.message, ERROR_CODES.SERVER_ERROR, 500);
  }
};

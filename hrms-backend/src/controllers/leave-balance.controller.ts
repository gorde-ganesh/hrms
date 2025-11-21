import { PrismaClient, LeaveType } from '../../generated/prisma';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

// Helper function to get default leave count by type
const getDefaultLeaveCount = (leaveType: LeaveType): number => {
  const defaults: Record<LeaveType, number> = {
    ANNUAL: 20,
    SICK: 10,
    PERSONAL: 5,
    CASUAL: 7,
    MATERNITY: 180,
    PATERNITY: 15,
    UNPAID: 0,
  };
  return defaults[leaveType] || 0;
};

// GET /api/leave-balance/:employeeId
export const getEmployeeLeaveBalance = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { year } = req.query;

  if (!employeeId) {
    throw new HttpError(
      400,
      'Employee ID is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const currentYear = year
    ? parseInt(year as string)
    : new Date().getFullYear();

  const leaveBalances = await prisma.leaveBalance.findMany({
    where: {
      employeeId,
      year: currentYear,
    },
    orderBy: {
      leaveType: 'asc',
    },
  });

  return successResponse(
    res,
    leaveBalances,
    'Leave balances fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// GET /api/leave-balance/:employeeId/summary
export const getLeaveBalanceSummary = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  if (!employeeId) {
    throw new HttpError(
      400,
      'Employee ID is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const currentYear = new Date().getFullYear();

  const leaveBalances = await prisma.leaveBalance.findMany({
    where: {
      employeeId,
      year: currentYear,
    },
    orderBy: {
      leaveType: 'asc',
    },
  });

  const summary = leaveBalances.map((balance) => ({
    leaveType: balance.leaveType,
    totalLeaves: balance.totalLeaves,
    usedLeaves: balance.usedLeaves,
    remainingLeaves: balance.totalLeaves - balance.usedLeaves,
  }));

  return successResponse(
    res,
    summary,
    'Leave balance summary fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// PUT /api/leave-balance/:employeeId
export const updateLeaveBalance = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { year, leaveType, totalLeaves } = req.body;

  if (!employeeId || !year || !leaveType || totalLeaves === undefined) {
    throw new HttpError(
      400,
      'Employee ID, year, leave type, and total leaves are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Check if employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  // Upsert leave balance
  const leaveBalance = await prisma.leaveBalance.upsert({
    where: {
      employeeId_year_leaveType: {
        employeeId,
        year: parseInt(year),
        leaveType,
      },
    },
    update: {
      totalLeaves: parseInt(totalLeaves),
    },
    create: {
      employeeId,
      year: parseInt(year),
      leaveType,
      totalLeaves: parseInt(totalLeaves),
    },
  });

  return successResponse(
    res,
    leaveBalance,
    'Leave balance updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// POST /api/leave-balance/:employeeId/initialize
export const initializeLeaveBalances = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { year } = req.body;

  if (!employeeId) {
    throw new HttpError(
      400,
      'Employee ID is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  // Check if employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  // Initialize all leave types
  const leaveTypes: LeaveType[] = [
    'ANNUAL',
    'SICK',
    'PERSONAL',
    'CASUAL',
    'MATERNITY',
    'PATERNITY',
    'UNPAID',
  ];

  const createdBalances = [];

  for (const leaveType of leaveTypes) {
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_year_leaveType: {
          employeeId,
          year: targetYear,
          leaveType,
        },
      },
    });

    if (!existingBalance) {
      const balance = await prisma.leaveBalance.create({
        data: {
          employeeId,
          year: targetYear,
          leaveType,
          totalLeaves: getDefaultLeaveCount(leaveType),
        },
      });
      createdBalances.push(balance);
    }
  }

  return successResponse(
    res,
    createdBalances,
    `Initialized ${createdBalances.length} leave balance(s)`,
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// Helper function to update leave balance (used by leave controller)
export const updateUsedLeaves = async (
  employeeId: string,
  year: number,
  leaveType: LeaveType,
  daysToAdd: number
) => {
  const leaveBalance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_year_leaveType: {
        employeeId,
        year,
        leaveType,
      },
    },
  });

  if (!leaveBalance) {
    throw new HttpError(
      404,
      'Leave balance not found for this employee and leave type',
      ERROR_CODES.NOT_FOUND
    );
  }

  const updatedBalance = await prisma.leaveBalance.update({
    where: {
      employeeId_year_leaveType: {
        employeeId,
        year,
        leaveType,
      },
    },
    data: {
      usedLeaves: leaveBalance.usedLeaves + daysToAdd,
    },
  });

  return updatedBalance;
};

// Helper function to check if employee has sufficient balance
export const checkSufficientBalance = async (
  employeeId: string,
  year: number,
  leaveType: LeaveType,
  daysRequested: number
): Promise<boolean> => {
  const leaveBalance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_year_leaveType: {
        employeeId,
        year,
        leaveType,
      },
    },
  });

  if (!leaveBalance) {
    return false;
  }

  const remainingLeaves = leaveBalance.totalLeaves - leaveBalance.usedLeaves;
  return remainingLeaves >= daysRequested;
};

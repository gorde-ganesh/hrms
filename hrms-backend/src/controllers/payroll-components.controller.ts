import { Request, Response } from 'express';
import { z } from 'zod/v4';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse, createdResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';
import { calculatePayroll } from '../services/payroll.service';

const ComponentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['ALLOWANCE', 'DEDUCTION']),
  description: z.string().max(500).optional(),
  percent: z.number({ error: 'Percent must be a number' }).min(0).max(100),
});

// ----------------- Get Calculated Components for Employee -----------------
export const getPayrollComponents = async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId;
  const { month, year, lopDays = 0 } = req.query;

  const calc = await calculatePayroll(
    employeeId,
    month ? Number(month) : new Date().getMonth() + 1,
    year ? Number(year) : new Date().getFullYear(),
    Number(lopDays)
  );

  return successResponse(res, calc, 'Components calculated', SUCCESS_CODES.SUCCESS);
};

// ----------------- Create Payroll Component Type -----------------
export const createPayrollComponent = async (req: Request, res: Response) => {
  const parsed = ComponentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Validation failed', ERROR_CODES.VALIDATION_ERROR);
  }

  const { name, type, description, percent } = parsed.data;

  const existing = await prisma.payrollComponentType.findFirst({
    where: { name, deletedAt: null },
  });
  if (existing) {
    throw new HttpError(
      409,
      `A component named "${name}" already exists`,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const component = await prisma.payrollComponentType.create({
    data: { name, type, description, percent },
  });

  return createdResponse(res, component, 'Component created', SUCCESS_CODES.SUCCESS);
};

// ----------------- Update Payroll Component Type -----------------
export const updatePayrollComponent = async (req: Request, res: Response) => {
  const id = req.params.id;

  const parsed = ComponentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Validation failed', ERROR_CODES.VALIDATION_ERROR);
  }

  const existing = await prisma.payrollComponentType.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new HttpError(404, 'Component not found', ERROR_CODES.NOT_FOUND);
  }

  const updated = await prisma.payrollComponentType.update({
    where: { id },
    data: parsed.data,
  });

  return successResponse(res, updated, 'Component updated', SUCCESS_CODES.SUCCESS);
};

// ----------------- Soft Delete Payroll Component Type -----------------
export const deletePayrollComponent = async (req: Request, res: Response) => {
  const id = req.params.id;

  const existing = await prisma.payrollComponentType.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new HttpError(404, 'Component not found', ERROR_CODES.NOT_FOUND);
  }

  // Soft delete — preserves historical PayrollComponent records that reference this type
  await prisma.payrollComponentType.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });

  return successResponse(res, null, 'Component deactivated', SUCCESS_CODES.SUCCESS);
};

// ----------------- Get All Payroll Component Types (Paginated) -----------------
export const getAllPayrollComponents = async (req: Request, res: Response) => {
  const { pageno, top, includeInactive } = req.query;
  const pageNumber = Math.max(1, Number(pageno) || 1);
  const topNumber = Math.min(100, Math.max(1, Number(top) || 10));
  const skip = (pageNumber - 1) * topNumber;

  const where = includeInactive === 'true' ? { deletedAt: null } : { isActive: true, deletedAt: null };

  const [componentTypes, totalRecords] = await Promise.all([
    prisma.payrollComponentType.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      take: topNumber,
      skip,
    }),
    prisma.payrollComponentType.count({ where }),
  ]);

  return successResponse(
    res,
    { content: componentTypes, totalRecords },
    'Components fetched',
    SUCCESS_CODES.SUCCESS
  );
};

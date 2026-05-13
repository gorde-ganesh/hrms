import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse, createdResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';


// ----------------- Get Payroll Components for Employee -----------------
export const getPayrollComponents = async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId as string;
  if (!employeeId) {
    throw new HttpError(
      400,
      'Employee ID required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });

  if (!employee || !employee.salary) {
    throw new HttpError(
      404,
      'Employee or salary not found',
      ERROR_CODES.NOT_FOUND
    );
  }

  const salary = Number(employee.salary) / 12;

  const componentTypes = await prisma.payrollComponentType.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  const components = componentTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    type: ct.type,
    amount: Number(((Number(ct.percent ?? 0) * salary) / 100).toFixed(2)),
  }));

  return successResponse(res, components, 'Data fetched', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Create Payroll Component -----------------
export const createPayrollComponent = async (req: Request, res: Response) => {
  const { name, type, description, percent } = req.body;

  if (!name || !type) {
    throw new HttpError(
      400,
      'Name and type are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const component = await prisma.payrollComponentType.create({
    data: { name, type, description, percent: Number(percent) },
  });

  return createdResponse(res, component, 'Component created successfully', SUCCESS_CODES.SUCCESS);
};

// ----------------- Update Payroll Component -----------------
export const updatePayrollComponent = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, type, description, percent } = req.body;

  const existing = await prisma.payrollComponentType.findUnique({
    where: { id: id },
  });

  if (!existing) {
    throw new HttpError(404, 'Component not found', ERROR_CODES.NOT_FOUND);
  }

  const updated = await prisma.payrollComponentType.update({
    where: { id: id },
    data: { name, type, description, percent: Number(percent) },
  });

  return successResponse(res, updated, 'Component updated successfully', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Delete Payroll Component -----------------
export const deletePayrollComponent = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.payrollComponentType.findUnique({
    where: { id: id },
  });

  if (!existing) {
    throw new HttpError(404, 'Component not found', ERROR_CODES.NOT_FOUND);
  }

  await prisma.payrollComponentType.delete({ where: { id: id } });

  return successResponse(res, null, 'Component deleted successfully', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Get All Payroll Components (Paginated) -----------------
export const getAllPayrollComponents = async (req: Request, res: Response) => {
  const { pageno, top } = req.query;
  const skip: number = Number(pageno) || 0;
  const topNumber: number = Number(top) || 10;

  const [componentTypes, totalRecords] = await Promise.all([
    prisma.payrollComponentType.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      take: topNumber,
      skip,
    }),
    prisma.payrollComponentType.count({ where: { isActive: true } }),
  ]);

  return successResponse(res, { content: componentTypes, totalRecords }, 'Data fetched', SUCCESS_CODES.SUCCESS, 200);
};

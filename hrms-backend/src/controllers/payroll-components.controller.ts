import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';

const prisma = new PrismaClient();

// ----------------- Get Payroll Components for Employee -----------------
export const getPayrollComponents = async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId;
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

  const salary = employee.salary / 12;

  const componentTypes = await prisma.payrollComponentType.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  const components = componentTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    type: ct.type,
    amount: Number((((ct.percent ?? 0) * salary) / 100).toFixed(2)),
  }));

  return res.status(200).json({
    message: 'Data fetched',
    data: components,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
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

  return res.status(200).json({
    message: 'Component created successfully',
    data: component,
    statusCode: 201,
    code: SUCCESS_CODES.SUCCESS,
  });
};

// ----------------- Update Payroll Component -----------------
export const updatePayrollComponent = async (req: Request, res: Response) => {
  const { id } = req.params;
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

  return res.status(200).json({
    message: 'Component updated successfully',
    data: updated,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

// ----------------- Delete Payroll Component -----------------
export const deletePayrollComponent = async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.payrollComponentType.findUnique({
    where: { id: id },
  });

  console.log(existing, '>>>>>');

  if (!existing) {
    throw new HttpError(404, 'Component not found', ERROR_CODES.NOT_FOUND);
  }

  await prisma.payrollComponentType.delete({ where: { id: id } });

  return res.status(200).json({
    message: 'Component deleted successfully',
    data: null,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

// ----------------- Get All Payroll Components (Paginated) -----------------
export const getAllPayrollComponents = async (req: Request, res: Response) => {
  const { pageno, top } = req.query;
  const pageNumber: number = Number(pageno) || 1;
  const topNumber: number = Number(top) || 10;
  const skip = (pageNumber - 1) * topNumber;

  const [componentTypes, totalRecords] = await Promise.all([
    prisma.payrollComponentType.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      take: topNumber,
      skip,
    }),
    prisma.payrollComponentType.count({ where: { isActive: true } }),
  ]);

  return res.status(200).json({
    message: 'Data fetched',
    data: { content: componentTypes, totalRecords },
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

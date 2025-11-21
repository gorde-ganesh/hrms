// controllers/performance.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { sendNotification } from '../utils/notification';

const prisma = new PrismaClient();

export const addAppraisal = async (req: Request, res: Response) => {
  const { employeeId, goals, rating, comments } = req.body;

  if (!employeeId || !goals) {
    throw new HttpError(
      400,
      'employeeId and goals are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Verify employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: true,
      manager: {
        include: { user: true }, // so you can access manager.user.id, manager.user.name, etc.
      },
    },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  const performance = await prisma.performance.create({
    data: {
      employeeId: employee.id,
      userId: employee.user.id, // the user creating the appraisal
      goals,
      rating,
      comments,
    },
  });

  // Optional: notify employee about new appraisal
  await sendNotification({
    employeeIds: [employeeId],
    managerId: employee.manager?.id,
    type: 'PERFORMANCE',
    message: `New appraisal added for you. Rating: ${rating ?? 'N/A'}`,
  });

  return res.status(200).json({
    message: 'Appraisal added successfully',
    data: performance,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const updateAppraisal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rating, comments } = req.body;

  if (!rating && !comments) {
    throw new HttpError(
      400,
      'At least rating or comments must be provided',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Fetch appraisal with employee and manager relation
  const appraisal = await prisma.performance.findUnique({
    where: { id: id },
    include: {
      employee: {
        include: {
          user: true,
          manager: { include: { user: true } }, // Include manager relation
        },
      },
    },
  });

  if (!appraisal) {
    throw new HttpError(404, 'Appraisal not found', ERROR_CODES.NOT_FOUND);
  }

  // Update appraisal
  const updatedAppraisal = await prisma.performance.update({
    where: { id: id },
    data: { rating, comments },
  });

  // Send notification to employee + manager + HR/Admin
  await sendNotification({
    employeeIds: [appraisal.employee.id], // Employee
    managerId: appraisal.employee.manager?.user.id, // Manager (optional)
    type: 'PERFORMANCE',
    message: `Your appraisal has been updated. Rating: ${rating ?? 'N/A'}`,
  });

  return res.status(200).json({
    message: 'Appraisal updated successfully',
    data: updatedAppraisal,
    statusCode: 200,
  });
};
export const getEmployeePerformance = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const currentUser = req.user; // assuming you have auth middleware

  if (!employeeId) {
    throw new HttpError(
      400,
      'Employee ID required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Employees can only see their own data
  if (
    currentUser.role === 'EMPLOYEE' &&
    currentUser.employeeId !== Number(employeeId)
  ) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const performance = await prisma.performance.findMany({
    where: { employeeId: employeeId },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({
    message: 'Performance data fetched successfully',
    data: performance,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

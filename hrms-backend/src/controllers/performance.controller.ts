import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { sendNotification } from '../utils/notification';
import { prisma } from '../lib/prisma';


export const addAppraisal = async (req: Request, res: Response) => {
  const { employeeId, goals, rating, comments, managerComments } = req.body;

  if (!employeeId || !goals) {
    throw new HttpError(
      400,
      'employeeId and goals are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: true,
      manager: { include: { user: true } },
    },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  const performance = await prisma.performance.create({
    data: {
      employeeId: employee.id,
      userId: employee.user.id,
      goals,
      rating,
      comments,
      managerComments,
    },
  });

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
  const { rating, comments, managerComments } = req.body;

  if (!rating && !comments && !managerComments) {
    throw new HttpError(
      400,
      'At least one of rating, comments, or managerComments must be provided',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const appraisal = await prisma.performance.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          user: true,
          manager: { include: { user: true } },
        },
      },
    },
  });

  if (!appraisal) {
    throw new HttpError(404, 'Appraisal not found', ERROR_CODES.NOT_FOUND);
  }

  const updatedAppraisal = await prisma.performance.update({
    where: { id },
    data: {
      ...(rating !== undefined && { rating }),
      ...(comments !== undefined && { comments }),
      ...(managerComments !== undefined && { managerComments }),
    },
  });

  await sendNotification({
    employeeIds: [appraisal.employee.id],
    managerId: appraisal.employee.manager?.user.id,
    type: 'PERFORMANCE',
    message: `Your appraisal has been updated. Rating: ${rating ?? 'N/A'}`,
  });

  return res.status(200).json({
    message: 'Appraisal updated successfully',
    data: updatedAppraisal,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const getEmployeePerformance = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const currentUser = req.user;

  if (!employeeId) {
    throw new HttpError(400, 'Employee ID required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (
    currentUser.role === 'EMPLOYEE' &&
    currentUser.employeeId !== employeeId
  ) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const performance = await prisma.performance.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: { include: { user: { select: { name: true } } } },
    },
  });

  return res.status(200).json({
    message: 'Performance data fetched successfully',
    data: performance,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const getAllPerformance = async (req: Request, res: Response) => {
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = parseInt(req.query['limit'] as string) || 20;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.performance.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: { select: { name: true, email: true } },
            designation: { select: { name: true } },
          },
        },
      },
    }),
    prisma.performance.count(),
  ]);

  return res.status(200).json({
    message: 'All performance records fetched',
    data: records,
    totalRecords: total,
    page,
    limit,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const getTeamPerformance = async (req: Request, res: Response) => {
  const currentUser = req.user;

  const teamMembers = await prisma.employee.findMany({
    where: { managerId: currentUser.employeeId },
    select: { id: true },
  });

  const teamIds = teamMembers.map((e) => e.id);

  const records = await prisma.performance.findMany({
    where: { employeeId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });

  return res.status(200).json({
    message: 'Team performance fetched successfully',
    data: records,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

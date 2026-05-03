import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { sendNotification } from '../utils/notification';
import { prisma } from '../lib/prisma';
import { successResponse } from '../utils/response-helper';

export const addAppraisal = async (req: Request, res: Response) => {
  const { employeeId, goals, rating, comments, managerComments, reviewPeriod } = req.body;

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
      goals,
      rating,
      comments,
      managerComments,
      status: 'DRAFT',
      reviewPeriod: reviewPeriod ?? 'ANNUAL',
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
  const id = req.params.id as string;
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
  const employeeId = req.params.employeeId as string;
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

// ----------------- Submit (DRAFT → SUBMITTED) -----------------
export const submitAppraisal = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user;

  const appraisal = await prisma.performance.findUnique({ where: { id } });
  if (!appraisal) throw new HttpError(404, 'Appraisal not found', ERROR_CODES.NOT_FOUND);

  if (appraisal.status !== 'DRAFT') {
    throw new HttpError(400, `Cannot submit — current status is '${appraisal.status}'`, ERROR_CODES.VALIDATION_ERROR);
  }
  if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== appraisal.employeeId) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const updated = await prisma.performance.update({
    where: { id },
    data: { status: 'SUBMITTED' },
  });

  return successResponse(res, updated, 'Appraisal submitted for review', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Review (SUBMITTED → REVIEWED) -----------------
export const reviewAppraisal = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { rating, managerComments } = req.body;

  const appraisal = await prisma.performance.findUnique({ where: { id } });
  if (!appraisal) throw new HttpError(404, 'Appraisal not found', ERROR_CODES.NOT_FOUND);

  if (appraisal.status !== 'SUBMITTED') {
    throw new HttpError(400, `Cannot review — current status is '${appraisal.status}'`, ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.performance.update({
    where: { id },
    data: {
      status: 'REVIEWED',
      rating: rating ?? appraisal.rating,
      managerComments: managerComments ?? appraisal.managerComments,
      reviewDate: new Date(),
    },
  });

  await sendNotification({
    employeeIds: [appraisal.employeeId],
    type: 'PERFORMANCE',
    message: `Your appraisal has been reviewed. Rating: ${updated.rating ?? 'N/A'}`,
  });

  return successResponse(res, updated, 'Appraisal reviewed', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Finalize (REVIEWED → FINALIZED) -----------------
export const finalizeAppraisal = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const appraisal = await prisma.performance.findUnique({ where: { id } });
  if (!appraisal) throw new HttpError(404, 'Appraisal not found', ERROR_CODES.NOT_FOUND);

  if (appraisal.status !== 'REVIEWED') {
    throw new HttpError(400, `Cannot finalize — current status is '${appraisal.status}'`, ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.performance.update({
    where: { id },
    data: { status: 'FINALIZED' },
  });

  await sendNotification({
    employeeIds: [appraisal.employeeId],
    type: 'PERFORMANCE',
    message: 'Your performance appraisal has been finalized.',
  });

  return successResponse(res, updated, 'Appraisal finalized', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Delete (DRAFT only) -----------------
export const deleteAppraisal = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user;

  const appraisal = await prisma.performance.findUnique({ where: { id } });
  if (!appraisal) throw new HttpError(404, 'Appraisal not found', ERROR_CODES.NOT_FOUND);

  if (appraisal.status !== 'DRAFT') {
    throw new HttpError(400, 'Only DRAFT appraisals can be deleted', ERROR_CODES.VALIDATION_ERROR);
  }
  if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== appraisal.employeeId) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  await prisma.performance.delete({ where: { id } });
  return successResponse(res, null, 'Appraisal deleted', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Rating Trends for an Employee -----------------
export const getPerformanceTrends = async (req: Request, res: Response) => {
  const employeeId = String(req.params.employeeId);
  const currentUser = req.user;

  if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== employeeId) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const records = await prisma.performance.findMany({
    where: { employeeId, status: 'FINALIZED', rating: { not: null } },
    orderBy: { reviewDate: 'asc' },
    select: { id: true, rating: true, reviewPeriod: true, reviewDate: true, createdAt: true },
  });

  return successResponse(res, records, 'Performance trends fetched', SUCCESS_CODES.SUCCESS, 200);
};

// ----------------- Team Performance Summary -----------------
export const getTeamPerformanceSummary = async (req: Request, res: Response) => {
  const managerId = String(req.params.managerId);

  const teamMembers = await prisma.employee.findMany({
    where: { managerId, status: 'ACTIVE' },
    select: { id: true, user: { select: { name: true } } },
  });

  const teamIds = teamMembers.map((e) => e.id);
  if (!teamIds.length) {
    return successResponse(res, { teamSize: 0, averageRating: null, distribution: {} }, 'No team members', SUCCESS_CODES.SUCCESS, 200);
  }

  const finalized = await prisma.performance.findMany({
    where: { employeeId: { in: teamIds }, status: 'FINALIZED', rating: { not: null } },
    select: { employeeId: true, rating: true },
  });

  const totalRated = finalized.length;
  const avgRating = totalRated > 0
    ? finalized.reduce((sum, r) => sum + (r.rating ?? 0), 0) / totalRated
    : null;

  const distribution: Record<number, number> = {};
  finalized.forEach((r) => {
    const rating = r.rating!;
    distribution[rating] = (distribution[rating] ?? 0) + 1;
  });

  return successResponse(res, {
    teamSize: teamIds.length,
    ratedCount: totalRated,
    averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    distribution,
  }, 'Team performance summary fetched', SUCCESS_CODES.SUCCESS, 200);
};

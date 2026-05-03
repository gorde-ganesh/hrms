import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse } from '../utils/response-helper';
import { SUCCESS_CODES } from '../utils/response-codes';

export const getAuditLogs = async (req: Request, res: Response) => {
  const { entity, action, userId, from, to, page = '1', limit = '50' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity as string;
  if (action) where.action = action as string;
  if (userId) where.performedBy = userId as string;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return successResponse(
    res,
    { logs, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    'Audit logs fetched',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

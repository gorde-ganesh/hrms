import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

export const getPermissions = async (req: Request, res: Response) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });

  // Group permissions by resource for easier UI consumption
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return successResponse(
    res,
    { permissions, groupedPermissions },
    'Permissions fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

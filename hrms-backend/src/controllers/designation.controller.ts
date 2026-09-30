import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse, createdResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';
import { cachedQuery, invalidateCachePrefix } from '../lib/cache';
import { notDeleted, softDeleteData } from '../utils/soft-delete';


const findDesignationByName = async (name: string, excludeId?: string) => {
  return prisma.designation.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      ...notDeleted,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
};

export const createDesignation = async (req: Request, res: Response) => {
  const { name, description, classification } = req.body;

  if (!name) {
    throw new HttpError(400, 'Name is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const isDesignationExist = await findDesignationByName(name);
  if (isDesignationExist) {
    throw new HttpError(400, 'Designation already exists', ERROR_CODES.VALIDATION_ERROR);
  }

  const designation = await prisma.designation.create({
    data: { name: name.trim(), description, classification },
  });

  invalidateCachePrefix('designations:');

  return createdResponse(res, designation, 'Designation created successfully', SUCCESS_CODES.SUCCESS);
};

export const getAllDesignations = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const pageSize = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * pageSize;
  const term = typeof search === 'string' ? search.trim() : '';
  const cacheKey = `designations:page=${pageNumber}:limit=${pageSize}:search=${term.toLowerCase()}`;
  const where = {
    ...notDeleted,
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' as const } },
            { description: { contains: term, mode: 'insensitive' as const } },
            { classification: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const result = await cachedQuery(cacheKey, () =>
    Promise.all([
      prisma.designation.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.designation.count({ where }),
    ])
  );

  const [designations, totalRecords] = result as [any[], number];

  return successResponse(
    res,
    { content: designations, totalRecords, totalPages: Math.ceil(totalRecords / pageSize), currentPage: pageNumber },
    'Designations fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const getDesignationById = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);

  const designation = await prisma.designation.findUnique({ where: { id } });

  if (!designation || designation.deletedAt) {
    throw new HttpError(404, 'Designation not found', ERROR_CODES.NOT_FOUND);
  }

  return successResponse(res, designation, 'Designation fetched successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const updateDesignation = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, description, classification } = req.body;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  if (!name) throw new HttpError(400, 'Name is required', ERROR_CODES.VALIDATION_ERROR);

  const isDesignationExist = await findDesignationByName(name, id);
  if (isDesignationExist) {
    throw new HttpError(400, 'Designation already exists', ERROR_CODES.VALIDATION_ERROR);
  }

  const designation = await prisma.designation.update({
    where: { id },
    data: { name: name.trim(), description, classification },
  });

  invalidateCachePrefix('designations:');

  return successResponse(res, designation, 'Designation updated successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const deleteDesignation = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);

  const inUse = await prisma.employee.count({ where: { designationId: id, ...notDeleted } });
  if (inUse > 0) {
    throw new HttpError(
      409,
      `Cannot delete: ${inUse} employee${inUse === 1 ? ' is' : 's are'} assigned to this designation`,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  await prisma.designation.update({ where: { id }, data: softDeleteData() });

  invalidateCachePrefix('designations:');

  return successResponse(res, null, 'Designation deleted successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const restoreDesignation = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);

  const designation = await prisma.designation.update({
    where: { id },
    data: { deletedAt: null },
  });

  invalidateCachePrefix('designations:');

  return successResponse(res, designation, 'Designation restored successfully', SUCCESS_CODES.SUCCESS, 200);
};

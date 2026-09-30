import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import {
  successResponse,
  createdResponse,
  errorResponse,
} from '../utils/response-helper';
import { prisma } from '../lib/prisma';
import { cachedQuery, invalidateCachePrefix } from '../lib/cache';
import { notDeleted, softDeleteData } from '../utils/soft-delete';


const findDepartmentByName = async (name: string, excludeId?: string) => {
  return prisma.department.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      ...notDeleted,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
};

export const createDepartment = async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name) {
    throw new HttpError(400, 'Name is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const isDepartmentExists = await findDepartmentByName(name);

  if (isDepartmentExists) {
    throw new HttpError(400, 'Department already exists', ERROR_CODES.VALIDATION_ERROR);
  }

  const department = await prisma.department.create({
    data: { name: name.trim(), description },
  });

  invalidateCachePrefix('departments:');

  return createdResponse(res, department, 'Department created successfully', SUCCESS_CODES.SUCCESS);
};

export const getAllDepartments = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const pageSize = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * pageSize;
  const term = typeof search === 'string' ? search.trim() : '';
  const cacheKey = `departments:page=${pageNumber}:limit=${pageSize}:search=${term.toLowerCase()}`;
  const where = {
    ...notDeleted,
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' as const } },
            { description: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const result = await cachedQuery(cacheKey, () =>
    Promise.all([
      prisma.department.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.department.count({ where }),
    ])
  );

  const [departments, totalRecords] = result as [any[], number];

  return successResponse(
    res,
    { content: departments, totalRecords, totalPages: Math.ceil(totalRecords / pageSize), currentPage: pageNumber },
    'Departments fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const getDepartmentById = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const department = await prisma.department.findUnique({ where: { id } });

  if (!department || department.deletedAt) {
    return errorResponse(res, 'Department not found', ERROR_CODES.NOT_FOUND, 404);
  }

  return successResponse(res, department, 'Department fetched successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const updateDepartment = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, description } = req.body;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  if (!name) throw new HttpError(400, 'Name is required', ERROR_CODES.VALIDATION_ERROR);

  const isDepartmentExists = await findDepartmentByName(name, id);
  if (isDepartmentExists) {
    throw new HttpError(400, 'Department already exists', ERROR_CODES.VALIDATION_ERROR);
  }

  const department = await prisma.department.update({
    where: { id },
    data: { name: name.trim(), description },
  });

  invalidateCachePrefix('departments:');

  return successResponse(res, department, 'Department updated successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const deleteDepartment = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);

  await prisma.department.update({ where: { id }, data: softDeleteData() });

  invalidateCachePrefix('departments:');

  return successResponse(res, null, 'Department deleted successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const restoreDepartment = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);

  const department = await prisma.department.update({
    where: { id },
    data: { deletedAt: null },
  });

  invalidateCachePrefix('departments:');

  return successResponse(res, department, 'Department restored successfully', SUCCESS_CODES.SUCCESS, 200);
};

import { PrismaClient } from '../../generated/prisma/client';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import {
  successResponse,
  createdResponse,
  errorResponse,
} from '../utils/response-helper';

const prisma = new PrismaClient();

const findDepartmentByName = async (name: string, excludeId?: string) => {
  return prisma.department.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
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
    throw new HttpError(
      400,
      'Department already exists',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const department = await prisma.department.create({
    data: {
      name: name.trim(),
      description,
    },
  });

  return createdResponse(
    res,
    department,
    'Department created successfully',
    SUCCESS_CODES.SUCCESS
  );
};

export const getAllDepartments = async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const pageSize = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * pageSize;

  const [departments, totalRecords] = await Promise.all([
    prisma.department.findMany({
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    prisma.department.count(),
  ]);

  return successResponse(
    res,
    {
      content: departments,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
      currentPage: pageNumber,
    },
    'Departments fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const getDepartmentById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department) {
    return errorResponse(
      res,
      'Department not found',
      ERROR_CODES.NOT_FOUND,
      404
    );
  }

  return successResponse(
    res,
    department,
    'Department fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};
export const updateDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!name) {
    throw new HttpError(400, 'Name is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const isDepartmentExists = await findDepartmentByName(name, id);

  if (isDepartmentExists) {
    throw new HttpError(
      400,
      'Department already exists',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const department = await prisma.department.update({
    where: { id },
    data: { name: name.trim(), description },
  });

  return successResponse(
    res,
    department,
    'Department updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};
export const deleteDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }

  await prisma.department.delete({
    where: { id },
  });

  return successResponse(
    res,
    null,
    'Department deleted successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

import { PrismaClient } from '../../generated/prisma/client';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse, createdResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

const findDesignationByName = async (name: string, excludeId?: string) => {
  return prisma.designation.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
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
    throw new HttpError(
      400,
      'Designation already exists',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const designation = await prisma.designation.create({
    data: {
      name: name.trim(),
      description,
      classification,
    },
  });

  return createdResponse(
    res,
    designation,
    'Designation created successfully',
    SUCCESS_CODES.SUCCESS
  );
};

export const getAllDesignations = async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const pageSize = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * pageSize;

  const [designations, totalRecords] = await Promise.all([
    prisma.designation.findMany({
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    prisma.designation.count(),
  ]);

  return successResponse(
    res,
    {
      content: designations,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
      currentPage: pageNumber,
    },
    'Designations fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};
export const getDesignationById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }
  const designation = await prisma.designation.findUnique({
    where: { id },
  });

  if (!designation) {
    throw new HttpError(404, 'Designation not found', ERROR_CODES.NOT_FOUND);
  }

  return successResponse(
    res,
    designation,
    'Designation fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};
export const updateDesignation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, classification } = req.body;

  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }
  if (!name) {
    throw new HttpError(400, 'Name is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const isDesignationExist = await findDesignationByName(name, id);

  if (isDesignationExist) {
    throw new HttpError(
      400,
      'Designation already exists',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const designation = await prisma.designation.update({
    where: { id },
    data: { name: name.trim(), description, classification },
  });

  return successResponse(
    res,
    designation,
    'Designation updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};
export const deleteDesignation = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'Id is required', ERROR_CODES.VALIDATION_ERROR);
  }

  await prisma.designation.delete({
    where: { id },
  });

  return successResponse(
    res,
    null,
    'Designation deleted successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

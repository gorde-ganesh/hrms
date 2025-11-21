import { PrismaClient } from '../../generated/prisma';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

// ----------------- Get All Users -----------------
export const getAllUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: {
      userRole: true,
      employee: {
        select: {
          designation: true,
          department: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role, // Keep for backward compatibility
    roleId: user.roleId,
    roleName: user.userRole?.name,
    department: user.employee?.department?.name,
    designation: user.employee?.designation?.name,
  }));

  return successResponse(
    res,
    formattedUsers,
    'Users fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// ----------------- Get User Details -----------------
export const getUserDetails = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(
      400,
      'User id is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: id },
    include: { employee: true, userRole: true },
  });

  if (!user || !user.employee) {
    throw new HttpError(404, 'User not found', ERROR_CODES.NOT_FOUND);
  }

  let department = null;
  if (user.employee.departmentId) {
    department = await prisma.department.findUnique({
      where: { id: user.employee.departmentId },
    });
  }

  let designation = null;
  if (user.employee.designationId) {
    designation = await prisma.designation.findUnique({
      where: { id: user.employee.designationId },
    });
  }

  let manager = null;
  if (user.employee.managerId) {
    manager = await prisma.employee.findUnique({
      where: {
        id: user.employee.managerId,
      },
    });
  }

  const leaveBalances = await prisma.leaveBalance.findMany({
    where: {
      employeeId: user.employee.id,
      year: new Date().getFullYear(),
    },
  });

  return successResponse(
    res,
    {
      ...user,
      manager: manager,
      department: department?.name,
      designation: designation?.name,
      leaveBalances,
    },
    'Data fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// ----------------- Update User Details -----------------
export const updateUserDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, address, country, state, city, zipCode } =
    req.body;

  if (!id) {
    throw new HttpError(
      400,
      'User id is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const user = await prisma.user.findUnique({ where: { id: id } });

  if (!user) {
    throw new HttpError(404, 'User not found', ERROR_CODES.NOT_FOUND);
  }

  const updatedUser = await prisma.user.update({
    where: { id: id },
    data: {
      email,
      name,
      phone,
      address,
      country,
      state,
      city,
      zipCode,
      roleId: req.body.roleId,
    },
  });

  return successResponse(
    res,
    { user: updatedUser },
    'User updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

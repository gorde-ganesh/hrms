import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';
import { assertSelfOrPrivileged, isPrivileged } from '../utils/access';

// Never return credential / session fields to clients.
const sanitizeUser = <T extends Record<string, any>>(user: T) => {
  const {
    password,
    refreshToken,
    refreshTokenExp,
    resetToken,
    resetTokenExp,
    failedLoginAttempts,
    lockedUntil,
    tokenVersion,
    ...safe
  } = user as any;
  return safe;
};

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
    role: user.userRole?.name,
    roleId: user.roleId,
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
  const id = req.params.id as string;
  assertSelfOrPrivileged(req.user, id);

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
      ...sanitizeUser(user),
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
  const id = req.params.id as string;
  assertSelfOrPrivileged(req.user, id);

  // Role changes are ADMIN-only; email is the login identifier so HR/ADMIN-only.
  if (req.body.roleId !== undefined && req.user?.role !== 'ADMIN') {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }
  if (req.body.email !== undefined && !isPrivileged(req.user)) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }
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

  if (req.body.roleId !== undefined && req.body.roleId !== user.roleId) {
    // Stops an admin locking themselves (and possibly everyone) out of the admin area
    if (id === req.user?.id) {
      throw new HttpError(400, 'You cannot change your own role', ERROR_CODES.VALIDATION_ERROR);
    }
    const targetRole = await prisma.userRole.findUnique({ where: { id: String(req.body.roleId) } });
    if (!targetRole) {
      throw new HttpError(400, 'Invalid role', ERROR_CODES.VALIDATION_ERROR);
    }
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
    { user: sanitizeUser(updatedUser) },
    'User updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

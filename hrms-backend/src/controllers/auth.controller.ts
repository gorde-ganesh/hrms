import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';
import { sendPasswordReset } from '../services/mail.service';
import { authService } from '../services/auth.service';
import { auditLog } from '../utils/audit';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookies(res: Response, accessToken: string, rawRefreshToken: string) {
  res.cookie('authToken', accessToken, {
    httpOnly: true, secure: true, sameSite: 'none', maxAge: 60 * 60 * 1000,
  });
  res.cookie('refreshToken', rawRefreshToken, {
    httpOnly: true, secure: true, sameSite: 'none',
    maxAge: REFRESH_TOKEN_TTL_MS, path: '/api/auth/refresh',
  });
}


export const registerUser = async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    address,
    state,
    city,
    country,
    zipCode,
    employeeCode,
    departmentId,
    designationId,
    joiningDate,
    salary,
    status,
    managerId,
    dob,
    personalEmail,
    bloodGroup,
    emergencyContactPerson,
    emergencyContactNumber,
  } = req.body;

  // Validate required fields
  if (
    !name ||
    !password ||
    !email ||
    !role ||
    !phone ||
    !address ||
    !departmentId ||
    !designationId ||
    !joiningDate ||
    !salary
  ) {
    throw new HttpError(
      400,
      'Name, email, password, role, phone, address, departmentId, designationId, joiningDate, and salary are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new HttpError(
      400,
      'Invalid email format',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new HttpError(
      400,
      'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });

  // Validate employee code uniqueness
  if (employeeCode) {
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeCode },
    });
    if (existingEmployee && existingEmployee.userId !== existingUser?.id) {
      throw new HttpError(
        400,
        'Employee code already exists',
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  // Validate department exists
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    throw new HttpError(
      404,
      'Department not found',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate designation exists
  const designation = await prisma.designation.findUnique({
    where: { id: designationId },
  });
  if (!designation) {
    throw new HttpError(
      404,
      'Designation not found',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate role exists
  const userRole = await prisma.userRole.findUnique({ where: { name: role } });
  if (!userRole) {
    throw new HttpError(400, 'Invalid role', ERROR_CODES.VALIDATION_ERROR);
  }

  // Only ADMIN can create ADMIN or HR accounts
  const callerRole = req.user?.role;
  if ((role === 'ADMIN' || role === 'HR') && callerRole !== 'ADMIN') {
    throw new HttpError(403, 'Only ADMIN can assign ADMIN or HR roles', ERROR_CODES.FORBIDDEN);
  }

  // Validate manager exists if provided
  if (managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
    });
    if (!manager) {
      throw new HttpError(
        404,
        'Manager not found',
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    let user;
    let employee;
    let isReactivated = false;

    if (existingUser) {
      // Reactivate existing user
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          roleId: userRole.id,
          phone,
          address,
          state,
          city,
          country,
          zipCode,
        },
      });

      // Update existing employee record
      employee = await tx.employee.findFirst({
        where: { userId: user.id },
      });

      if (employee) {
        employee = await tx.employee.update({
          where: { id: employee.id },
          data: {
            employeeCode,
            departmentId,
            designationId,
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
            salary,
            status: status || 'ACTIVE',
            managerId: managerId || null,
            dob: dob ? new Date(dob) : new Date(),
            personalEmail: personalEmail || 'N/A',
            bloodGroup: bloodGroup || 'N/A',
            emergencyContactPerson: emergencyContactPerson || 'N/A',
            emergencyContactNumber: emergencyContactNumber || 'N/A',
          },
        });
      } else {
        // Create employee if doesn't exist
        employee = await tx.employee.create({
          data: {
            userId: user.id,
            employeeCode,
            departmentId,
            designationId,
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
            salary,
            status: status || 'ACTIVE',
            managerId: managerId || null,
            dob: dob ? new Date(dob) : new Date(),
            personalEmail: personalEmail || 'N/A',
            bloodGroup: bloodGroup || 'N/A',
            emergencyContactPerson: emergencyContactPerson || 'N/A',
            emergencyContactNumber: emergencyContactNumber || 'N/A',
          },
        });
      }
      isReactivated = true;
    } else {
      // Create new user
      user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          roleId: userRole.id,
          phone,
          address,
          state,
          city,
          country,
          zipCode,
        },
      });

      // Create employee record
      employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode,
          departmentId,
          designationId,
          joiningDate: joiningDate ? new Date(joiningDate) : undefined,
          salary,
          status: status || 'ACTIVE',
          managerId: managerId || null,
          dob: dob ? new Date(dob) : new Date(),
          personalEmail: personalEmail || 'N/A',
          bloodGroup: bloodGroup || 'N/A',
          emergencyContactPerson: emergencyContactPerson || 'N/A',
          emergencyContactNumber: emergencyContactNumber || 'N/A',
        },
      });
    }

    // Initialize leave balances for all leave types
    const currentYear = new Date().getFullYear();
    const leaveTypes = [
      'ANNUAL',
      'SICK',
      'PERSONAL',
      'CASUAL',
      'MATERNITY',
      'PATERNITY',
      'UNPAID',
    ];

    const defaults: any = {
      ANNUAL: 20,
      SICK: 10,
      PERSONAL: 5,
      CASUAL: 7,
      MATERNITY: 180,
      PATERNITY: 15,
      UNPAID: 0,
    };

    for (const leaveType of leaveTypes) {
      const existingBalance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_year_leaveType: {
            employeeId: employee.id,
            year: currentYear,
            leaveType: leaveType as any,
          },
        },
      });

      if (!existingBalance) {
        await tx.leaveBalance.create({
          data: {
            employeeId: employee.id,
            year: currentYear,
            leaveType: leaveType as any,
            totalLeaves: defaults[leaveType],
          },
        });
      }
    }

    return { user, employee, isReactivated };
  });

  return successResponse(
    res,
    { userId: result.user.id, employeeId: result.employee.id },
    result.isReactivated
      ? 'User & Employee Reactivated Successfully'
      : 'User & Employee Registered Successfully',
    SUCCESS_CODES.USER_REGISTERED,
    200
  );
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setAuthCookies(res, result.accessToken, result.rawRefreshToken);
  auditLog({
    action: 'LOGIN',
    entity: 'User',
    entityId: result.userDetails.id,
    performedBy: result.userDetails.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  return successResponse(res, { user_details: result.userDetails }, 'Successfully logged in', SUCCESS_CODES.USER_LOGGED_IN, 200);
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const raw = (req as any).cookies?.refreshToken;
  if (!raw) throw new HttpError(401, 'Refresh token missing', ERROR_CODES.UNAUTHORIZED);
  const result = await authService.refresh(raw);
  setAuthCookies(res, result.newAccessToken, result.newRawRefreshToken);
  return successResponse(res, null, 'Token refreshed', SUCCESS_CODES.USER_LOGGED_IN, 200);
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const data = await authService.getCurrentUser(req.user.id);
  return successResponse(res, data, 'User fetched successfully', SUCCESS_CODES.USER_LOGGED_IN, 200);
};

export const logoutUser = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (userId) {
    await authService.logout(userId);
    auditLog({ action: 'LOGOUT', entity: 'User', entityId: userId, performedBy: userId, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }
  res.clearCookie('authToken', { httpOnly: true, secure: true, sameSite: 'none' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/api/auth/refresh' });
  return successResponse(res, null, 'Logged out successfully', SUCCESS_CODES.USER_LOGGED_IN, 200);
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new HttpError(404, 'Email is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    throw new HttpError(404, 'User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { email },
    data: { resetToken, resetTokenExp },
  });

  await sendPasswordReset(email, resetToken);

  return successResponse(
    res,
    null,
    'Password reset link sent to your email',
    SUCCESS_CODES.PASSWORD_RESET_TOKEN_CREATED,
    200
  );
};

export const changePassword = async (req: Request, res: Response) => {
  await authService.changePassword(req.body);
  return successResponse(res, null, 'Password changed successfully', SUCCESS_CODES.PASSWORD_CHANGED, 200);
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    throw new HttpError(400, 'token and newPassword are required', ERROR_CODES.VALIDATION_ERROR);
  }
  await authService.changePassword({ token, newPassword });
  return successResponse(res, null, 'Password reset successfully', SUCCESS_CODES.PASSWORD_CHANGED, 200);
};

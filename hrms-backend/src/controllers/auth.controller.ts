import { PrismaClient, User } from '../../generated/prisma/client';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../model/response.model';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { rolePermissions } from '../utils/permission.utils';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

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
          role,
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
          role,
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

  if (!email || !password) {
    throw new HttpError(
      404,
      'Email and password are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRole: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new HttpError(
      400,
      'Invalid credentials',
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
    include: { user: true },
  });

  if (!employee) {
    throw new HttpError(
      400,
      'Invalid credentials',
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  // Check employee status
  if (employee.status === 'TERMINATED' || employee.status === 'INACTIVE') {
    throw new HttpError(
      403,
      `Account is ${employee.status.toLowerCase()}. Please contact HR.`,
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new HttpError(
      400,
      'Invalid credentials',
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee.id,
    },
    process.env.JWT_KEY as string,
    { expiresIn: '1h' }
  );

  let permissions: any = {};

  if (user.userRole) {
    // Transform DB permissions to the expected format: { resource: [actions] }
    permissions = user.userRole.permissions.reduce((acc: any, rp) => {
      const { resource, action } = rp.permission;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(action);
      return acc;
    }, {});
  } else {
    // Fallback to static permissions
    permissions = rolePermissions[user.role];
  }

  return successResponse(
    res,
    {
      token,
      user_details: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        roleName: user.userRole?.name,
        employeeId: employee.id,
        permissions,
      },
    },
    'Successfully logged in',
    SUCCESS_CODES.USER_LOGGED_IN,
    200
  );
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

  // TODO: send token via email
  // For now, just return
  return successResponse(
    res,
    {
      temp_token: resetToken,
    },
    'Reset token generated',
    SUCCESS_CODES.PASSWORD_RESET_TOKEN_CREATED,
    200
  );
};

// Step 2: Change Password

export const changePassword = async (req: Request, res: Response) => {
  const { userId, oldPassword, token, newPassword } = req.body;

  if (!newPassword) {
    throw new HttpError(
      404,
      'New Password Required',
      ERROR_CODES.NEW_PASSWORD_REQUIRED
    );
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new HttpError(
      400,
      'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  let user: any;

  if (token) {
    // Token-based password reset
    user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gte: new Date() },
      },
    });

    if (!user) {
      throw new HttpError(
        400,
        'Invalid or expired token',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new HttpError(
        400,
        'New password cannot be same as old password',
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  } else if (userId && oldPassword) {
    // Old-password-based change
    user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new HttpError(404, 'User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpError(
        400,
        'Old password is incorrect',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new HttpError(
        400,
        'New password cannot be same as old password',
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  } else {
    throw new HttpError(
      400,
      'Provide token or old password with userId',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: token ? null : undefined,
      resetTokenExp: token ? null : undefined,
    },
  });

  return successResponse(
    res,
    null,
    'Password changed successfully',
    SUCCESS_CODES.PASSWORD_CHANGED,
    200
  );
};

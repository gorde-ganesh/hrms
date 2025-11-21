import { Request, Response } from 'express';
import { ApiResponse } from '../model/response.model';
import {
  Employee,
  PayrollComponentType,
  PrismaClient,
} from '../../generated/prisma';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { HttpError } from '../utils/http-error';
import { stat } from 'fs';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

export const getMasterData = async (req: Request, res: Response) => {
  const roles = [
    { display_text: 'Admin', value: 'ADMIN' },
    { display_text: 'HR', value: 'HR' },
    { display_text: 'Employee', value: 'EMPLOYEE' },
    { display_text: 'Manager', value: 'MANAGER' },
  ];

  const leaveStatus = [
    { display_text: 'Pending', value: 'PENDING' },
    { display_text: 'Approved', value: 'APPROVED' },
    { display_text: 'Rejected', value: 'REJECTED' },
  ];

  const employeeStatus = [
    { display_text: 'Active', value: 'ACTIVE' },
    { display_text: 'Inactive', value: 'INACTIVE' },
  ];

  const attendanceType = [
    { display_text: 'Clock In', value: 'IN' },
    { display_text: 'Clock Out', value: 'OUT' },
  ];

  const componentType = [
    { display_text: 'Allowance', value: 'ALLOWANCE' },
    { display_text: 'Deduction', value: 'DEDUCTION' },
  ];

  // Example: get departments, positions from DB if dynamic
  const departments = await prisma.department.findMany().then((d) =>
    d
      .map((x) => {
        return { display_text: x.name, value: x.id };
      })
      .filter(Boolean)
  );

  const designations = await prisma.designation.findMany().then((p) =>
    p
      .map((x) => {
        return { display_text: x.name, value: x.id };
      })
      .filter(Boolean)
  );

  const payrollComponentTypes = await prisma.payrollComponentType
    .findMany()
    .then((p) =>
      p
        .map((x) => {
          return { display_text: x.name, value: x.name };
        })
        .filter(Boolean)
    );

  const user = req.user;
  const managers = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      employee: {
        status: 'ACTIVE',
      },
    },
    include: { employee: true },
    distinct: ['id'],
    orderBy: {
      employee: {
        id: 'asc',
      },
    },
  });

  const allManagers = managers.map((e) => ({
    value: e.employee?.id,
    display_text: e.name,
  }));

  if (!departments || !designations || !payrollComponentTypes) {
    throw new HttpError(
      500,
      'Error fetching master data',
      ERROR_CODES.SERVER_ERROR
    );
  }

  return successResponse(
    res,
    {
      ROLES: roles,
      DEPARTMENTS: departments,
      DESIGNATIONS: designations,
      LEAVE_STATUS: leaveStatus,
      LEAVE_TYPE: [
        { display_text: 'Annual Leave', value: 'ANNUAL' },
        { display_text: 'Sick Leave', value: 'SICK' },
        { display_text: 'Personal Leave', value: 'PERSONAL' },
        { display_text: 'Casual Leave', value: 'CASUAL' },
        { display_text: 'Maternity Leave', value: 'MATERNITY' },
        { display_text: 'Paternity Leave', value: 'PATERNITY' },
        { display_text: 'Unpaid Leave', value: 'UNPAID' },
      ],
      EMPLOYEE_STATUS: employeeStatus,
      ATTENDANCE_TYPE: attendanceType,
      PAYROLL_COMPONENT_TYPES: componentType,
      MANAGERS: allManagers,
    },
    'Data fetched',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const healthCheck = async (req: Request, res: Response) => {
  return successResponse(
    res,
    null,
    'API is healthy',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

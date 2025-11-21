import { PrismaClient, EmployeeStatus, Prisma } from '../../generated/prisma';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import {
  successResponse,
  createdResponse,
  noContentResponse,
} from '../utils/response-helper';

const prisma = new PrismaClient();

const ensureUniqueEmployeeCode = async (
  employeeCode?: string,
  excludeId?: string
) => {
  if (!employeeCode) return;
  const existing = await prisma.employee.findFirst({
    where: {
      employeeCode: employeeCode.trim(),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (existing) {
    throw new HttpError(
      400,
      'Employee code already exists',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

// ----------------- Add Employee -----------------
export const addEmployee = async (req: Request, res: Response) => {
  const {
    userId,
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

  if (!userId || !departmentId || !designationId || !joiningDate || !salary) {
    throw new HttpError(
      400,
      'Department, Position, Joining Date, and Salary are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  await ensureUniqueEmployeeCode(employeeCode);

  const existing = await prisma.employee.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.employee.update({
      where: { id: existing.id },
      data: { status: EmployeeStatus.ACTIVE },
    });

    return successResponse(
      res,
      null,
      'Employee activated successfully',
      SUCCESS_CODES.EMPLOYEE_UPDATED,
      200
    );
  }

  const employee = await prisma.employee.create({
    data: {
      userId: userId,
      employeeCode: employeeCode?.trim(),
      departmentId,
      designationId,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      salary,
      status: status || 'ACTIVE',
      managerId: managerId || null,
      dob: new Date(dob) || null, // default to today — replace if needed
      personalEmail: personalEmail || 'N/A',
      bloodGroup: bloodGroup || 'N/A',
      emergencyContactPerson: emergencyContactPerson || 'N/A',
      emergencyContactNumber: emergencyContactNumber || 'N/A',
    },
  });

  return createdResponse(
    res,
    employee,
    'Employee added successfully',
    SUCCESS_CODES.EMPLOYEE_CREATED
  );
};

// ----------------- Update Employee -----------------
export const updateEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
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

  const employee = await prisma.employee.findUnique({
    where: { id: id },
  });

  if (!employee) {
    throw new HttpError(
      404,
      'Employee not found',
      ERROR_CODES.EMPLOYEE_NOT_FOUND
    );
  }

  await ensureUniqueEmployeeCode(employeeCode, id);

  const updatedEmployee = await prisma.employee.update({
    where: { id: id },
    data: {
      employeeCode: employeeCode?.trim(),
      departmentId,
      designationId,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      salary: Number(salary),
      status: status || 'ACTIVE',
      managerId: managerId || null,
      dob: dob && new Date(dob), // default to today — replace if needed
      personalEmail: personalEmail || 'N/A',
      bloodGroup: bloodGroup || 'N/A',
      emergencyContactPerson: emergencyContactPerson || 'N/A',
      emergencyContactNumber: emergencyContactNumber || 'N/A',
    },
  });

  return successResponse(
    res,
    updatedEmployee,
    'Employee updated successfully',
    SUCCESS_CODES.EMPLOYEE_UPDATED,
    200
  );
};

// ----------------- Delete Employee -----------------
export const deleteEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;

  const employee = await prisma.employee.findUnique({
    where: { id: id },
  });

  if (!employee) {
    throw new HttpError(
      404,
      'Employee not found',
      ERROR_CODES.EMPLOYEE_NOT_FOUND
    );
  }

  await prisma.employee.update({
    where: { id: id },
    data: {
      status: EmployeeStatus.INACTIVE,
    },
  });

  return noContentResponse(
    res,
    'Employee Deleted Successfully',
    SUCCESS_CODES.EMPLOYEE_DELETED
  );
};

// ----------------- Get Single Employee -----------------
export const getEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;

  const employee = await prisma.employee.findUnique({
    where: { id: id },
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  if (!employee) {
    throw new HttpError(
      404,
      'Employee not found',
      ERROR_CODES.EMPLOYEE_NOT_FOUND
    );
  }

  return successResponse(
    res,
    employee,
    'Details fetched',
    SUCCESS_CODES.EMPLOYEE_FETCHED,
    200
  );
};

// ----------------- Get Employees List -----------------
export const getEmployees = async (req: Request, res: Response) => {
  let {
    pageno,
    top,
    departmentId,
    designationId,
    status = EmployeeStatus.ACTIVE,
    sortField = 'createdAt',
    sortOrder = 'desc',
    search,
  } = req.query;

  const skip = Math.max(Number(pageno) || 0, 0);
  const take = Math.max(Number(top) || 10, 1);

  const validSortFields: Array<keyof Prisma.EmployeeOrderByWithRelationInput> =
    ['createdAt', 'joiningDate', 'salary', 'employeeCode'];
  if (!validSortFields.includes(sortField as any)) {
    sortField = 'createdAt';
  }
  const normalizedSortOrder: 'asc' | 'desc' =
    (typeof sortOrder === 'string' &&
      (sortOrder.toLowerCase() === 'asc' ||
        sortOrder.toLowerCase() === 'desc') &&
      (sortOrder.toLowerCase() as 'asc' | 'desc')) ||
    'desc';

  const where: Prisma.EmployeeWhereInput = {};
  if (departmentId) where.departmentId = departmentId as string;
  if (designationId) where.designationId = designationId as string;
  if (status) where.status = status as EmployeeStatus;
  if (search) {
    where.OR = [
      { user: { email: { contains: search as string, mode: 'insensitive' } } },
      { user: { name: { contains: search as string, mode: 'insensitive' } } },
      { employeeCode: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.EmployeeOrderByWithRelationInput = {};
  orderBy[sortField as keyof Prisma.EmployeeOrderByWithRelationInput] =
    normalizedSortOrder;

  const [employees, totalRecords] = await Promise.all([
    prisma.employee.findMany({
      where,
      take,
      skip,
      orderBy,
      include: {
        user: { select: { name: true, email: true, role: true } },
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    }),
    prisma.employee.count({ where }),
  ]);

  return successResponse(
    res,
    { content: employees, totalRecords },
    'Data fetched',
    SUCCESS_CODES.EMPLOYEE_FETCHED,
    200
  );
};

export const fetchLastEmployeeCode = async (req: Request, res: Response) => {
  console.log(req, 'last code');
  const lastCode = await prisma.employee.findFirst({
    select: {
      employeeCode: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!lastCode) {
    throw new HttpError(404, 'Employee Code not found', ERROR_CODES.NOT_FOUND);
  }

  return successResponse(
    res,
    lastCode?.employeeCode,
    'Last employee code fetched',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

export const getEmployeeSummary = async (req: Request, res: Response) => {
  const [totalEmployees, activeEmployees, newEmployees, totalDepartments] =
    await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      prisma.employee.count({
        where: {
          joiningDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.department.count(),
    ]);

  return successResponse(
    res,
    {
      totalEmployees,
      activeEmployees,
      newEmployees,
      totalDepartments,
    },
    'Employee summary fetched',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

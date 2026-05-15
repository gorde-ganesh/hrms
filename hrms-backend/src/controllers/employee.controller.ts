import { EmployeeStatus } from '../../generated/prisma';
import { Request, Response } from 'express';
import { SUCCESS_CODES, ERROR_CODES } from '../utils/response-codes';
import { HttpError } from '../utils/http-error';
import {
  successResponse,
  createdResponse,
  noContentResponse,
} from '../utils/response-helper';
import { employeeService } from '../services/employee.service';
import { prisma } from '../lib/prisma';
import { auditLog } from '../utils/audit';

export const addEmployee = async (req: Request, res: Response) => {
  const result = await employeeService.create(req.body);
  return createdResponse(res, result, 'Employee added successfully', SUCCESS_CODES.EMPLOYEE_CREATED);
};

export const updateEmployee = async (req: Request, res: Response) => {
  const result = await employeeService.update((req.params.id as string), req.body);
  return successResponse(res, result, 'Employee updated successfully', SUCCESS_CODES.EMPLOYEE_UPDATED, 200);
};

export const deleteEmployee = async (req: Request, res: Response) => {
  await employeeService.softDelete((req.params.id as string));
  return noContentResponse(res, 'Employee deleted successfully', SUCCESS_CODES.EMPLOYEE_DELETED);
};

export const restoreEmployee = async (req: Request, res: Response) => {
  const result = await employeeService.restore((req.params.id as string));
  return successResponse(res, result, 'Employee restored successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const getEmployee = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role, employeeId } = req.user;

  // Employees can only fetch their own record
  if (role === 'EMPLOYEE' && employeeId !== id) {
    const { HttpError } = await import('../utils/http-error');
    const { ERROR_CODES } = await import('../utils/response-codes');
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const employee = await employeeService.findById(id);
  return successResponse(res, employee, 'Details fetched', SUCCESS_CODES.EMPLOYEE_FETCHED, 200);
};

export const getEmployees = async (req: Request, res: Response) => {
  const { pageno, skip, top, departmentId, designationId, status, sortField, sortOrder, search } = req.query;
  const result = await employeeService.list({
    pageno: Number(pageno ?? skip) || 0,
    top: Number(top),
    departmentId: departmentId as string,
    designationId: designationId as string,
    status: status as EmployeeStatus,
    sortField: sortField as string,
    sortOrder: sortOrder as string,
    search: search as string,
  });
  return successResponse(res, result, 'Data fetched', SUCCESS_CODES.EMPLOYEE_FETCHED, 200);
};

export const fetchLastEmployeeCode = async (_req: Request, res: Response) => {
  const code = await employeeService.getLastEmployeeCode();
  return successResponse(res, code, 'Last employee code fetched', SUCCESS_CODES.SUCCESS, 200);
};

export const getEmployeeSummary = async (_req: Request, res: Response) => {
  const summary = await employeeService.getSummary();
  return successResponse(res, summary, 'Employee summary fetched', SUCCESS_CODES.SUCCESS, 200);
};

export const offboardEmployee = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { reason } = req.body;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  if (employee.status === EmployeeStatus.TERMINATED) {
    throw new HttpError(400, 'Employee is already terminated', ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: { status: EmployeeStatus.TERMINATED },
  });

  auditLog({
    action: 'OFFBOARD',
    entity: 'Employee',
    entityId: id,
    performedBy: req.user.id,
    before: { status: employee.status },
    after: { status: EmployeeStatus.TERMINATED, reason },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
  });

  return successResponse(res, { employee: updated, reason }, 'Employee offboarded successfully', SUCCESS_CODES.SUCCESS, 200);
};

export const getEmployeeHierarchy = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      manager: {
        include: {
          user: { select: { name: true, email: true } },
          manager: {
            include: {
              user: { select: { name: true, email: true } },
              manager: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
        },
      },
      subordinates: {
        where: { deletedAt: null },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!employee) throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);

  return successResponse(res, employee, 'Hierarchy fetched', SUCCESS_CODES.SUCCESS, 200);
};

const DEFAULT_ONBOARDING_TASKS = [
  { title: 'Upload signed offer letter', category: 'DOCUMENTS' },
  { title: 'Submit government-issued ID proof', category: 'DOCUMENTS' },
  { title: 'Submit PAN card copy', category: 'DOCUMENTS' },
  { title: 'Provide bank account details for payroll', category: 'PAYROLL' },
  { title: 'Read and acknowledge HR policy document', category: 'POLICIES' },
  { title: 'IT account setup confirmation', category: 'IT_SETUP' },
  { title: 'Asset assignment (laptop/equipment)', category: 'IT_SETUP' },
];

export const inviteEmployee = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!employee) throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: { onboardingStatus: 'INVITED' },
    });

    const existing = await tx.onboardingTask.count({ where: { employeeId } });
    if (existing === 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await tx.onboardingTask.createMany({
        data: DEFAULT_ONBOARDING_TASKS.map((t) => ({ ...t, employeeId, dueDate })),
      });
    }
  });

  return successResponse(res, { employeeId, status: 'INVITED' }, 'Employee invited and onboarding tasks created', SUCCESS_CODES.SUCCESS, 200);
};

export const getOnboardingStatus = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const [employee, tasks] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, select: { onboardingStatus: true } }),
    prisma.onboardingTask.findMany({ where: { employeeId }, orderBy: { category: 'asc' } }),
  ]);
  if (!employee) throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);

  const completed = tasks.filter((t) => t.completed).length;
  return successResponse(res, { status: employee.onboardingStatus, tasks, progress: { completed, total: tasks.length } }, 'Onboarding status fetched', SUCCESS_CODES.SUCCESS, 200);
};

export const updateOnboardingTask = async (req: Request, res: Response) => {
  const { employeeId, taskId } = req.params;
  const { completed } = req.body;

  const task = await prisma.onboardingTask.findFirst({ where: { id: taskId, employeeId } });
  if (!task) throw new HttpError(404, 'Task not found', ERROR_CODES.NOT_FOUND);

  const updated = await prisma.onboardingTask.update({
    where: { id: taskId },
    data: { completed, completedAt: completed ? new Date() : null },
  });

  // Auto-advance onboarding status when all tasks are complete
  const remaining = await prisma.onboardingTask.count({ where: { employeeId, completed: false } });
  if (remaining === 0) {
    await prisma.employee.update({ where: { id: employeeId }, data: { onboardingStatus: 'COMPLETED' } });
  }

  return successResponse(res, updated, 'Task updated', SUCCESS_CODES.SUCCESS, 200);
};

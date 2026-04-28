import { EmployeeStatus } from '../../generated/prisma';
import { Request, Response } from 'express';
import { SUCCESS_CODES } from '../utils/response-codes';
import {
  successResponse,
  createdResponse,
  noContentResponse,
} from '../utils/response-helper';
import { employeeService } from '../services/employee.service';

export const addEmployee = async (req: Request, res: Response) => {
  const result = await employeeService.create(req.body);
  return createdResponse(res, result, 'Employee added successfully', SUCCESS_CODES.EMPLOYEE_CREATED);
};

export const updateEmployee = async (req: Request, res: Response) => {
  const result = await employeeService.update(req.params.id, req.body);
  return successResponse(res, result, 'Employee updated successfully', SUCCESS_CODES.EMPLOYEE_UPDATED, 200);
};

export const deleteEmployee = async (req: Request, res: Response) => {
  await employeeService.softDelete(req.params.id);
  return noContentResponse(res, 'Employee deleted successfully', SUCCESS_CODES.EMPLOYEE_DELETED);
};

export const getEmployee = async (req: Request, res: Response) => {
  const employee = await employeeService.findById(req.params.id);
  return successResponse(res, employee, 'Details fetched', SUCCESS_CODES.EMPLOYEE_FETCHED, 200);
};

export const getEmployees = async (req: Request, res: Response) => {
  const { pageno, top, departmentId, designationId, status, sortField, sortOrder, search } = req.query;
  const result = await employeeService.list({
    pageno: Number(pageno),
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

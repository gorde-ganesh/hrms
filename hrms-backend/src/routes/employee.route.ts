import {
  addEmployee,
  deleteEmployee,
  fetchLastEmployeeCode,
  getEmployee,
  getEmployees,
  updateEmployee,
  getEmployeeSummary,
} from '../controllers/employee.controller';
import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma';

function registerRouters(app: express.Application) {
  // app.post(
  //   '/api/employees',
  //   authenticate,
  //   roleAccess([Role.HR, Role.ADMIN]),
  //   addEmployee
  // );
  app.put(
    '/api/employees/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    updateEmployee
  );
  app.delete(
    '/api/employees/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    deleteEmployee
  );
  app.get(
    '/api/employees/summary',
    authenticate,
    roleAccess([Role.ADMIN, Role.HR, Role.MANAGER]),
    getEmployeeSummary
  );
  app.get(
    '/api/employees/last-employee-code',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    fetchLastEmployeeCode
  );
  app.get(
    '/api/employees/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    getEmployee
  );
  app.get(
    '/api/employees',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    getEmployees
  );
}

export default registerRouters;

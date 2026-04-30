import {
  addEmployee,
  deleteEmployee,
  restoreEmployee,
  fetchLastEmployeeCode,
  getEmployee,
  getEmployees,
  updateEmployee,
  getEmployeeSummary,
} from '../controllers/employee.controller';
import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { UpdateEmployeeSchema } from '../schemas/employee.schema';


function registerRouters(app: express.Application) {
  // app.post(
  //   '/api/employees',
  //   authenticate,
  //   roleAccess(['HR', 'ADMIN']),
  //   addEmployee
  // );
  app.put(
    '/api/employees/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(UpdateEmployeeSchema),
    updateEmployee
  );
  app.delete(
    '/api/employees/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    deleteEmployee
  );
  app.put(
    '/api/employees/:id/restore',
    authenticate,
    roleAccess(['ADMIN']),
    restoreEmployee
  );
  app.get(
    '/api/employees/summary',
    authenticate,
    roleAccess(['ADMIN', 'HR', 'MANAGER']),
    getEmployeeSummary
  );
  app.get(
    '/api/employees/last-employee-code',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    fetchLastEmployeeCode
  );
  app.get(
    '/api/employees/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getEmployee
  );
  app.get(
    '/api/employees',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    getEmployees
  );
}

export default registerRouters;

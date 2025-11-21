import express from 'express';
import {
  getPayrollComponents,
  createPayrollComponent,
  updatePayrollComponent,
  deletePayrollComponent,
  getAllPayrollComponents,
} from '../controllers/payroll-components.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma';

function registerRouters(app: express.Application) {
  app.get(
    '/api/payroll/components',
    authenticate,
    roleAccess([Role.ADMIN, Role.HR]),
    getAllPayrollComponents
  );
  app.get(
    '/api/payroll/components/:employeeId',
    authenticate,
    roleAccess([Role.ADMIN, Role.HR]),
    getPayrollComponents
  );
  app.post(
    '/api/payroll/components',
    authenticate,
    roleAccess([Role.ADMIN, Role.HR]),
    createPayrollComponent
  );
  app.put(
    '/api/payroll/components/:id',
    authenticate,
    roleAccess([Role.ADMIN, Role.HR]),
    updatePayrollComponent
  );
  app.delete(
    '/api/payroll/components/:id',
    authenticate,
    roleAccess([Role.ADMIN, Role.HR]),
    deletePayrollComponent
  );
}

export default registerRouters;

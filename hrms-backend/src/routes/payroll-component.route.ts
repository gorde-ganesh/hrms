import express from 'express';
import {
  getPayrollComponents,
  createPayrollComponent,
  updatePayrollComponent,
  deletePayrollComponent,
  getAllPayrollComponents,
} from '../controllers/payroll-components.controller';
import { authenticate, roleAccess, checkPermission } from '../middlewares/auth.middleware';


function registerRouters(app: express.Application) {
  app.get(
    '/api/payroll/components',
    authenticate,
    roleAccess(['ADMIN', 'HR']),
    getAllPayrollComponents
  );
  app.get(
    '/api/payroll/components/:employeeId',
    authenticate,
    roleAccess(['ADMIN', 'HR']),
    getPayrollComponents
  );
  app.post(
    '/api/payroll/components',
    authenticate,
    roleAccess(['ADMIN']),
    createPayrollComponent
  );
  app.put(
    '/api/payroll/components/:id',
    authenticate,
    roleAccess(['ADMIN', 'HR']),
    checkPermission('payroll', 'edit'),
    updatePayrollComponent
  );
  app.delete(
    '/api/payroll/components/:id',
    authenticate,
    roleAccess(['ADMIN']),
    deletePayrollComponent
  );
}

export default registerRouters;

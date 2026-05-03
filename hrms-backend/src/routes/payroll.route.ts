import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  downloadPayslip,
  generatePayroll,
  getPayroll,
  finalizePayroll,
  markPayrollPaid,
} from '../controllers/payroll.controller';
import { getAllPayrollComponents } from '../controllers/payroll-components.controller';
import { validate } from '../middlewares/validate';
import { GeneratePayrollSchema } from '../schemas/payroll.schema';


function registerRouters(app: express.Application) {
  app.get(
    '/api/payroll',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE']),
    getPayroll
  );
  app.post(
    '/api/payroll',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(GeneratePayrollSchema),
    generatePayroll
  );
  app.get(
    '/api/payroll/download/:payrollId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE']),
    downloadPayslip
  );
  app.post(
    '/api/payroll/:id/finalize',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    finalizePayroll
  );
  app.post(
    '/api/payroll/:id/mark-paid',
    authenticate,
    roleAccess(['ADMIN']),
    markPayrollPaid
  );
}

export default registerRouters;

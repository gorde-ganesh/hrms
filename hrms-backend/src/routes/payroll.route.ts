import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  downloadPayslip,
  generatePayroll,
  getPayroll,
  updatePayrollStatus,
  previewPayroll,
} from '../controllers/payroll.controller';
import { validate } from '../middlewares/validate';
import { GeneratePayrollSchema, UpdatePayrollStatusSchema } from '../schemas/payroll.schema';


function registerRouters(app: express.Application) {
  // List payroll records — employees see only their own (enforced in controller)
  app.get(
    '/api/payroll',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE']),
    getPayroll
  );

  // Dry-run preview — no DB write
  app.get(
    '/api/payroll/preview',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    previewPayroll
  );

  // Generate new payroll (creates in DRAFT state)
  app.post(
    '/api/payroll',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(GeneratePayrollSchema),
    generatePayroll
  );

  // State transitions: DRAFT→APPROVED→LOCKED→PAID
  app.patch(
    '/api/payroll/:payrollId/status',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(UpdatePayrollStatusSchema),
    updatePayrollStatus
  );

  // Download payslip PDF — ownership enforced in controller for EMPLOYEE role
  app.get(
    '/api/payroll/download/:payrollId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE']),
    downloadPayslip
  );
}

export default registerRouters;

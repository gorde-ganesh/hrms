import express from 'express';
import { authenticate, roleAccess, checkPermission } from '../middlewares/auth.middleware';
import {
  downloadPayslip,
  generatePayroll,
  generateBatchPayroll,
  getPayroll,
  finalizePayroll,
  markPayrollPaid,
} from '../controllers/payroll.controller';
import {
  createBankTransferBatch,
  getBankTransferBatches,
  downloadBankTransferCsv,
  markBatchSubmitted,
} from '../controllers/bank-transfer.controller';
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
    checkPermission('payroll', 'generate'),
    validate(GeneratePayrollSchema),
    generatePayroll
  );
  app.post(
    '/api/payroll/batch',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    checkPermission('payroll', 'generate'),
    generateBatchPayroll
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

  // ── Bank Transfer ──────────────────────────────────────────────────────────
  app.get(
    '/api/payroll/bank-transfer',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getBankTransferBatches
  );
  app.post(
    '/api/payroll/bank-transfer',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    createBankTransferBatch
  );
  app.get(
    '/api/payroll/bank-transfer/:batchId/download',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    downloadBankTransferCsv
  );
  app.post(
    '/api/payroll/bank-transfer/:batchId/submit',
    authenticate,
    roleAccess(['ADMIN']),
    markBatchSubmitted
  );
}

export default registerRouters;

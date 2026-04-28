import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  downloadPayslip,
  generatePayroll,
  getPayroll,
} from '../controllers/payroll.controller';
import { getAllPayrollComponents } from '../controllers/payroll-components.controller';
import { validate } from '../middlewares/validate';
import { GeneratePayrollSchema } from '../schemas/payroll.schema';
import { Role } from '../../generated/prisma';

function registerRouters(app: express.Application) {
  app.get(
    '/api/payroll',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE]),
    getPayroll
  );
  app.post(
    '/api/payroll',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    validate(GeneratePayrollSchema),
    generatePayroll
  );
  app.get(
    '/api/payroll/download/:payrollId',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE]),
    downloadPayslip
  );
}

export default registerRouters;

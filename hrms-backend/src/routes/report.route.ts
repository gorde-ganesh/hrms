import express from 'express';
import {
  leaveReport,
  payrollReport,
  attendanceReport,
  getDashboardSummary,
} from '../controllers/report.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma';

function registerRouters(app: express.Application) {
  app.get('/api/reports/leaves', authenticate, leaveReport);
  app.get('/api/dashboard/summary', authenticate, getDashboardSummary);
  app.get('/api/reports/payroll', authenticate, payrollReport);
  app.get('/api/reports/attendance', authenticate, attendanceReport);
}

export default registerRouters;

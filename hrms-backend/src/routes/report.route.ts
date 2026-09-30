import express from 'express';
import {
  leaveReport,
  payrollReport,
  attendanceReport,
} from '../controllers/report.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';


function registerRouters(app: express.Application) {
  app.get('/api/reports/leaves', authenticate, leaveReport);
  app.get('/api/reports/payroll', authenticate, payrollReport);
  app.get('/api/reports/attendance', authenticate, attendanceReport);
}

export default registerRouters;

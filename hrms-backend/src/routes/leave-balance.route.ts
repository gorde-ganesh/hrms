import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';

import {
  getEmployeeLeaveBalance,
  getLeaveBalanceSummary,
  updateLeaveBalance,
  initializeLeaveBalances,
} from '../controllers/leave-balance.controller';

function registerRouters(app: express.Application) {
  // Get employee leave balances
  app.get(
    '/api/leave-balance/:employeeId',
    authenticate,
    roleAccess(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']),
    getEmployeeLeaveBalance
  );

  // Get employee leave balance summary
  app.get(
    '/api/leave-balance/:employeeId/summary',
    authenticate,
    roleAccess(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']),
    getLeaveBalanceSummary
  );

  // Update leave balance (HR/Admin only)
  app.put(
    '/api/leave-balance/:employeeId',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    updateLeaveBalance
  );

  // Initialize leave balances (HR/Admin only)
  app.post(
    '/api/leave-balance/:employeeId/initialize',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    initializeLeaveBalances
  );
}

export default registerRouters;

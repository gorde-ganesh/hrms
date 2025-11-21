import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma';
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
    roleAccess([Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.ADMIN]),
    getEmployeeLeaveBalance
  );

  // Get employee leave balance summary
  app.get(
    '/api/leave-balance/:employeeId/summary',
    authenticate,
    roleAccess([Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.ADMIN]),
    getLeaveBalanceSummary
  );

  // Update leave balance (HR/Admin only)
  app.put(
    '/api/leave-balance/:employeeId',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    updateLeaveBalance
  );

  // Initialize leave balances (HR/Admin only)
  app.post(
    '/api/leave-balance/:employeeId/initialize',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    initializeLeaveBalances
  );
}

export default registerRouters;

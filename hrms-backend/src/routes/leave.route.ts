import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma';
import {
  applyLeave,
  getAllLeaves,
  getEmployeeLeaves,
  getTeamLeaves,
  getUpcomingLeaves,
  updateLeaveStatus,
} from '../controllers/leave.controller';
function registerRouters(app: express.Application) {
  app.post(
    '/api/leaves',
    authenticate,
    roleAccess([Role.EMPLOYEE, Role.HR, Role.MANAGER]),
    applyLeave
  );
  app.patch(
    '/api/leaves/:id/status',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    updateLeaveStatus
  );
  app.get(
    '/api/leaves/:employeeId',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    getEmployeeLeaves
  );
  app.get(
    '/api/leaves/:managerId/team',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    getTeamLeaves
  );
  app.get(
    '/api/leaves',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    getAllLeaves
  );
  app.get(
    '/api/leaves/upcoming',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    getUpcomingLeaves
  );
}

export default registerRouters;

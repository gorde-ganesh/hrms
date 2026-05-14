import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { CreateLeaveSchema, UpdateLeaveStatusSchema } from '../schemas/leave.schema';

import {
  applyLeave,
  cancelLeave,
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
    roleAccess(['EMPLOYEE', 'HR', 'MANAGER']),
    validate(CreateLeaveSchema),
    applyLeave
  );
  app.patch(
    '/api/leaves/:id/status',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    validate(UpdateLeaveStatusSchema),
    updateLeaveStatus
  );
  app.delete(
    '/api/leaves/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    cancelLeave
  );
  app.get(
    '/api/leaves/upcoming',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getUpcomingLeaves
  );
  app.get(
    '/api/leaves/:employeeId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getEmployeeLeaves
  );
  app.get(
    '/api/leaves/:managerId/team',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getTeamLeaves
  );
  app.get(
    '/api/leaves',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    getAllLeaves
  );
}

export default registerRouters;

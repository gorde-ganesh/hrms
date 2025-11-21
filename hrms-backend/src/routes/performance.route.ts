import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  addAppraisal,
  updateAppraisal,
  getEmployeePerformance,
} from '../controllers/performance.controller';
import { Role } from '../../generated/prisma/client';

function registerRouters(app: express.Application) {
  app.post(
    '/api/performance',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    addAppraisal
  ); // Add appraisal (HR/Admin)
  app.put(
    '/api/performance/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    updateAppraisal
  ); // Update appraisal (HR/Admin)
  app.get(
    '/api/performance/:employeeId',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    getEmployeePerformance
  ); // Get appraisal
}

export default registerRouters;

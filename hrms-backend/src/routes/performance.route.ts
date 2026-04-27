import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  addAppraisal,
  updateAppraisal,
  getEmployeePerformance,
  getAllPerformance,
  getTeamPerformance,
} from '../controllers/performance.controller';
import { Role } from '../../generated/prisma/client';

function registerRouters(app: express.Application) {
  app.post(
    '/api/performance',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    addAppraisal
  );

  app.put(
    '/api/performance/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.MANAGER]),
    updateAppraisal
  );

  // Must come before /:employeeId to avoid route shadowing
  app.get(
    '/api/performance/all',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getAllPerformance
  );

  app.get(
    '/api/performance/team',
    authenticate,
    roleAccess([Role.MANAGER]),
    getTeamPerformance
  );

  app.get(
    '/api/performance/:employeeId',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    getEmployeePerformance
  );
}

export default registerRouters;

import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  addAppraisal,
  updateAppraisal,
  getEmployeePerformance,
  getAllPerformance,
  getTeamPerformance,
} from '../controllers/performance.controller';


function registerRouters(app: express.Application) {
  app.post(
    '/api/performance',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    addAppraisal
  );

  app.put(
    '/api/performance/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    updateAppraisal
  );

  // Must come before /:employeeId to avoid route shadowing
  app.get(
    '/api/performance/all',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getAllPerformance
  );

  app.get(
    '/api/performance/team',
    authenticate,
    roleAccess(['MANAGER']),
    getTeamPerformance
  );

  app.get(
    '/api/performance/:employeeId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getEmployeePerformance
  );
}

export default registerRouters;

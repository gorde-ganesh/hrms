import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  addAppraisal,
  updateAppraisal,
  submitAppraisal,
  reviewAppraisal,
  finalizeAppraisal,
  deleteAppraisal,
  getEmployeePerformance,
  getAllPerformance,
  getTeamPerformance,
  getPerformanceTrends,
  getTeamPerformanceSummary,
} from '../controllers/performance.controller';


function registerRouters(app: express.Application) {
  app.post(
    '/api/performance',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER', 'EMPLOYEE']),
    addAppraisal
  );

  app.put(
    '/api/performance/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    updateAppraisal
  );

  app.post(
    '/api/performance/:id/submit',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER', 'EMPLOYEE']),
    submitAppraisal
  );

  app.post(
    '/api/performance/:id/review',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'MANAGER']),
    reviewAppraisal
  );

  app.post(
    '/api/performance/:id/finalize',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    finalizeAppraisal
  );

  app.delete(
    '/api/performance/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE']),
    deleteAppraisal
  );

  // Static routes before parameterized ones
  app.get(
    '/api/performance/all',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getAllPerformance
  );

  app.get(
    '/api/performance/team',
    authenticate,
    roleAccess(['MANAGER', 'HR', 'ADMIN']),
    getTeamPerformance
  );

  app.get(
    '/api/performance/team/:managerId/summary',
    authenticate,
    roleAccess(['MANAGER', 'HR', 'ADMIN']),
    getTeamPerformanceSummary
  );

  app.get(
    '/api/performance/trends/:employeeId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getPerformanceTrends
  );

  app.get(
    '/api/performance/:employeeId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getEmployeePerformance
  );
}

export default registerRouters;

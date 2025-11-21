import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  clockInOut,
  getAttendance,
  getAttendanceSummary,
  getAttendenceById,
  getTeamAttendance,
  getAllEmployeesAttendance,
  updateAttendance,
  bulkMarkAttendance,
  getAttendanceReport,
} from '../controllers/attendence.controller';
import { Role } from '../../generated/prisma/client';

function registerRouters(app: express.Application) {
  // Clock in/out - All roles can mark their own attendance
  app.post(
    '/api/attendance',
    authenticate,
    roleAccess([Role.EMPLOYEE, Role.HR, Role.MANAGER, Role.ADMIN]),
    clockInOut
  );

  // Get all attendance (Admin/HR view)
  app.get(
    '/api/attendance',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getAttendance
  );

  // IMPORTANT: Specific routes MUST come before parameterized routes

  // Get team attendance (Manager view)
  app.get(
    '/api/attendance/team',
    authenticate,
    roleAccess([Role.MANAGER]),
    getTeamAttendance
  );

  // Get all employees attendance with filters (HR/Admin view)
  app.get(
    '/api/attendance/all',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getAllEmployeesAttendance
  );

  // Get attendance summary by employee ID
  app.get(
    '/api/attendance/summary/:employeeId',
    authenticate,
    roleAccess([Role.EMPLOYEE, Role.HR, Role.ADMIN, Role.MANAGER]),
    getAttendanceSummary
  );

  // Get attendance report (all roles, filtered by role)
  app.get(
    '/api/attendance/report',
    authenticate,
    roleAccess([Role.EMPLOYEE, Role.HR, Role.ADMIN, Role.MANAGER]),
    getAttendanceReport
  );

  // Get attendance by employee ID - MUST come after specific routes
  app.get(
    '/api/attendance/:employeeId',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    getAttendenceById
  );

  // Update attendance record (HR/Admin only)
  app.put(
    '/api/attendance/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    updateAttendance
  );

  // Bulk mark attendance (HR/Admin only)
  app.post(
    '/api/attendance/bulk',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    bulkMarkAttendance
  );
}

export default registerRouters;

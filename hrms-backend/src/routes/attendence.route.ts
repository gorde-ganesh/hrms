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


function registerRouters(app: express.Application) {
  // Clock in/out - All roles can mark their own attendance
  app.post(
    '/api/attendance',
    authenticate,
    roleAccess(['EMPLOYEE', 'HR', 'MANAGER', 'ADMIN']),
    clockInOut
  );

  // Get all attendance (Admin/HR view)
  app.get(
    '/api/attendance',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getAttendance
  );

  // IMPORTANT: Specific routes MUST come before parameterized routes

  // Get team attendance (Manager view)
  app.get(
    '/api/attendance/team',
    authenticate,
    roleAccess(['MANAGER']),
    getTeamAttendance
  );

  // Get all employees attendance with filters (HR/Admin view)
  app.get(
    '/api/attendance/all',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getAllEmployeesAttendance
  );

  // Get attendance summary by employee ID
  app.get(
    '/api/attendance/summary/:employeeId',
    authenticate,
    roleAccess(['EMPLOYEE', 'HR', 'ADMIN', 'MANAGER']),
    getAttendanceSummary
  );

  // Get attendance report (all roles, filtered by role)
  app.get(
    '/api/attendance/report',
    authenticate,
    roleAccess(['EMPLOYEE', 'HR', 'ADMIN', 'MANAGER']),
    getAttendanceReport
  );

  // Get attendance by employee ID - MUST come after specific routes
  app.get(
    '/api/attendance/:employeeId',
    authenticate,
    roleAccess(['HR', 'ADMIN', 'EMPLOYEE', 'MANAGER']),
    getAttendenceById
  );

  // Update attendance record (HR/Admin only)
  app.put(
    '/api/attendance/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    updateAttendance
  );

  // Bulk mark attendance (HR/Admin only)
  app.post(
    '/api/attendance/bulk',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    bulkMarkAttendance
  );
}

export default registerRouters;

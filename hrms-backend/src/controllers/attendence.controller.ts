import { AttendanceStatus, PrismaClient } from '../../generated/prisma/client';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse, createdResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

/**
 * Fetch attendance records (Admin / HR View)
 */
export const getAttendance = async (req: Request, res: Response) => {
  const { skip, top, month, year } = req.query;

  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

  const [attendances, totalRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: start, lte: end },
      },
      skip: skip ? Number(skip) : 0,
      take: top ? Number(top) : 10,
      orderBy: { attendanceDate: 'asc' },
      include: { employee: true },
    }),
    prisma.attendance.count({
      where: { attendanceDate: { gte: start, lte: end } },
    }),
  ]);

  if (!attendances || attendances.length === 0) {
    throw new HttpError(404, 'No records found', ERROR_CODES.NOT_FOUND);
  }

  return successResponse(
    res,
    { content: attendances, totalRecords },
    'Attendence records fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Fetch attendance records by Employee ID
 */
export const getAttendenceById = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { skip, top, month, year } = req.query;

  if (!employeeId) {
    throw new HttpError(
      400,
      'Missing required fields',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const start =
    month && year ? new Date(Number(year), Number(month) - 1, 1) : new Date(0);
  const end =
    month && year
      ? new Date(Number(year), Number(month), 0, 23, 59, 59)
      : new Date();

  const [records, totalRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId: String(employeeId),
        attendanceDate: { gte: start, lte: end },
      },
      skip: skip ? Number(skip) : 0,
      take: top ? Number(top) : 10,
      orderBy: { attendanceDate: 'asc' },
    }),
    prisma.attendance.count({
      where: {
        employeeId: String(employeeId),
        attendanceDate: { gte: start, lte: end },
      },
    }),
  ]);

  if (!records || records.length === 0) {
    throw new HttpError(404, 'No records found', ERROR_CODES.NOT_FOUND);
  }

  return successResponse(
    res,
    { content: records, totalRecords },
    'Attendence records fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Clock In / Clock Out endpoint
 */
export const clockInOut = async (req: Request, res: Response) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    throw new HttpError(
      400,
      'employeeId is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  const today = new Date();
  const attendanceDate = new Date(today.toDateString()); // strip time
  const existing = await prisma.attendance.findFirst({
    where: { employeeId, attendanceDate },
  });

  if (!existing) {
    // Clock-in
    const record = await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate,
        checkIn: today,
        status: AttendanceStatus.PRESENT,
      },
    });

    return createdResponse(
      res,
      record,
      'Attendence record created successfully',
      SUCCESS_CODES.SUCCESS
    );
  }

  if (!existing.checkOut) {
    // Clock-out
    const totalHours =
      (today.getTime() - new Date(existing.checkIn!).getTime()) /
      (1000 * 60 * 60);

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: today, totalHours },
    });

    return createdResponse(
      res,
      record,
      'Attendence record updated successfully',
      SUCCESS_CODES.SUCCESS
    );
  }

  throw new HttpError(
    400,
    'Already clocked out for today',
    ERROR_CODES.VALIDATION_ERROR
  );
};

export const getAttendanceSummary = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;

  if (!employeeId || !month || !year) {
    throw new HttpError(
      400,
      'employeeId, month, and year are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

  // Fetch attendance for month
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      employeeId,
      attendanceDate: { gte: start, lte: end },
    },
  });

  const data = await prisma.attendance.findMany({
    where: { employeeId: employeeId },
    orderBy: { attendanceDate: 'desc' },
    take: 7,
  });

  // --- 1️⃣ Working Days (Weekdays only)
  let workingDays = 0;
  const date = new Date(start);
  while (date <= end) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) workingDays++; // exclude Sat/Sun
    date.setDate(date.getDate() + 1);
  }

  // --- 2️⃣ Present Days
  const presentDays = attendanceRecords.filter(
    (a) => a.status === 'PRESENT' && a.checkIn
  ).length;

  // --- 3️⃣ Absent Days
  const absentDays = Math.max(workingDays - presentDays, 0);

  // --- 4️⃣ Avg Work Hours (for present days only)
  const totalHours = attendanceRecords.reduce(
    (sum, r) => sum + (r.totalHours || 0),
    0
  );
  const avgHours = presentDays > 0 ? totalHours / presentDays : 0;

  // --- 5️⃣ Today’s Record
  const today = new Date();
  const todayDate = new Date(today.toDateString());
  const todayRecord = await prisma.attendance.findFirst({
    where: { employeeId, attendanceDate: todayDate },
  });

  const isCheckedIn = !!todayRecord?.checkIn && !todayRecord?.checkOut;
  const checkInTime = todayRecord?.checkIn || null;
  const status = todayRecord?.status;
  const todayHours = todayRecord?.totalHours;

  // --- ✅ Response
  return successResponse(
    res,
    {
      workingDays,
      presentDays,
      absentDays,
      avgHours: Number(avgHours.toFixed(1)),
      today: {
        isCheckedIn,
        checkInTime,
        status,
        totalHours: todayHours,
      },
      history: data
        .map((d) => ({
          date: d.attendanceDate,
          totalHours: d.totalHours,
          status: d.status,
        }))
        .reverse(),
    },
    'Attendance summary fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Get Team Attendance (Manager View)
 * Fetches attendance records for all subordinates of the logged-in manager
 */
export const getTeamAttendance = async (req: Request, res: Response) => {
  const { skip, top, month, year, search, status } = req.query;
  const user = (req as any).user;

  if (!user || !user.employeeId) {
    throw new HttpError(
      401,
      'Unauthorized - Employee ID required',
      ERROR_CODES.UNAUTHORIZED
    );
  }

  // Get manager's employee record
  const manager = await prisma.employee.findUnique({
    where: { id: user.employeeId },
  });

  if (!manager) {
    throw new HttpError(404, 'Manager not found', ERROR_CODES.NOT_FOUND);
  }

  // Build date range filter
  const now = new Date();
  const start =
    month && year
      ? new Date(Number(year), Number(month) - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const end =
    month && year
      ? new Date(Number(year), Number(month), 0, 23, 59, 59)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Build where clause
  const whereClause: any = {
    employee: {
      managerId: manager.id,
    },
    attendanceDate: { gte: start, lte: end },
  };

  if (status) {
    whereClause.status = status;
  }

  if (search) {
    whereClause.employee = {
      ...whereClause.employee,
      user: {
        name: { contains: String(search), mode: 'insensitive' },
      },
    };
  }

  const [attendances, totalRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: whereClause,
      skip: skip ? Number(skip) : 0,
      take: top ? Number(top) : 10,
      orderBy: { attendanceDate: 'desc' },
      include: {
        employee: {
          include: {
            user: { select: { name: true, email: true } },
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendance.count({ where: whereClause }),
  ]);

  return successResponse(
    res,
    { content: attendances, totalRecords },
    'Team attendance records fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Get All Employees Attendance (HR/Admin View)
 * Fetches attendance records for all employees with advanced filtering
 */
export const getAllEmployeesAttendance = async (
  req: Request,
  res: Response
) => {
  const {
    skip,
    top,
    month,
    year,
    search,
    status,
    departmentId,
    designationId,
  } = req.query;

  // Build date range filter
  const now = new Date();
  const start =
    month && year
      ? new Date(Number(year), Number(month) - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const end =
    month && year
      ? new Date(Number(year), Number(month), 0, 23, 59, 59)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Build where clause
  const whereClause: any = {
    attendanceDate: { gte: start, lte: end },
  };

  if (status) {
    whereClause.status = status;
  }

  const employeeFilter: any = {};

  if (departmentId) {
    employeeFilter.departmentId = String(departmentId);
  }

  if (designationId) {
    employeeFilter.designationId = String(designationId);
  }

  if (search) {
    employeeFilter.user = {
      name: { contains: String(search), mode: 'insensitive' },
    };
  }

  if (Object.keys(employeeFilter).length > 0) {
    whereClause.employee = employeeFilter;
  }

  const [attendances, totalRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: whereClause,
      skip: skip ? Number(skip) : 0,
      take: top ? Number(top) : 10,
      orderBy: { attendanceDate: 'desc' },
      include: {
        employee: {
          include: {
            user: { select: { name: true, email: true } },
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendance.count({ where: whereClause }),
  ]);

  return successResponse(
    res,
    { content: attendances, totalRecords },
    'All employees attendance records fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Update Attendance Record (HR/Admin only)
 * Allows manual correction of attendance records
 */
export const updateAttendance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { checkIn, checkOut, status, attendanceDate } = req.body;

  if (!id) {
    throw new HttpError(
      400,
      'Attendance ID is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Check if attendance record exists
  const existing = await prisma.attendance.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new HttpError(
      404,
      'Attendance record not found',
      ERROR_CODES.NOT_FOUND
    );
  }

  // Build update data
  const updateData: any = {};

  if (checkIn !== undefined) {
    updateData.checkIn = checkIn ? new Date(checkIn) : null;
  }

  if (checkOut !== undefined) {
    updateData.checkOut = checkOut ? new Date(checkOut) : null;
  }

  if (status !== undefined) {
    updateData.status = status;
  }

  if (attendanceDate !== undefined) {
    updateData.attendanceDate = new Date(attendanceDate);
  }

  // Calculate total hours if both checkIn and checkOut are provided
  const finalCheckIn =
    updateData.checkIn !== undefined ? updateData.checkIn : existing.checkIn;
  const finalCheckOut =
    updateData.checkOut !== undefined ? updateData.checkOut : existing.checkOut;

  if (finalCheckIn && finalCheckOut) {
    const totalHours =
      (new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime()) /
      (1000 * 60 * 60);
    updateData.totalHours = totalHours;
  }

  // Update the record
  const updated = await prisma.attendance.update({
    where: { id },
    data: updateData,
  });

  return successResponse(
    res,
    updated,
    'Attendance record updated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Bulk Mark Attendance (HR/Admin only)
 * Marks multiple employees as present/absent/leave for a specific date
 */
export const bulkMarkAttendance = async (req: Request, res: Response) => {
  const { employeeIds, date, status } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new HttpError(
      400,
      'Employee IDs array is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!date) {
    throw new HttpError(400, 'Date is required', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!status || !['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'].includes(status)) {
    throw new HttpError(
      400,
      'Valid status is required (PRESENT, ABSENT, HALF_DAY, LEAVE)',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Validate all employees exist
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
  });

  if (employees.length !== employeeIds.length) {
    throw new HttpError(
      400,
      'One or more employee IDs are invalid',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Create or update attendance records
  const results = [];
  for (const employeeId of employeeIds) {
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate,
      },
    });

    if (existing) {
      // Update existing record
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status },
      });
      results.push(updated);
    } else {
      // Create new record
      const created = await prisma.attendance.create({
        data: {
          employeeId,
          attendanceDate,
          status,
          checkIn: status === 'PRESENT' ? attendanceDate : null,
        },
      });
      results.push(created);
    }
  }

  return successResponse(
    res,
    results,
    `Bulk attendance marked successfully for ${results.length} employees`,
    SUCCESS_CODES.SUCCESS,
    200
  );
};

/**
 * Get Attendance Report
 * Generates attendance report data for export
 */
export const getAttendanceReport = async (req: Request, res: Response) => {
  const { month, year, departmentId, designationId } = req.query;
  const user = (req as any).user;

  if (!month || !year) {
    throw new HttpError(
      400,
      'Month and year are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

  // Build where clause based on role
  const whereClause: any = {};

  if (user.role === 'MANAGER') {
    // Manager can only see subordinates
    const manager = await prisma.employee.findUnique({
      where: { id: user.employeeId },
    });

    if (!manager) {
      throw new HttpError(404, 'Manager not found', ERROR_CODES.NOT_FOUND);
    }

    whereClause.managerId = manager.id;
  } else if (user.role === 'EMPLOYEE') {
    // Employee can only see their own
    whereClause.id = user.employeeId;
  }
  // HR/Admin can see all, no additional filter needed

  if (departmentId) {
    whereClause.departmentId = String(departmentId);
  }

  if (designationId) {
    whereClause.designationId = String(designationId);
  }

  // Get all employees based on filter
  const employees = await prisma.employee.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      department: { select: { name: true } },
      designation: { select: { name: true } },
      attendance: {
        where: {
          attendanceDate: { gte: start, lte: end },
        },
        orderBy: { attendanceDate: 'asc' },
      },
    },
  });

  // Calculate statistics for each employee
  const reportData = employees.map((emp) => {
    const presentDays = emp.attendance.filter(
      (a) => a.status === 'PRESENT'
    ).length;
    const absentDays = emp.attendance.filter(
      (a) => a.status === 'ABSENT'
    ).length;
    const halfDays = emp.attendance.filter(
      (a) => a.status === 'HALF_DAY'
    ).length;
    const leaveDays = emp.attendance.filter((a) => a.status === 'LEAVE').length;

    const totalHours = emp.attendance.reduce(
      (sum, a) => sum + (a.totalHours || 0),
      0
    );
    const avgHours = presentDays > 0 ? totalHours / presentDays : 0;

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.user.name,
      email: emp.user.email,
      department: emp.department?.name || 'N/A',
      designation: emp.designation?.name || 'N/A',
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      totalHours: Number(totalHours.toFixed(2)),
      avgHours: Number(avgHours.toFixed(2)),
      attendanceRecords: emp.attendance,
    };
  });

  return successResponse(
    res,
    {
      month: Number(month),
      year: Number(year),
      employees: reportData,
    },
    'Attendance report generated successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

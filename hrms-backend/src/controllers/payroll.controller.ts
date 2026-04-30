import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { sendNotification } from '../utils/notification';
import { prisma } from '../lib/prisma';
import { calculatePayroll, validateStateTransition } from '../services/payroll.service';
import { PayrollStatus } from '../../generated/prisma';

// ----------------- Generate Payroll -----------------
export const generatePayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year, lopDays = 0 } = req.body;

  // Verify employee exists (salary check happens inside calculatePayroll)
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  const calc = await calculatePayroll(employeeId, month, year, lopDays);

  // Atomic check-and-create inside a transaction to prevent double runs
  const payroll = await prisma.$transaction(async (tx) => {
    const existing = await tx.payroll.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    });

    if (existing) {
      throw new HttpError(
        409,
        `Payroll for ${month}/${year} already exists for this employee`,
        ERROR_CODES.PAYROLL_DUPLICATE
      );
    }

    return tx.payroll.create({
      data: {
        employeeId,
        month,
        year,
        grossSalary: calc.grossSalary,
        netSalary: calc.netSalary,
        lopDays,
        status: PayrollStatus.DRAFT,
        components: {
          create: calc.components.map((c) => ({
            componentTypeId: c.componentTypeId,
            amount: c.amount,
            snapshotName: c.snapshotName,
            snapshotType: c.snapshotType,
            snapshotPercent: c.snapshotPercent,
          })),
        },
      },
      include: { components: { include: { componentType: true } } },
    });
  });

  await sendNotification({
    employeeIds: [employeeId],
    type: 'PAYROLL',
    message: `Payroll for ${month}/${year} generated (DRAFT). Net Salary: ₹${calc.netSalary.toFixed(2)}`,
  });

  return successResponse(
    res,
    payroll,
    'Payroll generated successfully',
    SUCCESS_CODES.PAYROLL_CREATED,
    201
  );
};

// ----------------- Get Payroll Records -----------------
export const getPayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year, skip, top } = req.query;
  const user = req.user;

  // Employees can only see their own payroll
  const resolvedEmployeeId =
    user.role === 'EMPLOYEE' ? user.employeeId : (employeeId as string | undefined);

  const where = {
    employeeId: resolvedEmployeeId ?? undefined,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
  };

  const [payroll, totalRecords] = await Promise.all([
    prisma.payroll.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: skip ? Number(skip) : 0,
      take: top ? Number(top) : 10,
      include: {
        employee: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.payroll.count({ where }),
  ]);

  return successResponse(
    res,
    { content: payroll, totalRecords },
    'Payroll records fetched',
    SUCCESS_CODES.PAYROLL_FETCHED
  );
};

// ----------------- Payroll State Transitions -----------------
export const updatePayrollStatus = async (req: Request, res: Response) => {
  const payrollId = req.params.payrollId;
  const { status: nextStatus } = req.body;
  const user = req.user;

  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });

  if (!payroll) {
    throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);
  }

  validateStateTransition(payroll.status, nextStatus as PayrollStatus);

  const now = new Date();
  const updated = await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: nextStatus,
      ...(nextStatus === PayrollStatus.APPROVED && {
        approvedBy: user.id,
        approvedAt: now,
      }),
      ...(nextStatus === PayrollStatus.LOCKED && { lockedAt: now }),
      ...(nextStatus === PayrollStatus.PAID && { paidAt: now }),
    },
  });

  if (nextStatus === PayrollStatus.PAID) {
    await sendNotification({
      employeeIds: [payroll.employeeId],
      type: 'PAYROLL',
      message: `Your salary for ${payroll.month}/${payroll.year} has been credited. Net: ₹${Number(payroll.netSalary).toFixed(2)}`,
    });
  }

  return successResponse(res, updated, `Payroll moved to ${nextStatus}`, SUCCESS_CODES.SUCCESS);
};

// ----------------- Preview Payroll (dry-run, no DB write) -----------------
export const previewPayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year, lopDays = 0 } = req.query;

  const calc = await calculatePayroll(
    employeeId as string,
    Number(month),
    Number(year),
    Number(lopDays)
  );

  return successResponse(res, calc, 'Payroll preview calculated', SUCCESS_CODES.SUCCESS);
};

// ----------------- Download Payslip -----------------
export const downloadPayslip = async (req: Request, res: Response) => {
  const payrollId = req.params.payrollId;
  const user = req.user;

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: { include: { user: true } },
      components: true,
    },
  });

  if (!payroll) {
    throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);
  }

  // Employees can only download their own payslip
  if (user.role === 'EMPLOYEE' && payroll.employeeId !== user.employeeId) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const departmentName = payroll.employee.departmentId
    ? (
        await prisma.department.findUnique({
          where: { id: payroll.employee.departmentId },
          select: { name: true },
        })
      )?.name ?? 'N/A'
    : 'N/A';

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=payslip-${payroll.employee.user.name}-${payroll.month}-${payroll.year}.pdf`
  );

  doc.pipe(res);

  const drawLine = (y: number) => {
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke('#E5E7EB');
  };

  // Header
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#1F2937').text('PAYSLIP', { align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Salary Statement', { align: 'center' }).moveDown(2);

  drawLine(doc.y);
  doc.moveDown();

  // Employee info
  const leftCol = 50;
  const rightCol = 320;
  let currentY = doc.y;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Employee Information', leftCol, currentY);
  currentY += 20;

  const infoRows = [
    ['Employee Name', payroll.employee.user.name],
    ['Employee Code', payroll.employee.employeeCode],
    ['Department', departmentName],
  ];

  for (const [label, value] of infoRows) {
    doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(`${label}:`, leftCol, currentY);
    doc.font('Helvetica-Bold').fillColor('#1F2937').text(value, leftCol + 110, currentY);
    currentY += 15;
  }

  currentY = doc.y - 45;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const rightRows: [string, string][] = [
    ['Pay Period', `${monthNames[payroll.month - 1]} ${payroll.year}`],
    ['Annual CTC', `₹${Number(payroll.employee.salary ?? 0).toLocaleString('en-IN')}`],
    ['Status', payroll.status],
  ];

  if (payroll.lopDays > 0) {
    rightRows.push(['LOP Days', String(payroll.lopDays)]);
  }

  for (const [label, value] of rightRows) {
    doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(`${label}:`, rightCol, currentY);
    doc.font('Helvetica-Bold').fillColor('#1F2937').text(value, rightCol + 80, currentY);
    currentY += 15;
  }

  doc.moveDown(3);
  drawLine(doc.y);
  doc.moveDown(1.5);

  // Components table
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Salary Components', leftCol, doc.y);
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const col1X = leftCol;
  const col2X = leftCol + 250;
  const col3X = leftCol + 400;

  doc.rect(col1X, tableTop, doc.page.width - 100, 25).fillAndStroke('#F3F4F6', '#E5E7EB');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
    .text('Component', col1X + 10, tableTop + 8)
    .text('Type', col2X + 10, tableTop + 8)
    .text('Amount (₹)', col3X + 10, tableTop + 8);

  let rowY = tableTop + 25;

  // Use snapshots — immune to future config changes
  const allowances = payroll.components.filter((c) => c.snapshotType === 'ALLOWANCE');
  const deductions = payroll.components.filter((c) => c.snapshotType === 'DEDUCTION');

  let totalAllowances = 0;
  let totalDeductions = 0;

  const renderRow = (
    name: string,
    typeLabel: string,
    typeColor: string,
    prefix: string,
    amount: number,
    idx: number,
    offset: number
  ) => {
    const bgColor = (offset + idx) % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
    doc.rect(col1X, rowY, doc.page.width - 100, 20).fill(bgColor);
    doc.fontSize(9).font('Helvetica').fillColor('#1F2937').text(name, col1X + 10, rowY + 5, { width: 230 });
    doc.fillColor(typeColor).text(typeLabel, col2X + 10, rowY + 5);
    doc.fillColor('#1F2937').text(
      `${prefix} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      col3X + 10,
      rowY + 5
    );
    rowY += 20;
  };

  allowances.forEach((c, i) => {
    const amt = Number(c.amount);
    totalAllowances += amt;
    renderRow(c.snapshotName, 'Allowance', '#10B981', '+', amt, i, 0);
  });

  deductions.forEach((c, i) => {
    const amt = Number(c.amount);
    totalDeductions += amt;
    renderRow(c.snapshotName, 'Deduction', '#EF4444', '-', amt, i, allowances.length);
  });

  // Summary rows
  doc.moveDown(0.5);
  rowY = doc.y;

  const summaryRows: [string, string, number][] = [
    ['Gross Salary', '#374151', Number(payroll.grossSalary)],
    ['Total Allowances', '#10B981', totalAllowances],
    ['Total Deductions', '#EF4444', totalDeductions],
  ];

  for (const [label, color, value] of summaryRows) {
    doc.rect(col1X, rowY, doc.page.width - 100, 20).fillAndStroke('#F3F4F6', '#E5E7EB');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(label, col1X + 10, rowY + 5);
    doc.fillColor(color).text(
      `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      col3X + 10,
      rowY + 5
    );
    rowY += 20;
  }

  // Net salary
  doc.rect(col1X, rowY, doc.page.width - 100, 30).fillAndStroke('#1F2937', '#1F2937');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF').text('NET SALARY', col1X + 10, rowY + 8);
  doc.fontSize(12).fillColor('#FFFFFF').text(
    `₹${Number(payroll.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    col3X + 10,
    rowY + 8
  );

  doc.moveDown(3);
  doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
    .text('This is a computer-generated payslip and does not require a signature.', { align: 'center' });
  doc.fontSize(7).fillColor('#D1D5DB')
    .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });

  doc.end();
};

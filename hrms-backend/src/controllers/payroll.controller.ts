import { Department } from './../../generated/prisma/index.d';
import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import PDFDocument from 'pdfkit';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { sendNotification } from '../utils/notification';

const prisma = new PrismaClient();

// ----------------- Generate Payroll -----------------
export const generatePayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year, components } = req.body;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });

  if (!employee)
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);

  if (!employee.salary)
    throw new HttpError(404, 'Salary is not added', ERROR_CODES.NOT_FOUND);

  const annualCTC = employee.salary;

  if (!annualCTC) {
    throw new HttpError(
      400,
      'Employee salary (CTC) not defined',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Convert annual CTC to monthly
  const monthlySalary = annualCTC / 12;

  let netSalary = 0;
  const componentData = [];

  for (const comp of components) {
    const componentType = await prisma.payrollComponentType.findUnique({
      where: { id: comp.componentTypeId },
    });

    if (!componentType) {
      throw new HttpError(
        404,
        `ComponentType ${comp.componentTypeId} not found`,
        ERROR_CODES.NOT_FOUND
      );
    }

    // Calculate component amount based on monthly salary
    const amount = ((comp.percent ?? 0) * monthlySalary) / 100;

    if (componentType.type === 'ALLOWANCE') netSalary += amount;
    if (componentType.type === 'DEDUCTION') netSalary -= amount;

    componentData.push({
      componentTypeId: comp.componentTypeId,
      amount,
    });
  }

  const payroll = await prisma.payroll.create({
    data: {
      employeeId,
      userId: employee.user.id,
      month,
      year,
      netSalary,
      components: {
        create: componentData,
      },
    },
  });

  // Notify employee + manager + HR/Admin
  await sendNotification({
    employeeIds: [employeeId],
    type: 'PAYROLL',
    message: `Payroll for ${month}/${year} generated. Net Salary: ₹${netSalary.toFixed(
      2
    )}`,
  });

  return res.status(200).json({
    message: 'Payroll generated successfully',
    data: payroll,
    statusCode: 200,
  });
};

// ----------------- Get Payroll Records -----------------
export const getPayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year, skip, top } = req.query;

  // const where: any = {};
  // if (employeeId) where.employeeId = Number(employeeId);
  // if (month) where.month = Number(month);
  // if (year) where.year = Number(year);
  // console.log(employeeId, '>>>>>>>');
  const [payroll, totalRecords] = await Promise.all([
    prisma.payroll.findMany({
      where: {
        employeeId: employeeId ? String(employeeId) : undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      },
      orderBy: { id: 'asc' },
      skip: skip ? Number(skip) : 0,
      take: top ? Number(top) : 10,
    }),
    prisma.payroll.count({
      where: {
        employeeId: employeeId ? String(employeeId) : undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      },
    }),
  ]);

  return res.status(200).json({
    message: 'Data fetched successfully',
    data: { content: payroll, totalRecords },
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

// ----------------- Download Payslip -----------------
export const downloadPayslip = async (req: Request, res: Response) => {
  const { payrollId } = req.params;

  if (!payrollId) {
    throw new HttpError(
      400,
      'Payroll ID required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: { include: { user: true } },
      components: { include: { componentType: true } },
    },
  });

  if (!payroll) {
    throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);
  }

  const department = await prisma.department.findUnique({
    where: { id: payroll.employee.departmentId as string },
  });

  if (!department) {
    throw new HttpError(404, 'Department not found', ERROR_CODES.NOT_FOUND);
  }

  // Create PDF with modern design
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=payslip-${payroll.employee.user.name}-${payroll.month}-${payroll.year}.pdf`
  );

  doc.pipe(res);

  // Helper function to draw a line
  const drawLine = (y: number) => {
    doc
      .moveTo(50, y)
      .lineTo(doc.page.width - 50, y)
      .stroke('#E5E7EB');
  };

  // Header Section
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text('PAYSLIP', { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Salary Statement', { align: 'center' })
    .moveDown(2);

  drawLine(doc.y);
  doc.moveDown();

  // Employee Information Section
  const leftCol = 50;
  const rightCol = 320;
  let currentY = doc.y;

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Employee Information', leftCol, currentY);

  currentY += 20;

  // Left column
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Employee Name:', leftCol, currentY);
  doc
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text(payroll.employee.user.name, leftCol + 100, currentY);

  currentY += 15;
  doc
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Employee Code:', leftCol, currentY);
  doc
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text(payroll.employee.employeeCode, leftCol + 100, currentY);

  currentY += 15;
  doc
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Department:', leftCol, currentY);
  doc
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text(department.name || 'N/A', leftCol + 100, currentY);

  // Right column
  currentY = doc.y - 45;
  doc
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Pay Period:', rightCol, currentY);
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  doc
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text(
      `${monthNames[payroll.month - 1]} ${payroll.year}`,
      rightCol + 80,
      currentY
    );

  currentY += 15;
  doc
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Annual CTC:', rightCol, currentY);
  doc
    .font('Helvetica-Bold')
    .fillColor('#1F2937')
    .text(
      `₹${payroll.employee.salary?.toLocaleString('en-IN') || 0}`,
      rightCol + 80,
      currentY
    );

  doc.moveDown(3);
  drawLine(doc.y);
  doc.moveDown(1.5);

  // Salary Components Table
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Salary Components', leftCol, doc.y);

  doc.moveDown(0.5);

  // Table Header
  const tableTop = doc.y;
  const col1X = leftCol;
  const col2X = leftCol + 250;
  const col3X = leftCol + 400;

  // Header background
  doc
    .rect(col1X, tableTop, doc.page.width - 100, 25)
    .fillAndStroke('#F3F4F6', '#E5E7EB');

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Component', col1X + 10, tableTop + 8)
    .text('Type', col2X + 10, tableTop + 8)
    .text('Amount (₹)', col3X + 10, tableTop + 8);

  let rowY = tableTop + 25;

  // Separate allowances and deductions
  const allowances = payroll.components.filter(
    (c) => c.componentType.type === 'ALLOWANCE'
  );
  const deductions = payroll.components.filter(
    (c) => c.componentType.type === 'DEDUCTION'
  );

  let totalAllowances = 0;
  let totalDeductions = 0;

  // Allowances
  allowances.forEach((component, index) => {
    const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
    doc.rect(col1X, rowY, doc.page.width - 100, 20).fill(bgColor);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#1F2937')
      .text(component.componentType.name, col1X + 10, rowY + 5, {
        width: 230,
      });

    doc.fillColor('#10B981').text('Allowance', col2X + 10, rowY + 5);

    doc.fillColor('#1F2937').text(
      `+ ${component.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      col3X + 10,
      rowY + 5
    );

    totalAllowances += component.amount;
    rowY += 20;
  });

  // Deductions
  deductions.forEach((component, index) => {
    const bgColor =
      (allowances.length + index) % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
    doc.rect(col1X, rowY, doc.page.width - 100, 20).fill(bgColor);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#1F2937')
      .text(component.componentType.name, col1X + 10, rowY + 5, {
        width: 230,
      });

    doc.fillColor('#EF4444').text('Deduction', col2X + 10, rowY + 5);

    doc.fillColor('#1F2937').text(
      `- ${component.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      col3X + 10,
      rowY + 5
    );

    totalDeductions += component.amount;
    rowY += 20;
  });

  // Summary rows
  doc.moveDown(0.5);
  rowY = doc.y;

  // Total Allowances
  doc
    .rect(col1X, rowY, doc.page.width - 100, 20)
    .fillAndStroke('#F3F4F6', '#E5E7EB');
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Total Allowances', col1X + 10, rowY + 5);
  doc.fillColor('#10B981').text(
    `₹${totalAllowances.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    col3X + 10,
    rowY + 5
  );

  rowY += 20;

  // Total Deductions
  doc
    .rect(col1X, rowY, doc.page.width - 100, 20)
    .fillAndStroke('#F3F4F6', '#E5E7EB');
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Total Deductions', col1X + 10, rowY + 5);
  doc.fillColor('#EF4444').text(
    `₹${totalDeductions.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    col3X + 10,
    rowY + 5
  );

  rowY += 20;

  // Net Salary
  doc
    .rect(col1X, rowY, doc.page.width - 100, 30)
    .fillAndStroke('#1F2937', '#1F2937');
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .text('NET SALARY', col1X + 10, rowY + 8);
  doc
    .fontSize(12)
    .fillColor('#FFFFFF')
    .text(
      `₹${payroll.netSalary.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      col3X + 10,
      rowY + 8
    );

  // Footer
  doc.moveDown(3);
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#9CA3AF')
    .text(
      'This is a computer-generated payslip and does not require a signature.',
      { align: 'center' }
    );

  doc
    .fontSize(7)
    .fillColor('#D1D5DB')
    .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, {
      align: 'center',
    });

  doc.end();
};

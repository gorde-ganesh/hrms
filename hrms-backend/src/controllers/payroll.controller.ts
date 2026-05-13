import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { sendNotification } from '../utils/notification';
import { auditLog } from '../utils/audit';
import { prisma } from '../lib/prisma';
import { runPayrollEngine } from '../services/payroll/engine';
import type { EngineInput } from '../services/payroll/types';

const DEFAULT_BASIC_PCT = 40;
const DEFAULT_HRA_PCT = 50;
const DEFAULT_WORKING_DAYS = 26;
const PAYSLIP_DIR = path.join(process.cwd(), 'storage', 'payslips');

// ─── helpers ────────────────────────────────────────────────────────────────

async function ensurePayslipDir() {
  await fs.promises.mkdir(PAYSLIP_DIR, { recursive: true });
}

/** Fetches LOP days for a given employee + month/year.
 *  Merges attendance ABSENT records with approved UNPAID leave days,
 *  deduplicating dates that appear in both.
 */
async function getLopDays(employeeId: string, month: number, year: number): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // last day of month

  const [absentRecords, unpaidLeaves] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: monthStart, lte: monthEnd },
        status: 'ABSENT',
      },
      select: { attendanceDate: true },
    }),
    prisma.leave.findMany({
      where: {
        employeeId,
        leaveType: 'UNPAID',
        status: 'APPROVED',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { startDate: true, endDate: true, halfDay: true },
    }),
  ]);

  // Build a set of YYYY-MM-DD strings to deduplicate across both sources
  const lopDates = new Set<string>(
    absentRecords.map(r => r.attendanceDate.toISOString().slice(0, 10)),
  );

  let halfDayLop = 0;

  for (const leave of unpaidLeaves) {
    if (leave.halfDay) {
      halfDayLop += 0.5;
      continue;
    }
    // Clip leave range to this month's window, then add each calendar day
    const start = leave.startDate < monthStart ? monthStart : leave.startDate;
    const end = leave.endDate > monthEnd ? monthEnd : leave.endDate;
    const d = new Date(start);
    while (d <= end) {
      lopDates.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  }

  return lopDates.size + halfDayLop;
}

/** Resolves salary structure fields for an employee at a given month/year */
async function resolveSalaryStructure(
  employeeId: string,
  annualCtc: number,
  month: number,
  year: number,
): Promise<{ annualCtc: number; basicPct: number; hraPct: number }> {
  const asOf = new Date(year, month - 1, 1);
  const structure = await prisma.salaryStructure.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (!structure) {
    return { annualCtc, basicPct: DEFAULT_BASIC_PCT, hraPct: DEFAULT_HRA_PCT };
  }

  return {
    annualCtc: Number(structure.ctcAnnual),
    basicPct: Number(structure.basicPct),
    hraPct: Number(structure.hraPct),
  };
}

/**
 * Fetches or creates PayrollComponentType records by statutory type.
 * Returns a map of statutoryType → componentTypeId.
 */
async function resolveComponentTypes(
  statutoryTypes: string[],
  companyId: string | null,
): Promise<Map<string, string>> {
  const existing = await prisma.payrollComponentType.findMany({
    where: {
      statutoryType: { in: statutoryTypes as any },
      companyId: null, // system-wide components
    },
    select: { id: true, statutoryType: true },
  });

  const map = new Map<string, string>();
  for (const ct of existing) {
    if (ct.statutoryType) map.set(ct.statutoryType, ct.id);
  }
  return map;
}

/** Generates a PDF payslip buffer from a finalized payroll record */
async function generatePayslipPdf(payrollId: string): Promise<Buffer> {
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: { include: { user: true } },
      components: { include: { componentType: true } },
    },
  });

  if (!payroll) throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);

  const department = payroll.employee.departmentId
    ? await prisma.department.findUnique({ where: { id: payroll.employee.departmentId } })
    : null;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const drawLine = (y: number) => {
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke('#E5E7EB');
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1F2937').text('PAYSLIP', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Salary Statement', { align: 'center' }).moveDown(2);

    drawLine(doc.y);
    doc.moveDown();

    const leftCol = 50, rightCol = 320;
    let currentY = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Employee Information', leftCol, currentY);
    currentY += 20;

    const infoRow = (label: string, value: string, col: number, y: number) => {
      doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(label, col, y);
      doc.font('Helvetica-Bold').fillColor('#1F2937').text(value, col + 100, y);
    };

    infoRow('Employee Name:', payroll.employee.user.name, leftCol, currentY);
    infoRow('Employee Code:', payroll.employee.employeeCode, leftCol, currentY + 15);
    infoRow('Department:', department?.name ?? 'N/A', leftCol, currentY + 30);

    const savedY = currentY;
    infoRow('Pay Period:', `${monthNames[payroll.month - 1]} ${payroll.year}`, rightCol, savedY);
    infoRow('Annual CTC:', `₹${Number(payroll.employee.salary ?? 0).toLocaleString('en-IN')}`, rightCol, savedY + 15);

    doc.moveDown(3);
    drawLine(doc.y);
    doc.moveDown(1.5);

    const col1X = leftCol, col2X = leftCol + 250, col3X = leftCol + 400;
    const tableTop = doc.y;

    doc.rect(col1X, tableTop, doc.page.width - 100, 25).fillAndStroke('#F3F4F6', '#E5E7EB');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
      .text('Component', col1X + 10, tableTop + 8)
      .text('Type', col2X + 10, tableTop + 8)
      .text('Amount (₹)', col3X + 10, tableTop + 8);

    let rowY = tableTop + 25;
    const allowances = payroll.components.filter(c => c.componentType.type === 'ALLOWANCE');
    const deductions = payroll.components.filter(c => c.componentType.type === 'DEDUCTION');

    let totalAllowances = 0, totalDeductions = 0;

    allowances.forEach((c, i) => {
      doc.rect(col1X, rowY, doc.page.width - 100, 20).fill(i % 2 === 0 ? '#FFFFFF' : '#F9FAFB');
      doc.fontSize(9).font('Helvetica').fillColor('#1F2937').text(c.componentType.name, col1X + 10, rowY + 5, { width: 230 });
      doc.fillColor('#10B981').text('Allowance', col2X + 10, rowY + 5);
      const amt = Number(c.amount);
      doc.fillColor('#1F2937').text(`+ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3X + 10, rowY + 5);
      totalAllowances += amt;
      rowY += 20;
    });

    deductions.forEach((c, i) => {
      doc.rect(col1X, rowY, doc.page.width - 100, 20).fill((allowances.length + i) % 2 === 0 ? '#FFFFFF' : '#F9FAFB');
      doc.fontSize(9).font('Helvetica').fillColor('#1F2937').text(c.componentType.name, col1X + 10, rowY + 5, { width: 230 });
      doc.fillColor('#EF4444').text('Deduction', col2X + 10, rowY + 5);
      const amt = Number(c.amount);
      doc.fillColor('#1F2937').text(`- ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3X + 10, rowY + 5);
      totalDeductions += amt;
      rowY += 20;
    });

    doc.moveDown(0.5);
    rowY = doc.y;

    doc.rect(col1X, rowY, doc.page.width - 100, 20).fillAndStroke('#F3F4F6', '#E5E7EB');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('Total Allowances', col1X + 10, rowY + 5);
    doc.fillColor('#10B981').text(`₹${totalAllowances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3X + 10, rowY + 5);
    rowY += 20;

    doc.rect(col1X, rowY, doc.page.width - 100, 20).fillAndStroke('#F3F4F6', '#E5E7EB');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('Total Deductions', col1X + 10, rowY + 5);
    doc.fillColor('#EF4444').text(`₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3X + 10, rowY + 5);
    rowY += 20;

    doc.rect(col1X, rowY, doc.page.width - 100, 30).fillAndStroke('#1F2937', '#1F2937');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF').text('NET SALARY', col1X + 10, rowY + 8);
    const net = Number(payroll.netSalary);
    doc.fontSize(12).fillColor('#FFFFFF').text(`₹${net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3X + 10, rowY + 8);

    doc.moveDown(3);
    doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF').text('This is a computer-generated payslip and does not require a signature.', { align: 'center' });
    doc.fontSize(7).fillColor('#D1D5DB').text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });

    doc.end();
  });
}

// ─── Generate Payroll (single employee) ─────────────────────────────────────
export const generatePayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year } = req.body;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });

  if (!employee) throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  if (!employee.salary) throw new HttpError(400, 'Employee salary (CTC) not set', ERROR_CODES.VALIDATION_ERROR);

  const existing = await prisma.payroll.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } },
  });
  if (existing) {
    throw new HttpError(400, `Payroll for ${month}/${year} already generated`, ERROR_CODES.VALIDATION_ERROR);
  }

  const { annualCtc, basicPct, hraPct } = await resolveSalaryStructure(
    employeeId, Number(employee.salary), month, year,
  );
  const lopDays = await getLopDays(employeeId, month, year);

  const engineInput: EngineInput = {
    employeeId,
    month,
    year,
    annualCtc,
    basicPct,
    hraPct,
    pfOptOut: employee.pfOptOut,
    taxRegime: employee.taxRegime,
    professionalTaxState: employee.professionalTaxState,
    lopDays,
    workingDays: DEFAULT_WORKING_DAYS,
  };

  const result = runPayrollEngine(engineInput);
  const statutoryTypes = result.components.map(c => c.statutoryType);
  const componentTypeMap = await resolveComponentTypes(statutoryTypes, employee.user.companyId ?? null);

  const payroll = await prisma.$transaction(async (tx) => {
    const created = await tx.payroll.create({
      data: {
        employeeId,
        month,
        year,
        grossSalary: result.grossSalary,
        basicSalary: result.basicSalary,
        netSalary: result.netSalary,
        lopDays: result.lopDays,
        workingDays: result.workingDays,
        status: 'DRAFT',
        components: {
          create: result.components
            .filter(c => componentTypeMap.has(c.statutoryType))
            .map(c => ({
              componentTypeId: componentTypeMap.get(c.statutoryType)!,
              amount: c.amount,
            })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'Payroll',
        entityId: created.id,
        performedBy: req.user!.id,
        after: { month, year, netSalary: result.netSalary, grossSalary: result.grossSalary },
      },
    });

    return created;
  });

  await sendNotification({
    employeeIds: [employeeId],
    type: 'PAYROLL',
    message: `Payroll for ${month}/${year} generated. Net Salary: ₹${result.netSalary.toLocaleString('en-IN')}`,
  });

  return successResponse(res, payroll, 'Payroll generated successfully', SUCCESS_CODES.SUCCESS, 200);
};

// ─── Generate Payroll (batch) ────────────────────────────────────────────────
export const generateBatchPayroll = async (req: Request, res: Response) => {
  const { month, year, employeeIds } = req.body;

  const companyId = (req.user as any)?.companyId;

  // Fetch employees — either the provided list or all active in company
  const employees = await prisma.employee.findMany({
    where: {
      ...(employeeIds?.length ? { id: { in: employeeIds } } : {}),
      ...(companyId ? { user: { companyId } } : {}),
      status: 'ACTIVE',
      salary: { not: null },
      deletedAt: null,
    },
    include: { user: true },
  });

  const results = { succeeded: 0, failed: 0, errors: [] as { employeeId: string; error: string }[] };

  for (const employee of employees) {
    try {
      const existing = await prisma.payroll.findUnique({
        where: { employeeId_month_year: { employeeId: employee.id, month, year } },
      });
      if (existing) continue; // idempotent — skip already-generated

      const { annualCtc, basicPct, hraPct } = await resolveSalaryStructure(
        employee.id, Number(employee.salary), month, year,
      );
      const lopDays = await getLopDays(employee.id, month, year);

      const engineInput: EngineInput = {
        employeeId: employee.id,
        month,
        year,
        annualCtc,
        basicPct,
        hraPct,
        pfOptOut: employee.pfOptOut,
        taxRegime: employee.taxRegime,
        professionalTaxState: employee.professionalTaxState,
        lopDays,
        workingDays: DEFAULT_WORKING_DAYS,
      };

      const result = runPayrollEngine(engineInput);
      const statutoryTypes = result.components.map(c => c.statutoryType);
      const componentTypeMap = await resolveComponentTypes(statutoryTypes, employee.user.companyId ?? null);

      await prisma.$transaction(async (tx) => {
        const created = await tx.payroll.create({
          data: {
            employeeId: employee.id,
            month,
            year,
            grossSalary: result.grossSalary,
            basicSalary: result.basicSalary,
            netSalary: result.netSalary,
            lopDays: result.lopDays,
            workingDays: result.workingDays,
            status: 'DRAFT',
            components: {
              create: result.components
                .filter(c => componentTypeMap.has(c.statutoryType))
                .map(c => ({
                  componentTypeId: componentTypeMap.get(c.statutoryType)!,
                  amount: c.amount,
                })),
            },
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'CREATE',
            entity: 'Payroll',
            entityId: created.id,
            performedBy: req.user!.id,
            after: { month, year, netSalary: result.netSalary, batch: true },
          },
        });
      });

      results.succeeded++;
    } catch (err: any) {
      results.failed++;
      results.errors.push({ employeeId: employee.id, error: err?.message ?? 'Unknown error' });
    }
  }

  return successResponse(res, results, `Batch payroll: ${results.succeeded} succeeded, ${results.failed} failed`, SUCCESS_CODES.SUCCESS, 200);
};

// ─── Get Payroll Records ─────────────────────────────────────────────────────
export const getPayroll = async (req: Request, res: Response) => {
  const { employeeId, month, year, skip, pageno, top } = req.query;
  const skipValue = Number(skip ?? pageno) || 0;

  const [payroll, totalRecords] = await Promise.all([
    prisma.payroll.findMany({
      where: {
        employeeId: employeeId ? String(employeeId) : undefined,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: skipValue,
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

  return successResponse(res, { content: payroll, totalRecords }, 'Data fetched successfully', SUCCESS_CODES.SUCCESS, 200);
};

// ─── Download Payslip ────────────────────────────────────────────────────────
export const downloadPayslip = async (req: Request, res: Response) => {
  const payrollId = req.params.payrollId as string;
  if (!payrollId) throw new HttpError(400, 'Payroll ID required', ERROR_CODES.VALIDATION_ERROR);

  // Serve from stored payslip if available
  const stored = await (prisma as any).payslip?.findUnique({ where: { payrollId } });
  if (stored?.fileUrl && fs.existsSync(stored.fileUrl)) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { employee: { include: { user: true } } },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Disposition',
      `attachment; filename=payslip-${payroll?.employee.user.name}-${payroll?.month}-${payroll?.year}.pdf`);
    return fs.createReadStream(stored.fileUrl).pipe(res);
  }

  // Fallback: generate on-the-fly for DRAFT payrolls
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { employee: { include: { user: true } } },
  });
  if (!payroll) throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);

  const pdfBuffer = await generatePayslipPdf(payrollId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Content-Disposition',
    `attachment; filename=payslip-${payroll.employee.user.name}-${payroll.month}-${payroll.year}.pdf`);
  res.end(pdfBuffer);
};

// ─── Finalize Payroll ────────────────────────────────────────────────────────
export const finalizePayroll = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);
  if (payroll.status !== 'DRAFT') {
    throw new HttpError(400, `Cannot finalize payroll with status '${payroll.status}'`, ERROR_CODES.VALIDATION_ERROR);
  }

  // Generate and store payslip PDF at finalize time (immutable legal copy)
  await ensurePayslipDir();
  const pdfBuffer = await generatePayslipPdf(id);
  const fileName = `payslip-${id}.pdf`;
  const filePath = path.join(PAYSLIP_DIR, fileName);
  await fs.promises.writeFile(filePath, pdfBuffer);
  const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  const updated = await prisma.$transaction(async (tx) => {
    const finalized = await tx.payroll.update({
      where: { id },
      data: { status: 'FINALIZED', processedById: req.user?.id as any },
    });

    // Store immutable payslip record
    await (tx as any).payslip?.upsert({
      where: { payrollId: id },
      create: { payrollId: id, fileUrl: filePath, fileHash },
      update: { fileUrl: filePath, fileHash, supersededAt: null, generatedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Payroll',
        entityId: id,
        performedBy: req.user!.id,
        before: { status: 'DRAFT' },
        after: { status: 'FINALIZED' },
      },
    });

    return finalized;
  });

  await sendNotification({
    employeeIds: [payroll.employeeId],
    type: 'PAYROLL',
    message: `Your payroll for ${payroll.month}/${payroll.year} has been finalized.`,
  });

  return successResponse(res, updated, 'Payroll finalized', SUCCESS_CODES.SUCCESS, 200);
};

// ─── Mark Payroll Paid ───────────────────────────────────────────────────────
export const markPayrollPaid = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) throw new HttpError(404, 'Payroll not found', ERROR_CODES.NOT_FOUND);
  if (payroll.status !== 'FINALIZED') {
    throw new HttpError(400, `Cannot mark as paid — current status is '${payroll.status}'. Finalize first.`, ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const paid = await tx.payroll.update({
      where: { id },
      data: { status: 'PAID', paidDate: new Date() },
    });

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Payroll',
        entityId: id,
        performedBy: req.user!.id,
        before: { status: 'FINALIZED' },
        after: { status: 'PAID', paidDate: new Date().toISOString() },
      },
    });

    return paid;
  });

  await sendNotification({
    employeeIds: [payroll.employeeId],
    type: 'PAYROLL',
    message: `Your salary for ${payroll.month}/${payroll.year} has been paid.`,
  });

  return successResponse(res, updated, 'Payroll marked as paid', SUCCESS_CODES.SUCCESS, 200);
};

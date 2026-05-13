import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse, createdResponse } from '../utils/response-helper';
import { prisma } from '../lib/prisma';

// ─── helpers ────────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function prevDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export const createSalaryStructure = async (req: Request, res: Response) => {
  const { employeeId, ctcAnnual, basicPct, hraPct, effectiveFrom } = req.body;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);

  const effectiveFromDate = parseDate(effectiveFrom);

  // Prevent duplicate effectiveFrom for the same employee
  const duplicate = await prisma.salaryStructure.findFirst({
    where: { employeeId, effectiveFrom: effectiveFromDate },
  });
  if (duplicate) {
    throw new HttpError(
      400,
      `A salary structure already exists for this employee effective ${effectiveFrom}`,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // Find the currently active structure whose window will be closed
  // "Active" = effectiveTo IS NULL and effectiveFrom <= new effectiveFrom
  const currentActive = await prisma.salaryStructure.findFirst({
    where: {
      employeeId,
      effectiveTo: null,
      effectiveFrom: { lte: effectiveFromDate },
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  const created = await prisma.$transaction(async (tx) => {
    // Close the active structure one day before the new one starts
    if (currentActive) {
      await tx.salaryStructure.update({
        where: { id: currentActive.id },
        data: { effectiveTo: prevDay(effectiveFromDate) },
      });
    }

    return tx.salaryStructure.create({
      data: {
        employeeId,
        ctcAnnual,
        basicPct,
        hraPct,
        effectiveFrom: effectiveFromDate,
        createdById: req.user?.id,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'SalaryStructure',
      entityId: created.id,
      performedBy: req.user!.id,
      after: { employeeId, ctcAnnual, basicPct, hraPct, effectiveFrom },
    },
  });

  return createdResponse(res, created, 'Salary structure created', SUCCESS_CODES.SUCCESS);
};

// ─── List (by employee) ──────────────────────────────────────────────────────

export const getSalaryStructures = async (req: Request, res: Response) => {
  const { employeeId } = req.query;
  if (!employeeId) {
    throw new HttpError(400, 'employeeId query parameter is required', ERROR_CODES.VALIDATION_ERROR);
  }

  const structures = await prisma.salaryStructure.findMany({
    where: { employeeId: String(employeeId) },
    orderBy: { effectiveFrom: 'desc' },
    include: { employee: { include: { user: { select: { name: true } } } } },
  });

  return successResponse(
    res,
    { content: structures, totalRecords: structures.length },
    'Salary structures fetched',
    SUCCESS_CODES.SUCCESS,
    200,
  );
};

// ─── Get by ID ───────────────────────────────────────────────────────────────

export const getSalaryStructureById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const structure = await prisma.salaryStructure.findUnique({ where: { id } });
  if (!structure) throw new HttpError(404, 'Salary structure not found', ERROR_CODES.NOT_FOUND);

  return successResponse(res, structure, 'Salary structure fetched', SUCCESS_CODES.SUCCESS, 200);
};

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateSalaryStructure = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ctcAnnual, basicPct, hraPct } = req.body;

  const structure = await prisma.salaryStructure.findUnique({ where: { id } });
  if (!structure) throw new HttpError(404, 'Salary structure not found', ERROR_CODES.NOT_FOUND);

  const updated = await prisma.salaryStructure.update({
    where: { id },
    data: {
      ...(ctcAnnual !== undefined && { ctcAnnual }),
      ...(basicPct !== undefined && { basicPct }),
      ...(hraPct !== undefined && { hraPct }),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'SalaryStructure',
      entityId: id,
      performedBy: req.user!.id,
      before: {
        ctcAnnual: Number(structure.ctcAnnual),
        basicPct: Number(structure.basicPct),
        hraPct: Number(structure.hraPct),
      },
      after: {
        ctcAnnual: updated.ctcAnnual,
        basicPct: updated.basicPct,
        hraPct: updated.hraPct,
      },
    },
  });

  return successResponse(res, updated, 'Salary structure updated', SUCCESS_CODES.SUCCESS, 200);
};

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteSalaryStructure = async (req: Request, res: Response) => {
  const { id } = req.params;

  const structure = await prisma.salaryStructure.findUnique({ where: { id } });
  if (!structure) throw new HttpError(404, 'Salary structure not found', ERROR_CODES.NOT_FOUND);

  // Guard: reject delete if any FINALIZED or PAID payrolls fall within this structure's window
  const payrollInWindow = await prisma.payroll.findFirst({
    where: {
      employeeId: structure.employeeId,
      status: { in: ['FINALIZED', 'PAID'] },
      // Check if payroll month/year falls in [effectiveFrom, effectiveTo]
      // Approximate: use createdAt range since Payroll doesn't store a date column directly
      // Better: check via year/month by converting effectiveFrom to year+month bounds
      AND: buildPayrollWindowFilter(structure.effectiveFrom, structure.effectiveTo),
    },
  });

  if (payrollInWindow) {
    throw new HttpError(
      409,
      'Cannot delete: finalized or paid payrolls exist within this structure\'s effective period',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.salaryStructure.delete({ where: { id } });

    // If this was the active structure (effectiveTo = null), re-open the previous one
    if (!structure.effectiveTo) {
      const previous = await tx.salaryStructure.findFirst({
        where: {
          employeeId: structure.employeeId,
          effectiveFrom: { lt: structure.effectiveFrom },
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (previous) {
        await tx.salaryStructure.update({
          where: { id: previous.id },
          data: { effectiveTo: null },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'SalaryStructure',
        entityId: id,
        performedBy: req.user!.id,
        before: { employeeId: structure.employeeId, effectiveFrom: structure.effectiveFrom },
        after: null,
      },
    });
  });

  return successResponse(res, null, 'Salary structure deleted', SUCCESS_CODES.SUCCESS, 200);
};

// ─── private helper ──────────────────────────────────────────────────────────

/**
 * Builds a Prisma AND filter checking if a payroll's (year, month) falls within
 * [effectiveFrom, effectiveTo]. Converts dates to year+month ints for comparison.
 */
function buildPayrollWindowFilter(effectiveFrom: Date, effectiveTo: Date | null) {
  // A payroll (year, month) falls in this window if:
  //   payrollDate >= effectiveFrom  AND  (effectiveTo IS NULL OR payrollDate <= effectiveTo)
  // We compare as (year * 12 + month) integer for simplicity.
  const fromYm = effectiveFrom.getFullYear() * 12 + effectiveFrom.getMonth(); // 0-indexed month

  const filters: any[] = [
    // year*12 + (month-1) >= fromYm  →  split into two conditions
    {
      OR: [
        { year: { gt: effectiveFrom.getFullYear() } },
        {
          year: effectiveFrom.getFullYear(),
          month: { gte: effectiveFrom.getMonth() + 1 },
        },
      ],
    },
  ];

  if (effectiveTo) {
    filters.push({
      OR: [
        { year: { lt: effectiveTo.getFullYear() } },
        {
          year: effectiveTo.getFullYear(),
          month: { lte: effectiveTo.getMonth() + 1 },
        },
      ],
    });
  }

  return filters;
}

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const DEFAULT_ANNUAL_LEAVES: Record<string, number> = {
  ANNUAL: 21,
  SICK: 12,
  PERSONAL: 5,
  CASUAL: 7,
  MATERNITY: 180,
  PATERNITY: 15,
  UNPAID: 0,
};

// Runs on 1 Jan each year — creates fresh LeaveBalance rows for all active employees.
// Existing rows for the new year are skipped (idempotent).
export async function runLeaveBalanceReset(): Promise<void> {
  const year = new Date().getFullYear();

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });

  if (employees.length === 0) {
    logger.info('[LeaveReset] No active employees found.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    for (const [leaveType, totalLeaves] of Object.entries(DEFAULT_ANNUAL_LEAVES)) {
      const existing = await prisma.leaveBalance.findUnique({
        where: { employeeId_year_leaveType: { employeeId: emp.id, year, leaveType: leaveType as any } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.leaveBalance.create({
        data: { employeeId: emp.id, year, leaveType: leaveType as any, totalLeaves, usedLeaves: 0 },
      });
      created++;
    }
  }

  logger.info(`[LeaveReset] Year ${year}: created ${created} balance records, skipped ${skipped} existing.`);
}

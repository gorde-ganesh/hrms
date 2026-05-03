import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// Runs daily at 21:00 — marks ABSENT for active employees with no attendance record today.
export async function runAbsentMarker(): Promise<void> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  // Skip weekends
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    logger.info('[AbsentMarker] Skipped — weekend.');
    return;
  }

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });

  let marked = 0;
  for (const emp of employees) {
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: emp.id,
        attendanceDate: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (!existing) {
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          attendanceDate: today,
          status: 'ABSENT',
        },
      });
      marked++;
    }
  }

  logger.info(`[AbsentMarker] Marked ${marked} employee(s) as ABSENT.`);
}

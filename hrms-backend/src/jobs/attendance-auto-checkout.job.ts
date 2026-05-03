import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// Runs daily at 20:00 — auto-checks-out employees who forgot to clock out.
// Sets checkout to 18:00 of the same day and computes totalHours.
export async function runAttendanceAutoCheckout(): Promise<void> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const defaultCheckout = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);

  const openRecords = await prisma.attendance.findMany({
    where: {
      attendanceDate: { gte: startOfDay },
      checkIn: { not: null },
      checkOut: null,
    },
  });

  if (openRecords.length === 0) {
    logger.info('[AutoCheckout] No open attendance records found.');
    return;
  }

  let updated = 0;
  for (const record of openRecords) {
    const checkIn = record.checkIn!;
    const checkOut = defaultCheckout > checkIn ? defaultCheckout : checkIn;
    const totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

    await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut, totalHours: parseFloat(totalHours.toFixed(2)) },
    });
    updated++;
  }

  logger.info(`[AutoCheckout] Auto-checked out ${updated} employee(s).`);
}

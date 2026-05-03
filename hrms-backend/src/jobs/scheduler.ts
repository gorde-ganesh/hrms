import cron from 'node-cron';
import { logger } from '../utils/logger';
import { runAttendanceAutoCheckout } from './attendance-auto-checkout.job';
import { runLeaveBalanceReset } from './leave-balance-reset.job';
import { runAbsentMarker } from './absent-marker.job';

export function startScheduler(): void {
  // Daily at 20:00 — auto-checkout employees who forgot to clock out
  cron.schedule('0 20 * * 1-5', async () => {
    logger.info('[Scheduler] Running attendance auto-checkout...');
    try { await runAttendanceAutoCheckout(); } catch (e) { logger.error('[Scheduler] AutoCheckout failed:', e); }
  });

  // Daily at 21:00 on weekdays — mark absent for employees with no record
  cron.schedule('0 21 * * 1-5', async () => {
    logger.info('[Scheduler] Running absent marker...');
    try { await runAbsentMarker(); } catch (e) { logger.error('[Scheduler] AbsentMarker failed:', e); }
  });

  // 1 Jan at 00:05 — reset annual leave balances for the new year
  cron.schedule('5 0 1 1 *', async () => {
    logger.info('[Scheduler] Running annual leave balance reset...');
    try { await runLeaveBalanceReset(); } catch (e) { logger.error('[Scheduler] LeaveReset failed:', e); }
  });

  logger.info('✅ Scheduler started (3 jobs registered)');
}

import type { LopResult } from './types';

const DEFAULT_WORKING_DAYS = 26;

/**
 * Computes Loss of Pay (LOP) deduction.
 *
 * LOP deduction = (gross monthly / working days) * lop days
 * Applies pro-rata across basic + HRA + special allowance (i.e. on gross).
 */
export function computeLop(
  grossMonthly: number,
  lopDays: number,
  workingDays: number = DEFAULT_WORKING_DAYS,
): LopResult {
  if (lopDays <= 0) {
    return { lopDays: 0, lopDeduction: 0, effectiveWorkingDays: workingDays };
  }

  const safeLopDays = Math.min(lopDays, workingDays);
  const perDayRate = grossMonthly / workingDays;
  const lopDeduction = Math.round(perDayRate * safeLopDays);

  return {
    lopDays: safeLopDays,
    lopDeduction,
    effectiveWorkingDays: workingDays - safeLopDays,
  };
}

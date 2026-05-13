import type { SalaryBreakdown } from './types';

/**
 * Computes monthly earnings breakdown from annual CTC and salary structure percentages.
 *
 * Indian convention:
 *   gross monthly = annualCTC / 12
 *   basic         = gross * basicPct / 100
 *   hra           = basic * hraPct / 100
 *   special       = gross - basic - hra (remainder, no separate %  needed)
 *
 * All amounts rounded to nearest rupee.
 */
export function computeEarnings(
  annualCtc: number,
  basicPct: number,
  hraPct: number,
): SalaryBreakdown {
  const gross = Math.round(annualCtc / 12);
  const basic = Math.round(gross * (basicPct / 100));
  const hra = Math.round(basic * (hraPct / 100));
  const specialAllowance = gross - basic - hra;

  return { gross, basic, hra, specialAllowance };
}

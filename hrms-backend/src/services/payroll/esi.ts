import type { EsiResult } from './types';

// ESI gross ceiling: employees earning more than ₹21,000/month are exempt
const ESI_GROSS_CEILING = 21_000;

/**
 * Computes ESI contributions.
 *
 * Applicable when gross monthly salary <= ₹21,000.
 * Employee: 0.75% of gross (rounded to nearest rupee)
 * Employer: 3.25% of gross (rounded to nearest rupee)
 *
 * NOTE: Once an employee becomes eligible in a contribution period
 * (April–September or October–March) they continue for the full period
 * even if salary rises above ₹21k. This edge case is deferred to Phase 2;
 * for Phase 1 we apply the ceiling check every month.
 */
export function computeEsi(grossMonthly: number): EsiResult {
  if (grossMonthly > ESI_GROSS_CEILING) {
    return { applicable: false, employeeContribution: 0, employerContribution: 0 };
  }

  return {
    applicable: true,
    employeeContribution: Math.round(grossMonthly * 0.0075),
    employerContribution: Math.round(grossMonthly * 0.0325),
  };
}

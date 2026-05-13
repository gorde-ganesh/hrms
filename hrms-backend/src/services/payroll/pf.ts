import type { PfResult } from './types';

// EPF statutory ceiling: contributions are capped on ₹15,000 basic/month
const PF_WAGE_CEILING = 15_000;
// Employer EPS cap: ₹1,250/month (8.33% of ₹15,000)
const EPS_CAP = 1_250;

/**
 * Computes EPF/EPS contributions.
 *
 * Employee contribution: 12% of PF wages (basic capped at ₹15k)
 * Employer EPS        : 8.33% of PF wages, capped at ₹1,250
 * Employer EPF        : 12% of PF wages - employer EPS
 *
 * If pfOptOut is true OR basic == 0, returns a zeroed result.
 * Amounts rounded to nearest rupee.
 */
export function computePf(
  basicMonthly: number,
  pfOptOut: boolean,
): PfResult {
  if (pfOptOut || basicMonthly <= 0) {
    return {
      applicable: false,
      pfWages: 0,
      employeeContribution: 0,
      employerEpf: 0,
      employerEps: 0,
      totalEmployerContribution: 0,
    };
  }

  const pfWages = Math.min(basicMonthly, PF_WAGE_CEILING);

  const employeeContribution = Math.round(pfWages * 0.12);
  const employerEps = Math.min(Math.round(pfWages * 0.0833), EPS_CAP);
  const employerEpf = Math.round(pfWages * 0.12) - employerEps;
  const totalEmployerContribution = employerEpf + employerEps;

  return {
    applicable: true,
    pfWages,
    employeeContribution,
    employerEpf,
    employerEps,
    totalEmployerContribution,
  };
}

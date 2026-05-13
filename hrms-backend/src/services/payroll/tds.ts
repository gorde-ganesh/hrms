import type { TdsResult, TaxRegime } from './types';

// FY 2025-26 tax slabs
const NEW_REGIME_SLABS = [
  { upto: 300_000,    rate: 0 },
  { upto: 600_000,    rate: 0.05 },
  { upto: 900_000,    rate: 0.10 },
  { upto: 1_200_000,  rate: 0.15 },
  { upto: 1_500_000,  rate: 0.20 },
  { upto: Infinity,   rate: 0.30 },
];

const OLD_REGIME_SLABS = [
  { upto: 250_000,    rate: 0 },
  { upto: 500_000,    rate: 0.05 },
  { upto: 1_000_000,  rate: 0.20 },
  { upto: Infinity,   rate: 0.30 },
];

// Rebate u/s 87A: tax = 0 if taxable income ≤ threshold
const REBATE_THRESHOLD = { NEW: 700_000, OLD: 500_000 };
const STANDARD_DEDUCTION = { NEW: 75_000, OLD: 50_000 };
const CESS_RATE = 0.04;

function computeTaxOnSlabs(
  income: number,
  slabs: typeof NEW_REGIME_SLABS,
): number {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, slab.upto) - prev;
    tax += taxable * slab.rate;
    prev = slab.upto;
  }
  return Math.round(tax);
}

/**
 * Projects annual TDS liability and spreads it evenly across remaining months.
 *
 * Simplified assumptions for Phase 1:
 *   - projectedAnnualGross = grossMonthly * 12 (no partial-year joining logic)
 *   - investmentDeclaration applies only under old regime (80C + 80D max ₹2.5L)
 *   - No surcharge (applicable only above ₹50L income)
 *   - No HRA exemption under old regime (deferred to Phase 2)
 *
 * monthsRemaining: how many months of the FY are left including the current
 * month. Used to spread remaining liability evenly without front-loading.
 */
export function computeTds(
  grossMonthly: number,
  regime: TaxRegime,
  monthsRemaining: number = 12,
  investmentDeclaration: number = 0,
): TdsResult {
  const projectedAnnualGross = grossMonthly * 12;
  const slabs = regime === 'NEW' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const stdDeduction = STANDARD_DEDUCTION[regime];

  let taxableIncome = Math.max(projectedAnnualGross - stdDeduction, 0);

  // Old regime: subtract investment declarations (cap at ₹2.5L combined)
  if (regime === 'OLD') {
    const capped = Math.min(investmentDeclaration, 250_000);
    taxableIncome = Math.max(taxableIncome - capped, 0);
  }

  let tax = computeTaxOnSlabs(taxableIncome, slabs);

  // Rebate u/s 87A: zero tax if taxable income within threshold
  if (taxableIncome <= REBATE_THRESHOLD[regime]) {
    tax = 0;
  }

  const taxWithCess = Math.round(tax * (1 + CESS_RATE));
  const monthlyTds = monthsRemaining > 0
    ? Math.round(taxWithCess / monthsRemaining)
    : 0;

  return {
    monthlyTds,
    projectedAnnualTax: taxWithCess,
    regime,
  };
}

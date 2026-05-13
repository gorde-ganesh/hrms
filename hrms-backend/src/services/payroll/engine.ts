import type { EngineInput, PayrollResult } from './types';
import { computeEarnings } from './earnings';
import { computeLop } from './lop';
import { computePf } from './pf';
import { computeEsi } from './esi';
import { computeProfessionalTax } from './professional-tax';
import { computeTds } from './tds';

const DEFAULT_WORKING_DAYS = 26;

/**
 * Pure payroll calculation engine. No DB calls — all inputs must be pre-fetched.
 *
 * Call sequence:
 *   1. Earnings from CTC + salary structure percentages
 *   2. LOP deduction (absent days)
 *   3. PF on post-LOP basic (basic is prorated if LOP)
 *   4. ESI on post-LOP gross
 *   5. Professional tax on post-LOP gross
 *   6. TDS on projected annual income
 *   7. Net = gross after LOP - employee PF - employee ESI - PT - TDS
 */
export function runPayrollEngine(input: EngineInput): PayrollResult {
  const {
    month,
    year,
    annualCtc,
    basicPct,
    hraPct,
    pfOptOut,
    taxRegime,
    professionalTaxState,
    lopDays = 0,
    workingDays = DEFAULT_WORKING_DAYS,
    investmentDeclaration = 0,
    monthsRemaining,
  } = input;

  // 1. Gross earnings from CTC structure
  const earnings = computeEarnings(annualCtc, basicPct, hraPct);

  // 2. LOP — prorate gross by absent days
  const lop = computeLop(earnings.gross, lopDays, workingDays);
  const effectiveGross = earnings.gross - lop.lopDeduction;

  // Pro-rate component amounts for LOP (each component reduced proportionally)
  const lopRatio = workingDays > 0 ? lop.effectiveWorkingDays / workingDays : 1;
  const effectiveBasic = Math.round(earnings.basic * lopRatio);
  const effectiveHra = Math.round(earnings.hra * lopRatio);
  const effectiveSpecial = effectiveGross - effectiveBasic - effectiveHra;

  // 3. PF on prorated basic
  const pf = computePf(effectiveBasic, pfOptOut);

  // 4. ESI on prorated gross
  const esi = computeEsi(effectiveGross);

  // 5. Professional tax
  const pt = computeProfessionalTax(effectiveGross, professionalTaxState, month);

  // 6. TDS — project on full (non-LOP) monthly gross for smoothing accuracy
  //    monthsRemaining defaults to months left in FY from the current month
  const fyMonthsRemaining = monthsRemaining ?? remainingFyMonths(month, year);
  const tds = computeTds(earnings.gross, taxRegime, fyMonthsRemaining, investmentDeclaration);

  // 7. Net salary
  const totalDeductions =
    lop.lopDeduction +
    pf.employeeContribution +
    esi.employeeContribution +
    pt.amount +
    tds.monthlyTds;
  const netSalary = Math.max(earnings.gross - totalDeductions, 0);

  // Build flat component list for PayrollComponent table
  const components = buildComponentLines(
    effectiveBasic,
    effectiveHra,
    effectiveSpecial,
    lop,
    pf,
    esi,
    pt.amount,
    tds.monthlyTds,
  );

  return {
    grossSalary: effectiveGross,
    basicSalary: effectiveBasic,
    netSalary,
    lopDays: lop.lopDays,
    workingDays,
    components,
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function remainingFyMonths(month: number, year: number): number {
  // Indian FY: April (4) to March (3)
  const fyEndMonth = 3;
  const fyEndYear = month <= 3 ? year : year + 1;
  const fyEndDate = new Date(fyEndYear, fyEndMonth - 1, 1);
  const currentDate = new Date(year, month - 1, 1);
  const diff = fyEndDate.getTime() - currentDate.getTime();
  const months = Math.round(diff / (1000 * 60 * 60 * 24 * 30));
  return Math.max(months, 1);
}

function buildComponentLines(
  basic: number,
  hra: number,
  special: number,
  lop: ReturnType<typeof computeLop>,
  pf: ReturnType<typeof computePf>,
  esi: ReturnType<typeof computeEsi>,
  pt: number,
  tds: number,
) {
  const lines = [];

  lines.push({ statutoryType: 'BASIC', label: 'Basic Salary', amount: basic, type: 'ALLOWANCE' as const });
  if (hra > 0) {
    lines.push({ statutoryType: 'HRA', label: 'HRA', amount: hra, type: 'ALLOWANCE' as const });
  }
  if (special > 0) {
    lines.push({ statutoryType: 'SPECIAL_ALLOWANCE', label: 'Special Allowance', amount: special, type: 'ALLOWANCE' as const });
  }

  if (lop.lopDays > 0) {
    lines.push({ statutoryType: 'LOP', label: `LOP (${lop.lopDays} days)`, amount: lop.lopDeduction, type: 'DEDUCTION' as const });
  }
  if (pf.applicable) {
    lines.push({ statutoryType: 'PF_EMPLOYEE', label: 'PF (Employee)', amount: pf.employeeContribution, type: 'DEDUCTION' as const });
    lines.push({ statutoryType: 'PF_EMPLOYER', label: 'PF (Employer)', amount: pf.totalEmployerContribution, type: 'DEDUCTION' as const });
  }
  if (esi.applicable) {
    lines.push({ statutoryType: 'ESI_EMPLOYEE', label: 'ESI (Employee)', amount: esi.employeeContribution, type: 'DEDUCTION' as const });
    lines.push({ statutoryType: 'ESI_EMPLOYER', label: 'ESI (Employer)', amount: esi.employerContribution, type: 'DEDUCTION' as const });
  }
  if (pt > 0) {
    lines.push({ statutoryType: 'PROFESSIONAL_TAX', label: 'Professional Tax', amount: pt, type: 'DEDUCTION' as const });
  }
  if (tds > 0) {
    lines.push({ statutoryType: 'TDS', label: 'TDS (Income Tax)', amount: tds, type: 'DEDUCTION' as const });
  }

  return lines;
}

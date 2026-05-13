// All money amounts in this module are in RUPEES (not paise).
// Internally the engine rounds to the nearest rupee using Math.round().
// At DB write time amounts are cast to Prisma.Decimal(12,2).

export type TaxRegime = 'OLD' | 'NEW';

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  specialAllowance: number;
  gross: number;
}

export interface LopResult {
  lopDays: number;
  lopDeduction: number; // rupees deducted for absent days
  effectiveWorkingDays: number;
}

export interface PfResult {
  applicable: boolean;
  pfWages: number;              // basic capped at ₹15,000
  employeeContribution: number; // 12% of pfWages
  employerEpf: number;          // 3.67% of pfWages
  employerEps: number;          // 8.33% of pfWages (capped at ₹1,250)
  totalEmployerContribution: number; // 12% (EPF + EPS)
}

export interface EsiResult {
  applicable: boolean;          // gross <= ₹21,000
  employeeContribution: number; // 0.75% of gross, rounded to nearest rupee
  employerContribution: number; // 3.25% of gross, rounded to nearest rupee
}

export interface PtResult {
  amount: number; // monthly professional tax in rupees
  state: string | null;
}

export interface TdsResult {
  monthlyTds: number;           // tax to deduct this month
  projectedAnnualTax: number;   // full-year tax projection
  regime: TaxRegime;
}

// Flat component list stored in PayrollComponent table
export interface ComponentLine {
  statutoryType: string;  // maps to StatutoryComponentType enum
  label: string;
  amount: number; // rupees
  type: 'ALLOWANCE' | 'DEDUCTION';
}

// Input to the engine — all data already fetched from DB
export interface EngineInput {
  employeeId: string;
  month: number;   // 1–12
  year: number;
  annualCtc: number;       // Employee.salary (annual CTC in rupees)
  basicPct: number;        // SalaryStructure.basicPct (e.g. 40.00 = 40%)
  hraPct: number;          // SalaryStructure.hraPct (e.g. 50.00 = 50% of basic)
  pfOptOut: boolean;
  taxRegime: TaxRegime;
  professionalTaxState: string | null; // 'MH', 'KA', or null
  lopDays: number;         // from attendance/leave records
  workingDays: number;     // payable working days in the month (default 26)
  investmentDeclaration?: number; // 80C + 80D total declared (old regime, annual)
  // Optional: projected remaining months salary for TDS smoothing
  monthsRemaining?: number; // how many months left in FY including this one
}

export interface PayrollResult {
  grossSalary: number;
  basicSalary: number;
  netSalary: number;
  lopDays: number;
  workingDays: number;
  components: ComponentLine[];
}

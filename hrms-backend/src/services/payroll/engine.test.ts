import { describe, it, expect } from 'vitest';
import { runPayrollEngine } from './engine';
import type { EngineInput } from './types';

const baseInput: EngineInput = {
  employeeId: 'test-emp',
  month: 6,
  year: 2025,
  annualCtc: 600_000,      // ₹6L / year = ₹50k/month gross
  basicPct: 40,            // 40% of gross = ₹20k basic
  hraPct: 50,              // 50% of basic = ₹10k HRA
  pfOptOut: false,
  taxRegime: 'NEW',
  professionalTaxState: 'MH',
  lopDays: 0,
  workingDays: 26,
  monthsRemaining: 10,     // fixed to make TDS assertions stable
};

describe('payroll engine — earnings', () => {
  it('computes gross, basic, hra, special for standard CTC', () => {
    const result = runPayrollEngine(baseInput);
    expect(result.grossSalary).toBe(50_000);
    expect(result.basicSalary).toBe(20_000);
    const basic = result.components.find(c => c.statutoryType === 'BASIC');
    const hra = result.components.find(c => c.statutoryType === 'HRA');
    const special = result.components.find(c => c.statutoryType === 'SPECIAL_ALLOWANCE');
    expect(basic?.amount).toBe(20_000);
    expect(hra?.amount).toBe(10_000);
    expect(special?.amount).toBe(20_000); // 50k - 20k - 10k
  });
});

describe('payroll engine — PF', () => {
  it('deducts 12% of basic when basic <= ₹15k (PF wage ceiling applies)', () => {
    // Basic ₹20k → PF wages capped at ₹15k → employee PF = ₹1800
    const result = runPayrollEngine(baseInput);
    const pf = result.components.find(c => c.statutoryType === 'PF_EMPLOYEE');
    expect(pf?.amount).toBe(1_800); // 12% of ₹15k
  });

  it('employee PF = 12% of actual basic when basic < ₹15k', () => {
    const input: EngineInput = { ...baseInput, annualCtc: 240_000 }; // ₹20k/month
    // gross=20k, basic=8k (40%), hra=4k, special=8k
    const result = runPayrollEngine(input);
    const pf = result.components.find(c => c.statutoryType === 'PF_EMPLOYEE');
    expect(pf?.amount).toBe(960); // 12% of ₹8k
  });

  it('no PF when pfOptOut is true', () => {
    const result = runPayrollEngine({ ...baseInput, pfOptOut: true });
    const pf = result.components.find(c => c.statutoryType === 'PF_EMPLOYEE');
    expect(pf).toBeUndefined();
  });

  it('employer EPS capped at ₹1250', () => {
    // basic = ₹20k → pfWages = ₹15k → EPS = 8.33% of 15k = ₹1249 (rounds to 1250)
    // (Math.round(15000 * 0.0833) = 1250 — exactly the cap)
    const result = runPayrollEngine(baseInput);
    const employerPf = result.components.find(c => c.statutoryType === 'PF_EMPLOYER');
    // totalEmployerContribution = 12% of 15k = 1800, EPS capped at 1250, EPF = 550
    expect(employerPf?.amount).toBe(1_800);
  });
});

describe('payroll engine — ESI', () => {
  it('applies ESI when gross <= ₹21k', () => {
    const input: EngineInput = { ...baseInput, annualCtc: 240_000 }; // ₹20k/month gross
    const result = runPayrollEngine(input);
    const esiEmp = result.components.find(c => c.statutoryType === 'ESI_EMPLOYEE');
    expect(esiEmp).toBeDefined();
    expect(esiEmp?.amount).toBe(150); // 0.75% of ₹20k
  });

  it('no ESI when gross > ₹21k', () => {
    const result = runPayrollEngine(baseInput); // gross = ₹50k
    const esiEmp = result.components.find(c => c.statutoryType === 'ESI_EMPLOYEE');
    expect(esiEmp).toBeUndefined();
  });

  it('ESI at ₹21k ceiling — exactly ₹21k is applicable', () => {
    const input: EngineInput = { ...baseInput, annualCtc: 252_000 }; // ₹21k/month
    const result = runPayrollEngine(input);
    const esiEmp = result.components.find(c => c.statutoryType === 'ESI_EMPLOYEE');
    expect(esiEmp?.amount).toBe(158); // Math.round(21000 * 0.0075) = 158
  });

  it('no ESI when gross is ₹21001', () => {
    const input: EngineInput = { ...baseInput, annualCtc: 252_012 }; // just above ₹21k
    const result = runPayrollEngine(input);
    const esiEmp = result.components.find(c => c.statutoryType === 'ESI_EMPLOYEE');
    // gross rounds to 21001 — just over ceiling
    expect(esiEmp).toBeUndefined();
  });
});

describe('payroll engine — LOP', () => {
  it('deducts proportional amount for absent days', () => {
    const result = runPayrollEngine({ ...baseInput, lopDays: 2 });
    const lopLine = result.components.find(c => c.statutoryType === 'LOP');
    // 50000 / 26 * 2 = 3846 (rounded)
    expect(lopLine?.amount).toBe(3_846);
    expect(result.lopDays).toBe(2);
  });

  it('no LOP component when lopDays = 0', () => {
    const result = runPayrollEngine(baseInput);
    const lopLine = result.components.find(c => c.statutoryType === 'LOP');
    expect(lopLine).toBeUndefined();
  });

  it('lopDays capped at workingDays', () => {
    const result = runPayrollEngine({ ...baseInput, lopDays: 30, workingDays: 26 });
    expect(result.lopDays).toBe(26);
  });
});

describe('payroll engine — professional tax', () => {
  it('returns ₹200 for Maharashtra employee earning > ₹10k (non-Feb)', () => {
    const result = runPayrollEngine({ ...baseInput, month: 6 });
    const pt = result.components.find(c => c.statutoryType === 'PROFESSIONAL_TAX');
    expect(pt?.amount).toBe(200);
  });

  it('returns ₹300 in February for Maharashtra', () => {
    const result = runPayrollEngine({ ...baseInput, month: 2 });
    const pt = result.components.find(c => c.statutoryType === 'PROFESSIONAL_TAX');
    expect(pt?.amount).toBe(300);
  });

  it('returns ₹0 for null state', () => {
    const result = runPayrollEngine({ ...baseInput, professionalTaxState: null });
    const pt = result.components.find(c => c.statutoryType === 'PROFESSIONAL_TAX');
    expect(pt).toBeUndefined();
  });

  it('applies Karnataka slab correctly', () => {
    const input: EngineInput = { ...baseInput, professionalTaxState: 'KA', annualCtc: 300_000 };
    // gross = 25k → KA slab ≥₹25k = ₹200
    const result = runPayrollEngine(input);
    const pt = result.components.find(c => c.statutoryType === 'PROFESSIONAL_TAX');
    expect(pt?.amount).toBe(200);
  });
});

describe('payroll engine — TDS', () => {
  it('zero TDS under new regime when annual income <= ₹7L (rebate 87A)', () => {
    // annualCtc = ₹6L → taxable = 600k - 75k (std deduction) = 525k < 700k → rebate
    const input: EngineInput = { ...baseInput, annualCtc: 600_000, taxRegime: 'NEW' };
    const result = runPayrollEngine(input);
    const tds = result.components.find(c => c.statutoryType === 'TDS');
    expect(tds).toBeUndefined();
  });

  it('TDS applies under new regime for income > ₹7L', () => {
    // annualCtc = ₹10L → taxable = 1000k - 75k = 925k → tax on 925k new regime
    const input: EngineInput = { ...baseInput, annualCtc: 1_000_000, taxRegime: 'NEW', monthsRemaining: 12 };
    const result = runPayrollEngine(input);
    const tds = result.components.find(c => c.statutoryType === 'TDS');
    expect(tds?.amount).toBeGreaterThan(0);
  });

  it('old regime: investment declaration reduces TDS', () => {
    const input: EngineInput = {
      ...baseInput,
      annualCtc: 1_000_000,
      taxRegime: 'OLD',
      monthsRemaining: 12,
      investmentDeclaration: 0,
    };
    const inputWithDeclaration: EngineInput = {
      ...input,
      investmentDeclaration: 150_000,
    };
    const withoutDecl = runPayrollEngine(input);
    const withDecl = runPayrollEngine(inputWithDeclaration);
    const tdsWithout = withoutDecl.components.find(c => c.statutoryType === 'TDS')?.amount ?? 0;
    const tdsWith = withDecl.components.find(c => c.statutoryType === 'TDS')?.amount ?? 0;
    expect(tdsWith).toBeLessThan(tdsWithout);
  });
});

describe('payroll engine — net salary', () => {
  it('net = gross - employee PF - employee ESI - PT - TDS (no LOP)', () => {
    // ₹6L CTC, MH, new regime — TDS = 0 (rebate), no ESI (gross > 21k)
    // PF employee = 1800, PT = 200
    const result = runPayrollEngine(baseInput);
    const expectedNet = result.grossSalary - 1_800 - 200;
    expect(result.netSalary).toBe(expectedNet);
  });

  it('net is never negative', () => {
    const result = runPayrollEngine({ ...baseInput, lopDays: 26 }); // full month absent
    expect(result.netSalary).toBeGreaterThanOrEqual(0);
  });
});

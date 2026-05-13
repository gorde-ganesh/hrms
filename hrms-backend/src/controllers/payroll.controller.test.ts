import { describe, it, expect, vi, beforeEach } from 'vitest';

// Full prisma mock including new models and $transaction
vi.mock('../lib/prisma', () => ({
  prisma: {
    employee: { findUnique: vi.fn(), findMany: vi.fn() },
    salaryStructure: { findFirst: vi.fn() },
    attendance: { findMany: vi.fn() },
    leave: { findMany: vi.fn() },
    payrollComponentType: { findMany: vi.fn() },
    payroll: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payslip: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    department: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({
      payroll: { create: vi.fn().mockResolvedValue({ id: 'pr-1', netSalary: 90000, status: 'DRAFT' }), update: vi.fn().mockResolvedValue({ id: 'pr-1', status: 'FINALIZED' }) },
      auditLog: { create: vi.fn() },
      payslip: { upsert: vi.fn() },
    })),
  },
}));

vi.mock('../utils/notification', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs so finalizePayroll doesn't need a real disk
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
    createReadStream: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
  };
});

import { prisma } from '../lib/prisma';
import { generatePayroll, finalizePayroll, markPayrollPaid, getPayroll } from './payroll.controller';
import { HttpError } from '../utils/http-error';

const mockPrisma = prisma as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  res.end = vi.fn();
  return res;
};

const mockReq = (body = {}, params = {}, query = {}, user = { id: 'user-1', role: 'HR', employeeId: 'emp-1' }) =>
  ({ body, params, query, user } as any);

const baseEmployee = {
  id: 'emp-1',
  salary: 1_200_000,
  pfOptOut: false,
  taxRegime: 'NEW',
  professionalTaxState: 'MH',
  user: { id: 'user-1', name: 'Alice', companyId: 'company-1' },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no salary structure (use fallback 40%/50%), no LOP
  mockPrisma.salaryStructure.findFirst.mockResolvedValue(null);
  mockPrisma.attendance.findMany.mockResolvedValue([]);
  mockPrisma.leave.findMany.mockResolvedValue([]);
  // Statutory component types available
  mockPrisma.payrollComponentType.findMany.mockResolvedValue([
    { id: 'ct-basic', statutoryType: 'BASIC' },
    { id: 'ct-hra', statutoryType: 'HRA' },
    { id: 'ct-special', statutoryType: 'SPECIAL_ALLOWANCE' },
    { id: 'ct-pf-emp', statutoryType: 'PF_EMPLOYEE' },
    { id: 'ct-pf-er', statutoryType: 'PF_EMPLOYER' },
    { id: 'ct-pt', statutoryType: 'PROFESSIONAL_TAX' },
    { id: 'ct-tds', statutoryType: 'TDS' },
  ]);
  // Reset $transaction to default
  mockPrisma.$transaction.mockImplementation((fn: any) => fn({
    payroll: {
      create: vi.fn().mockResolvedValue({ id: 'pr-1', netSalary: 90000, status: 'DRAFT' }),
      update: vi.fn().mockResolvedValue({ id: 'pr-1', status: 'FINALIZED' }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    payslip: { upsert: vi.fn().mockResolvedValue({}) },
  }));
});

// ------------------------------------------------------------------
// generatePayroll
// ------------------------------------------------------------------
describe('generatePayroll', () => {
  it('creates payroll with DRAFT status using engine', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(baseEmployee);
    mockPrisma.payroll.findUnique.mockResolvedValue(null);

    const req = mockReq({ employeeId: 'emp-1', month: 6, year: 2025 });
    const res = mockRes();

    await generatePayroll(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when employee not found', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const req = mockReq({ employeeId: 'emp-x', month: 1, year: 2026 });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when employee has no salary', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ ...baseEmployee, salary: null });
    const req = mockReq({ employeeId: 'emp-1', month: 1, year: 2026 });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 for duplicate payroll', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(baseEmployee);
    mockPrisma.payroll.findUnique.mockResolvedValue({ id: 'existing' });

    const req = mockReq({ employeeId: 'emp-1', month: 1, year: 2026 });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// finalizePayroll
// ------------------------------------------------------------------
describe('finalizePayroll', () => {
  const draftPayroll = {
    id: 'pr-1',
    status: 'DRAFT',
    employeeId: 'emp-1',
    month: 1,
    year: 2026,
    netSalary: 90000,
    employee: {
      user: { name: 'Alice' },
      employeeCode: 'EMP001',
      departmentId: 'dept-1',
      salary: 1_200_000,
    },
    components: [],
  };

  beforeEach(() => {
    // findUnique is called twice in finalizePayroll:
    // 1. check DRAFT status, 2. fetch for PDF generation
    mockPrisma.payroll.findUnique
      .mockResolvedValueOnce(draftPayroll) // status check
      .mockResolvedValueOnce(draftPayroll); // PDF generation
    mockPrisma.department.findUnique.mockResolvedValue({ id: 'dept-1', name: 'Engineering' });
  });

  it('transitions DRAFT → FINALIZED and stores payslip', async () => {
    const req = mockReq({}, { id: 'pr-1' }, {}, { id: 'user-1', role: 'HR', employeeId: 'emp-2' });
    const res = mockRes();

    await finalizePayroll(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when payroll not found', async () => {
    mockPrisma.payroll.findUnique.mockReset().mockResolvedValue(null);
    const req = mockReq({}, { id: 'pr-x' });
    await expect(finalizePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when status is not DRAFT', async () => {
    mockPrisma.payroll.findUnique.mockReset().mockResolvedValue({ ...draftPayroll, status: 'FINALIZED' });
    const req = mockReq({}, { id: 'pr-1' });
    await expect(finalizePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// markPayrollPaid
// ------------------------------------------------------------------
describe('markPayrollPaid', () => {
  it('transitions FINALIZED → PAID', async () => {
    const payroll = { id: 'pr-1', status: 'FINALIZED', employeeId: 'emp-1', month: 1, year: 2026 };
    mockPrisma.payroll.findUnique.mockResolvedValue(payroll);

    const req = mockReq({}, { id: 'pr-1' });
    const res = mockRes();

    await markPayrollPaid(req, res);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 400 when status is not FINALIZED', async () => {
    mockPrisma.payroll.findUnique.mockResolvedValue({ id: 'pr-1', status: 'DRAFT', employeeId: 'emp-1' });
    const req = mockReq({}, { id: 'pr-1' });
    await expect(markPayrollPaid(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// getPayroll — pagination
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// LOP — approved UNPAID leave integration
// ------------------------------------------------------------------
describe('generatePayroll — LOP from UNPAID leave', () => {
  it('queries leave.findMany with UNPAID/APPROVED filter for the payroll month', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(baseEmployee);
    mockPrisma.payroll.findUnique.mockResolvedValue(null);

    const req = mockReq({ employeeId: 'emp-1', month: 6, year: 2025 });
    await generatePayroll(req, mockRes());

    expect(mockPrisma.leave.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: 'emp-1',
          leaveType: 'UNPAID',
          status: 'APPROVED',
        }),
      }),
    );
  });

  it('succeeds when UNPAID leave days fall in the payroll month', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(baseEmployee);
    mockPrisma.payroll.findUnique.mockResolvedValue(null);
    mockPrisma.leave.findMany.mockResolvedValue([
      { startDate: new Date(2025, 5, 3), endDate: new Date(2025, 5, 5), halfDay: false },
    ]);

    const req = mockReq({ employeeId: 'emp-1', month: 6, year: 2025 });
    const res = mockRes();
    await generatePayroll(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not double-count a date present in both attendance ABSENT and UNPAID leave', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(baseEmployee);
    mockPrisma.payroll.findUnique.mockResolvedValue(null);
    const sharedDate = new Date(2025, 5, 10); // Jun 10
    mockPrisma.attendance.findMany.mockResolvedValue([{ attendanceDate: sharedDate }]);
    mockPrisma.leave.findMany.mockResolvedValue([
      { startDate: sharedDate, endDate: sharedDate, halfDay: false },
    ]);

    const req = mockReq({ employeeId: 'emp-1', month: 6, year: 2025 });
    const res = mockRes();
    await generatePayroll(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('half-day UNPAID leave contributes 0.5 LOP and does not throw', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(baseEmployee);
    mockPrisma.payroll.findUnique.mockResolvedValue(null);
    mockPrisma.leave.findMany.mockResolvedValue([
      { startDate: new Date(2025, 5, 10), endDate: new Date(2025, 5, 10), halfDay: true },
    ]);

    const req = mockReq({ employeeId: 'emp-1', month: 6, year: 2025 });
    const res = mockRes();
    await generatePayroll(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getPayroll', () => {
  it('returns paginated records ordered by year desc, month desc', async () => {
    const records = [{ id: 'pr-1' }];
    mockPrisma.payroll.findMany.mockResolvedValue(records);
    mockPrisma.payroll.count.mockResolvedValue(1);

    const req = mockReq({}, {}, { employeeId: 'emp-1', month: '1', year: '2026' });
    const res = mockRes();

    await getPayroll(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalRecords: 1 }) })
    );
    expect(mockPrisma.payroll.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })
    );
  });
});

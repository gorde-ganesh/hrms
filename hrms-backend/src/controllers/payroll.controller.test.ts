import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    employee: { findUnique: vi.fn() },
    payrollComponentType: { findMany: vi.fn() },
    payroll: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../utils/notification', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../lib/prisma';
import { generatePayroll, finalizePayroll, markPayrollPaid, getPayroll } from './payroll.controller';
import { HttpError } from '../utils/http-error';

const mockPrisma = prisma as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (body = {}, params = {}, query = {}, user = { id: 'user-1', role: 'HR', employeeId: 'emp-1' }) =>
  ({ body, params, query, user } as any);

beforeEach(() => vi.clearAllMocks());

// ------------------------------------------------------------------
// generatePayroll
// ------------------------------------------------------------------
describe('generatePayroll', () => {
  const employee = {
    id: 'emp-1',
    salary: 1200000,
    user: { name: 'Alice' },
  };

  const components = [
    { componentTypeId: 'ct-1', percent: 40 },
    { componentTypeId: 'ct-2', percent: 10 },
  ];

  const componentTypes = [
    { id: 'ct-1', type: 'ALLOWANCE' },
    { id: 'ct-2', type: 'DEDUCTION' },
  ];

  it('creates payroll with correct netSalary and DRAFT status', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(employee);
    mockPrisma.payrollComponentType.findMany.mockResolvedValue(componentTypes);
    mockPrisma.payroll.findUnique.mockResolvedValue(null);
    mockPrisma.payroll.create.mockResolvedValue({ id: 'pr-1', netSalary: 36000, status: 'DRAFT' });

    const req = mockReq({ employeeId: 'emp-1', month: 1, year: 2026, components });
    const res = mockRes();

    await generatePayroll(req, res);

    expect(mockPrisma.payroll.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          basicSalary: 100000,
        }),
      })
    );

    const callData = mockPrisma.payroll.create.mock.calls[0][0].data;
    // 1,200,000 / 12 = 100,000/month
    // Allowance 40% = 40,000; Deduction 10% = 10,000; net = 30,000
    expect(callData.netSalary).toBe(30000);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when employee not found', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const req = mockReq({ employeeId: 'emp-x', month: 1, year: 2026, components });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 404 when employee has no salary', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ ...employee, salary: null });
    const req = mockReq({ employeeId: 'emp-1', month: 1, year: 2026, components });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 for duplicate payroll', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(employee);
    mockPrisma.payrollComponentType.findMany.mockResolvedValue(componentTypes);
    mockPrisma.payroll.findUnique.mockResolvedValue({ id: 'existing' });

    const req = mockReq({ employeeId: 'emp-1', month: 1, year: 2026, components });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 404 when a componentType is not found', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(employee);
    mockPrisma.payrollComponentType.findMany.mockResolvedValue([componentTypes[0]]); // ct-2 missing
    mockPrisma.payroll.findUnique.mockResolvedValue(null);

    const req = mockReq({ employeeId: 'emp-1', month: 1, year: 2026, components });
    await expect(generatePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// finalizePayroll
// ------------------------------------------------------------------
describe('finalizePayroll', () => {
  it('transitions DRAFT → FINALIZED', async () => {
    const payroll = { id: 'pr-1', status: 'DRAFT', employeeId: 'emp-1', month: 1, year: 2026 };
    mockPrisma.payroll.findUnique.mockResolvedValue(payroll);
    mockPrisma.payroll.update.mockResolvedValue({ ...payroll, status: 'FINALIZED' });

    const req = mockReq({}, { id: 'pr-1' }, {}, { id: 'user-1', role: 'HR', employeeId: 'emp-2' });
    const res = mockRes();

    await finalizePayroll(req, res);
    expect(mockPrisma.payroll.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FINALIZED' }) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when payroll not found', async () => {
    mockPrisma.payroll.findUnique.mockResolvedValue(null);
    const req = mockReq({}, { id: 'pr-x' });
    await expect(finalizePayroll(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when status is not DRAFT', async () => {
    mockPrisma.payroll.findUnique.mockResolvedValue({ id: 'pr-1', status: 'FINALIZED', employeeId: 'emp-1' });
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
    mockPrisma.payroll.update.mockResolvedValue({ ...payroll, status: 'PAID' });

    const req = mockReq({}, { id: 'pr-1' });
    const res = mockRes();

    await markPayrollPaid(req, res);
    expect(mockPrisma.payroll.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) })
    );
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
describe('getPayroll', () => {
  it('returns paginated records with totalRecords', async () => {
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
  });
});

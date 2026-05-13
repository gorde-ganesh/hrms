import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    employee: { findUnique: vi.fn() },
    salaryStructure: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    payroll: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: any) =>
      fn({
        salaryStructure: {
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue(baseStructure),
          delete: vi.fn().mockResolvedValue({}),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    ),
  },
}));

import { prisma } from '../lib/prisma';
import {
  createSalaryStructure,
  getSalaryStructures,
  getSalaryStructureById,
  updateSalaryStructure,
  deleteSalaryStructure,
} from './salary-structure.controller';
import { HttpError } from '../utils/http-error';

const mockPrisma = prisma as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (body = {}, params = {}, query = {}, user: any = { id: 'user-1', role: 'HR' }) =>
  ({ body, params, query, user } as any);

const baseStructure = {
  id: 'ss-1',
  employeeId: 'emp-1',
  ctcAnnual: 1_200_000,
  basicPct: 40,
  hraPct: 50,
  effectiveFrom: new Date('2025-01-01'),
  effectiveTo: null,
  createdAt: new Date(),
  createdById: 'user-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.employee.findUnique.mockResolvedValue({ id: 'emp-1' });
  mockPrisma.salaryStructure.findFirst.mockResolvedValue(null);
  mockPrisma.salaryStructure.findUnique.mockResolvedValue(baseStructure);
  mockPrisma.payroll.findFirst.mockResolvedValue(null);
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    fn({
      salaryStructure: {
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue(baseStructure),
        delete: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }),
  );
});

// ------------------------------------------------------------------
// createSalaryStructure
// ------------------------------------------------------------------
describe('createSalaryStructure', () => {
  const validBody = {
    employeeId: 'emp-1',
    ctcAnnual: 1_200_000,
    basicPct: 40,
    hraPct: 50,
    effectiveFrom: '2025-01-01',
  };

  it('creates structure and returns 201', async () => {
    const req = mockReq(validBody);
    const res = mockRes();
    await createSalaryStructure(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws 404 when employee not found', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    await expect(createSalaryStructure(mockReq(validBody), mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when a structure with same effectiveFrom already exists', async () => {
    mockPrisma.salaryStructure.findFirst.mockResolvedValue(baseStructure);
    await expect(createSalaryStructure(mockReq(validBody), mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('closes the current active structure before creating the new one', async () => {
    // findFirst returns active structure for the duplicate check → null (no dup)
    // then returns active structure for the "current active" query
    mockPrisma.salaryStructure.findFirst
      .mockResolvedValueOnce(null)          // no duplicate
      .mockResolvedValueOnce(baseStructure); // current active to close

    let closedId: string | undefined;
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const txUpdate = vi.fn().mockResolvedValue({});
      const txCreate = vi.fn().mockResolvedValue(baseStructure);
      await fn({
        salaryStructure: { update: txUpdate, create: txCreate, findFirst: vi.fn().mockResolvedValue(null) },
        auditLog: { create: vi.fn() },
      });
      closedId = txUpdate.mock.calls[0]?.[0]?.where?.id;
      return baseStructure;
    });

    await createSalaryStructure(mockReq(validBody), mockRes());
    expect(closedId).toBe('ss-1');
  });
});

// ------------------------------------------------------------------
// getSalaryStructures
// ------------------------------------------------------------------
describe('getSalaryStructures', () => {
  it('throws 400 when employeeId is missing', async () => {
    await expect(getSalaryStructures(mockReq({}, {}, {}), mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('returns list of structures for an employee', async () => {
    mockPrisma.salaryStructure.findMany.mockResolvedValue([baseStructure]);

    const req = mockReq({}, {}, { employeeId: 'emp-1' });
    const res = mockRes();
    await getSalaryStructures(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.salaryStructure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employeeId: 'emp-1' },
        orderBy: { effectiveFrom: 'desc' },
      }),
    );
  });
});

// ------------------------------------------------------------------
// getSalaryStructureById
// ------------------------------------------------------------------
describe('getSalaryStructureById', () => {
  it('returns structure by id', async () => {
    const req = mockReq({}, { id: 'ss-1' });
    const res = mockRes();
    await getSalaryStructureById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when not found', async () => {
    mockPrisma.salaryStructure.findUnique.mockResolvedValue(null);
    await expect(getSalaryStructureById(mockReq({}, { id: 'bad' }), mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// updateSalaryStructure
// ------------------------------------------------------------------
describe('updateSalaryStructure', () => {
  it('updates allowed fields and returns 200', async () => {
    mockPrisma.salaryStructure.update.mockResolvedValue({ ...baseStructure, ctcAnnual: 1_500_000 });

    const req = mockReq({ ctcAnnual: 1_500_000 }, { id: 'ss-1' });
    const res = mockRes();
    await updateSalaryStructure(req, res);

    expect(mockPrisma.salaryStructure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ss-1' },
        data: expect.objectContaining({ ctcAnnual: 1_500_000 }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when structure not found', async () => {
    mockPrisma.salaryStructure.findUnique.mockResolvedValue(null);
    await expect(updateSalaryStructure(mockReq({}, { id: 'bad' }), mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// deleteSalaryStructure
// ------------------------------------------------------------------
describe('deleteSalaryStructure', () => {
  it('deletes structure when no finalized payrolls exist', async () => {
    const req = mockReq({}, { id: 'ss-1' });
    const res = mockRes();
    await deleteSalaryStructure(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 409 when finalized payrolls exist in the window', async () => {
    mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'pr-1', status: 'FINALIZED' });

    await expect(deleteSalaryStructure(mockReq({}, { id: 'ss-1' }), mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 404 when structure not found', async () => {
    mockPrisma.salaryStructure.findUnique.mockResolvedValue(null);
    await expect(deleteSalaryStructure(mockReq({}, { id: 'bad' }), mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

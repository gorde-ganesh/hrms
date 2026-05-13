import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    payroll: { findMany: vi.fn() },
    bankTransferBatch: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: any) =>
      fn({
        bankTransferBatch: {
          create: vi.fn().mockResolvedValue({
            id: 'batch-1',
            month: 6,
            year: 2025,
            status: 'PENDING',
            items: [
              {
                id: 'item-1',
                accountNumber: '1234567890',
                ifscCode: 'HDFC0001234',
                beneficiaryName: 'Alice',
                amount: 90000,
              },
            ],
          }),
          update: vi.fn().mockResolvedValue({ id: 'batch-1', status: 'SUBMITTED' }),
        },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    ),
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
    existsSync: vi.fn().mockReturnValue(false),
    createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn(), on: vi.fn() }),
  };
});

import { prisma } from '../lib/prisma';
import {
  createBankTransferBatch,
  getBankTransferBatches,
  downloadBankTransferCsv,
  markBatchSubmitted,
} from './bank-transfer.controller';
import { HttpError } from '../utils/http-error';

const mockPrisma = prisma as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  res.end = vi.fn();
  res.on = vi.fn();
  res.emit = vi.fn();
  res.once = vi.fn();
  res.removeListener = vi.fn();
  return res;
};

const mockReq = (
  body = {},
  params = {},
  query = {},
  user: any = { id: 'user-1', role: 'HR', companyId: 'company-1' },
) => ({ body, params, query, user } as any);

const basePayroll = {
  id: 'pr-1',
  month: 6,
  year: 2025,
  status: 'FINALIZED',
  netSalary: 90000,
  employeeId: 'emp-1',
  employee: {
    bankAccountNumber: '1234567890',
    ifscCode: 'HDFC0001234',
    user: { name: 'Alice' },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    fn({
      bankTransferBatch: {
        create: vi.fn().mockResolvedValue({
          id: 'batch-1',
          month: 6,
          year: 2025,
          status: 'PENDING',
          items: [
            {
              id: 'item-1',
              accountNumber: '1234567890',
              ifscCode: 'HDFC0001234',
              beneficiaryName: 'Alice',
              amount: 90000,
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({ id: 'batch-1', status: 'SUBMITTED' }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }),
  );
});

// ------------------------------------------------------------------
// createBankTransferBatch
// ------------------------------------------------------------------
describe('createBankTransferBatch', () => {
  it('creates a batch and returns it with skipped list', async () => {
    mockPrisma.payroll.findMany.mockResolvedValue([basePayroll]);
    mockPrisma.bankTransferBatch.update.mockResolvedValue({});

    const req = mockReq({ month: 6, year: 2025 });
    const res = mockRes();
    await createBankTransferBatch(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws 400 when no finalized payrolls found', async () => {
    mockPrisma.payroll.findMany.mockResolvedValue([]);
    const req = mockReq({ month: 6, year: 2025 });
    await expect(createBankTransferBatch(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when all employees are missing bank details', async () => {
    mockPrisma.payroll.findMany.mockResolvedValue([
      { ...basePayroll, employee: { bankAccountNumber: null, ifscCode: null, user: { name: 'Bob' } } },
    ]);
    const req = mockReq({ month: 6, year: 2025 });
    await expect(createBankTransferBatch(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when company context is missing', async () => {
    const req = mockReq({ month: 6, year: 2025 }, {}, {}, { id: 'user-1', role: 'HR' });
    await expect(createBankTransferBatch(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('includes skipped employees in response when some lack bank details', async () => {
    const missingBankPayroll = {
      ...basePayroll,
      id: 'pr-2',
      employeeId: 'emp-2',
      employee: { bankAccountNumber: null, ifscCode: null, user: { name: 'Bob' } },
    };
    mockPrisma.payroll.findMany.mockResolvedValue([basePayroll, missingBankPayroll]);
    mockPrisma.bankTransferBatch.update.mockResolvedValue({});

    const req = mockReq({ month: 6, year: 2025 });
    const res = mockRes();
    await createBankTransferBatch(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.data.skipped).toHaveLength(1);
    expect(responseBody.data.skipped[0].name).toBe('Bob');
  });
});

// ------------------------------------------------------------------
// getBankTransferBatches
// ------------------------------------------------------------------
describe('getBankTransferBatches', () => {
  it('returns paginated batch list', async () => {
    mockPrisma.bankTransferBatch.findMany.mockResolvedValue([{ id: 'batch-1' }]);
    mockPrisma.bankTransferBatch.count.mockResolvedValue(1);

    const req = mockReq({}, {}, { month: '6', year: '2025' });
    const res = mockRes();
    await getBankTransferBatches(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.bankTransferBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }] }),
    );
  });
});

// ------------------------------------------------------------------
// downloadBankTransferCsv
// ------------------------------------------------------------------
describe('downloadBankTransferCsv', () => {
  it('throws 404 when batch not found', async () => {
    mockPrisma.bankTransferBatch.findUnique.mockResolvedValue(null);
    const req = mockReq({}, { batchId: 'bad-id' });
    await expect(downloadBankTransferCsv(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('re-generates CSV when file is missing and streams response', async () => {
    mockPrisma.bankTransferBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      month: 6,
      year: 2025,
      fileUrl: null,
      items: [
        { accountNumber: '1234567890', ifscCode: 'HDFC0001234', beneficiaryName: 'Alice', amount: 90000 },
      ],
    });
    mockPrisma.bankTransferBatch.update.mockResolvedValue({});

    const req = mockReq({}, { batchId: 'batch-1' });
    const res = mockRes();
    await downloadBankTransferCsv(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('neft-salary-JUN-2025.csv'),
    );
  });
});

// ------------------------------------------------------------------
// markBatchSubmitted
// ------------------------------------------------------------------
describe('markBatchSubmitted', () => {
  it('transitions PENDING → SUBMITTED', async () => {
    mockPrisma.bankTransferBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'PENDING' });

    const req = mockReq({}, { batchId: 'batch-1' });
    const res = mockRes();
    await markBatchSubmitted(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 400 when batch is already SUBMITTED', async () => {
    mockPrisma.bankTransferBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'SUBMITTED' });
    const req = mockReq({}, { batchId: 'batch-1' });
    await expect(markBatchSubmitted(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 404 when batch not found', async () => {
    mockPrisma.bankTransferBatch.findUnique.mockResolvedValue(null);
    const req = mockReq({}, { batchId: 'bad-id' });
    await expect(markBatchSubmitted(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

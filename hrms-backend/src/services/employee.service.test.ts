import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the service
vi.mock('../lib/prisma', () => ({
  prisma: {
    employee: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    department: { count: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { EmployeeService } from './employee.service';
import { HttpError } from '../utils/http-error';
import { EmployeeStatus } from '../../generated/prisma';

const svc = new EmployeeService();

beforeEach(() => vi.clearAllMocks());

describe('EmployeeService.ensureUniqueCode', () => {
  it('does nothing when no code provided', async () => {
    await svc.ensureUniqueCode(undefined);
    expect(prisma.employee.findFirst).not.toHaveBeenCalled();
  });

  it('throws when duplicate code found', async () => {
    (prisma.employee.findFirst as any).mockResolvedValue({ id: 'other' });
    await expect(svc.ensureUniqueCode('EMP001')).rejects.toThrow(HttpError);
  });

  it('does not throw when no duplicate', async () => {
    (prisma.employee.findFirst as any).mockResolvedValue(null);
    await expect(svc.ensureUniqueCode('EMP001')).resolves.toBeUndefined();
  });
});

describe('EmployeeService.create', () => {
  const dto = {
    userId: 'user-1',
    departmentId: 'dept-1',
    designationId: 'desig-1',
    joiningDate: '2024-01-01',
    salary: 50000,
  };

  it('activates existing employee instead of creating duplicate', async () => {
    (prisma.employee.findFirst as any).mockResolvedValue(null);
    (prisma.employee.findUnique as any).mockResolvedValue({ id: 'emp-1' });
    (prisma.employee.update as any).mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' });

    const result = await svc.create(dto);
    expect(prisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: EmployeeStatus.ACTIVE } })
    );
    expect(prisma.employee.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'ACTIVE' });
  });

  it('creates a new employee when none exists', async () => {
    (prisma.employee.findFirst as any).mockResolvedValue(null);
    (prisma.employee.findUnique as any).mockResolvedValue(null);
    (prisma.employee.create as any).mockResolvedValue({ id: 'emp-new' });

    const result = await svc.create(dto);
    expect(prisma.employee.create).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'emp-new' });
  });
});

describe('EmployeeService.softDelete', () => {
  it('throws 404 when employee not found', async () => {
    (prisma.employee.findUnique as any).mockResolvedValue(null);
    await expect(svc.softDelete('missing-id')).rejects.toThrow(HttpError);
  });

  it('sets status to INACTIVE', async () => {
    (prisma.employee.findUnique as any).mockResolvedValue({ id: 'emp-1' });
    (prisma.employee.update as any).mockResolvedValue({ id: 'emp-1', status: 'INACTIVE' });

    await svc.softDelete('emp-1');
    expect(prisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: EmployeeStatus.INACTIVE }) })
    );
  });
});

describe('EmployeeService.list', () => {
  it('caps take at 1000', async () => {
    (prisma.employee.findMany as any).mockResolvedValue([]);
    (prisma.employee.count as any).mockResolvedValue(0);

    await svc.list({ top: 9999 });
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 })
    );
  });

  it('defaults to take=10 when not specified', async () => {
    (prisma.employee.findMany as any).mockResolvedValue([]);
    (prisma.employee.count as any).mockResolvedValue(0);

    await svc.list({});
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });
});

describe('EmployeeService.getSummary', () => {
  it('returns aggregated counts', async () => {
    (prisma.employee.count as any)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(5);
    (prisma.department.count as any).mockResolvedValue(10);

    const result = await svc.getSummary();
    expect(result).toEqual({ totalEmployees: 100, activeEmployees: 80, newEmployees: 5, totalDepartments: 10 });
  });
});

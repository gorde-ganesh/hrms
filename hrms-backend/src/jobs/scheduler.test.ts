import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing jobs
vi.mock('../lib/prisma', () => ({
  prisma: {
    attendance: {
      findMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    employee: {
      findMany: vi.fn(),
    },
    leaveBalance: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import { runAttendanceAutoCheckout } from './attendance-auto-checkout.job';
import { runLeaveBalanceReset } from './leave-balance-reset.job';
import { runAbsentMarker } from './absent-marker.job';

const mockPrisma = prisma as any;

beforeEach(() => vi.clearAllMocks());

// -------------------------------------------------------------------
// runAttendanceAutoCheckout
// -------------------------------------------------------------------
describe('runAttendanceAutoCheckout', () => {
  it('does nothing when no open records exist', async () => {
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    await runAttendanceAutoCheckout();
    expect(mockPrisma.attendance.update).not.toHaveBeenCalled();
  });

  it('updates each open record with a checkout time and totalHours', async () => {
    const checkIn = new Date();
    checkIn.setHours(9, 0, 0, 0);
    mockPrisma.attendance.findMany.mockResolvedValue([
      { id: 'att-1', checkIn },
    ]);
    mockPrisma.attendance.update.mockResolvedValue({});

    await runAttendanceAutoCheckout();

    expect(mockPrisma.attendance.update).toHaveBeenCalledOnce();
    const callArgs = mockPrisma.attendance.update.mock.calls[0][0];
    expect(callArgs.where).toEqual({ id: 'att-1' });
    expect(callArgs.data.checkOut).toBeInstanceOf(Date);
    expect(callArgs.data.totalHours).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------
// runLeaveBalanceReset
// -------------------------------------------------------------------
describe('runLeaveBalanceReset', () => {
  it('does nothing when no active employees exist', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);
    await runLeaveBalanceReset();
    expect(mockPrisma.leaveBalance.create).not.toHaveBeenCalled();
  });

  it('creates balance records for each employee and leave type', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1' }]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null); // none exist yet

    await runLeaveBalanceReset();

    // 7 leave types × 1 employee = 7 creates
    expect(mockPrisma.leaveBalance.create).toHaveBeenCalledTimes(7);
  });

  it('skips existing balance records (idempotent)', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1' }]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({ id: 'existing' }); // all exist

    await runLeaveBalanceReset();

    expect(mockPrisma.leaveBalance.create).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------
// runAbsentMarker
// -------------------------------------------------------------------
describe('runAbsentMarker', () => {
  it('creates ABSENT records for employees with no attendance today', async () => {
    // Force a weekday for the test
    const mockDate = new Date('2025-01-06T22:00:00'); // Monday
    vi.setSystemTime(mockDate);

    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }]);
    // emp-1 has a record, emp-2 does not
    mockPrisma.attendance.findFirst
      .mockResolvedValueOnce({ id: 'att-existing' })
      .mockResolvedValueOnce(null);
    mockPrisma.attendance.create.mockResolvedValue({});

    await runAbsentMarker();

    expect(mockPrisma.attendance.create).toHaveBeenCalledOnce();
    expect(mockPrisma.attendance.create.mock.calls[0][0].data.employeeId).toBe('emp-2');
    expect(mockPrisma.attendance.create.mock.calls[0][0].data.status).toBe('ABSENT');

    vi.useRealTimers();
  });
});

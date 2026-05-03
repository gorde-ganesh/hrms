import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/notification', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../lib/prisma', () => ({
  prisma: {
    leave: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    leaveBalance: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    employee: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { calculateLeaveDays, cancelLeave, updateLeaveStatus } from './leave.controller';
import { HttpError } from '../utils/http-error';

const mp = prisma as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (params = {}, body = {}, user: any = { id: 'u1', role: 'HR', employeeId: 'emp-1' }) =>
  ({ params, body, user } as any);

beforeEach(() => vi.clearAllMocks());

// -------------------------------------------------------------------
// calculateLeaveDays — pure function, no DB needed
// -------------------------------------------------------------------
describe('calculateLeaveDays', () => {
  it('counts a single weekday as 1', () => {
    const mon = new Date('2025-01-06'); // Monday
    expect(calculateLeaveDays(mon, mon)).toBe(1);
  });

  it('counts Mon–Fri as 5 days', () => {
    expect(calculateLeaveDays(new Date('2025-01-06'), new Date('2025-01-10'))).toBe(5);
  });

  it('excludes Saturday and Sunday from a full week span', () => {
    // Mon 6 Jan to Sun 12 Jan = 5 working days
    expect(calculateLeaveDays(new Date('2025-01-06'), new Date('2025-01-12'))).toBe(5);
  });

  it('returns 0 when start falls on a weekend and end is same day', () => {
    const sat = new Date('2025-01-11'); // Saturday
    expect(calculateLeaveDays(sat, sat)).toBe(0);
  });

  it('counts two separate weeks correctly', () => {
    // Mon 6 Jan to Fri 17 Jan = 10 working days
    expect(calculateLeaveDays(new Date('2025-01-06'), new Date('2025-01-17'))).toBe(10);
  });

  it('returns 1 for a Friday', () => {
    const fri = new Date('2025-01-10');
    expect(calculateLeaveDays(fri, fri)).toBe(1);
  });
});

// -------------------------------------------------------------------
// cancelLeave
// -------------------------------------------------------------------
describe('cancelLeave', () => {
  const pendingLeave = {
    id: 'leave-1',
    status: 'PENDING',
    employeeId: 'emp-1',
    leaveType: 'ANNUAL',
    startDate: new Date('2025-02-03'), // Monday
    endDate: new Date('2025-02-07'),   // Friday
    employee: { user: { name: 'Alice' } },
  };

  it('cancels a pending leave without touching balance', async () => {
    mp.leave.findUnique.mockResolvedValue(pendingLeave);
    mp.leave.update.mockResolvedValue({ ...pendingLeave, status: 'CANCELLED' });

    const req = mockReq({ id: 'leave-1' }, {});
    const res = mockRes();
    await cancelLeave(req, res);

    expect(mp.leave.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    );
    // leaveBalance should not be touched for PENDING leave
    expect(mp.leaveBalance.upsert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('cancels an approved leave and restores balance', async () => {
    const approvedLeave = { ...pendingLeave, status: 'APPROVED' };
    mp.leave.findUnique.mockResolvedValue(approvedLeave);
    mp.leave.update.mockResolvedValue({ ...approvedLeave, status: 'CANCELLED' });
    const balanceRecord = { id: 'lb-1', employeeId: 'emp-1', year: 2025, leaveType: 'ANNUAL', totalLeaves: 21, usedLeaves: 5 };
    mp.leaveBalance.findUnique.mockResolvedValue(balanceRecord);
    mp.leaveBalance.update.mockResolvedValue({ ...balanceRecord, usedLeaves: 0 });

    const req = mockReq({ id: 'leave-1' }, {});
    const res = mockRes();
    await cancelLeave(req, res);

    expect(mp.leave.update).toHaveBeenCalled();
    // Balance should be restored (usedLeaves decremented)
    expect(mp.leaveBalance.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when leave not found', async () => {
    mp.leave.findUnique.mockResolvedValue(null);
    const req = mockReq({ id: 'bad-id' }, {});
    await expect(cancelLeave(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when leave is already cancelled', async () => {
    mp.leave.findUnique.mockResolvedValue({ ...pendingLeave, status: 'CANCELLED' });
    const req = mockReq({ id: 'leave-1' }, {});
    await expect(cancelLeave(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when leave is rejected', async () => {
    mp.leave.findUnique.mockResolvedValue({ ...pendingLeave, status: 'REJECTED' });
    const req = mockReq({ id: 'leave-1' }, {});
    await expect(cancelLeave(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 403 when EMPLOYEE tries to cancel another employee leave', async () => {
    mp.leave.findUnique.mockResolvedValue({ ...pendingLeave, employeeId: 'emp-other' });
    const req = mockReq({ id: 'leave-1' }, {}, { id: 'u1', role: 'EMPLOYEE', employeeId: 'emp-1' });
    await expect(cancelLeave(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// -------------------------------------------------------------------
// updateLeaveStatus — audit timestamps
// -------------------------------------------------------------------
describe('updateLeaveStatus', () => {
  const leave = {
    id: 'leave-1',
    status: 'PENDING',
    employeeId: 'emp-1',
    leaveType: 'ANNUAL',
    startDate: new Date('2025-02-03'),
    endDate: new Date('2025-02-07'),
    employee: { id: 'emp-1', manager: null, user: { name: 'Alice' } },
  };

  it('sets approvalDate when approving', async () => {
    mp.leave.findUnique.mockResolvedValue(leave);
    mp.user.findUnique.mockResolvedValue({ id: 'u-hr' });
    mp.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });
    const balanceRecord = { id: 'lb-1', employeeId: 'emp-1', year: 2025, leaveType: 'ANNUAL', totalLeaves: 21, usedLeaves: 0 };
    mp.leaveBalance.findUnique.mockResolvedValue(balanceRecord);
    mp.leaveBalance.update.mockResolvedValue({ ...balanceRecord, usedLeaves: 5 });

    const req = mockReq({ id: 'leave-1' }, { status: 'APPROVED', approvedBy: 'u-hr' });
    const res = mockRes();
    await updateLeaveStatus(req, res);

    const updateCall = mp.leave.update.mock.calls[0][0];
    expect(updateCall.data.approvalDate).toBeInstanceOf(Date);
    expect(updateCall.data.rejectionDate).toBeUndefined();
  });

  it('sets rejectionDate and rejectionReason when rejecting', async () => {
    mp.leave.findUnique.mockResolvedValue(leave);
    mp.user.findUnique.mockResolvedValue({ id: 'u-hr' });
    mp.leave.update.mockResolvedValue({ ...leave, status: 'REJECTED' });

    const req = mockReq(
      { id: 'leave-1' },
      { status: 'REJECTED', approvedBy: 'u-hr', rejectionReason: 'Too many absences' }
    );
    const res = mockRes();
    await updateLeaveStatus(req, res);

    const updateCall = mp.leave.update.mock.calls[0][0];
    expect(updateCall.data.rejectionDate).toBeInstanceOf(Date);
    expect(updateCall.data.rejectionReason).toBe('Too many absences');
    expect(updateCall.data.approvalDate).toBeUndefined();
  });

  it('throws 400 when approvedBy is missing', async () => {
    const req = mockReq({ id: 'leave-1' }, { status: 'APPROVED' });
    await expect(updateLeaveStatus(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 404 when leave not found', async () => {
    mp.leave.findUnique.mockResolvedValue(null);
    const req = mockReq({ id: 'bad' }, { status: 'APPROVED', approvedBy: 'u-hr' });
    await expect(updateLeaveStatus(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

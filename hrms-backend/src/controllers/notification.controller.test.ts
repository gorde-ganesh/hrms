import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import { prisma } from '../lib/prisma';
import {
  sendNotification,
  listNotifications,
  markNotificationAsRead,
  sendBulkNotification,
} from './notification.controller';
import { HttpError } from '../utils/http-error';

const mp = prisma as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (body = {}, params = {}, query = {}, user: any = { id: 'u1', role: 'HR', employeeId: 'emp-1' }) =>
  ({ body, params, query, user } as any);

beforeEach(() => vi.clearAllMocks());

// ------------------------------------------------------------------
// sendNotification
// ------------------------------------------------------------------
describe('sendNotification', () => {
  it('creates and returns the notification', async () => {
    const created = { id: 'n-1', employeeId: 'emp-1', type: 'SYSTEM', message: 'hello' };
    mp.notification.create.mockResolvedValue(created);

    const req = mockReq({ employeeId: 'emp-1', type: 'SYSTEM', message: 'hello' });
    const res = mockRes();
    await sendNotification(req, res);

    expect(mp.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ employeeId: 'emp-1' }) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 400 when employeeId missing', async () => {
    const req = mockReq({ type: 'SYSTEM', message: 'hello' });
    await expect(sendNotification(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when message missing', async () => {
    const req = mockReq({ employeeId: 'emp-1', type: 'SYSTEM' });
    await expect(sendNotification(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// listNotifications
// ------------------------------------------------------------------
describe('listNotifications', () => {
  it('returns notifications for the requested employee', async () => {
    mp.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);

    const req = mockReq({}, {}, { employeeId: 'emp-1' });
    const res = mockRes();
    await listNotifications(req, res);

    expect(mp.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp-1' } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 400 when employeeId query param missing', async () => {
    const req = mockReq({}, {}, {});
    await expect(listNotifications(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 403 when EMPLOYEE requests another employee notifications', async () => {
    const req = mockReq({}, {}, { employeeId: 'emp-other' },
      { id: 'u1', role: 'EMPLOYEE', employeeId: 'emp-1' });
    await expect(listNotifications(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// markNotificationAsRead
// ------------------------------------------------------------------
describe('markNotificationAsRead', () => {
  const notification = { id: 'n-1', employeeId: 'emp-1', readStatus: false };

  it('marks the notification as read with readAt timestamp', async () => {
    mp.notification.findUnique.mockResolvedValue(notification);
    mp.notification.update.mockResolvedValue({ ...notification, readStatus: true, readAt: new Date() });

    const req = mockReq({}, { id: 'n-1' });
    const res = mockRes();
    await markNotificationAsRead(req, res);

    expect(mp.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ readStatus: true, readAt: expect.any(Date) }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 404 when notification not found', async () => {
    mp.notification.findUnique.mockResolvedValue(null);
    const req = mockReq({}, { id: 'bad-id' });
    await expect(markNotificationAsRead(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 403 when EMPLOYEE tries to mark another employee notification', async () => {
    mp.notification.findUnique.mockResolvedValue({ ...notification, employeeId: 'emp-other' });
    const req = mockReq({}, { id: 'n-1' }, {},
      { id: 'u1', role: 'EMPLOYEE', employeeId: 'emp-1' });
    await expect(markNotificationAsRead(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

// ------------------------------------------------------------------
// sendBulkNotification
// ------------------------------------------------------------------
describe('sendBulkNotification', () => {
  it('creates notifications for each employeeId', async () => {
    mp.notification.createMany.mockResolvedValue({ count: 2 });

    const req = mockReq({
      employeeIds: ['emp-1', 'emp-2'],
      type: 'PAYROLL',
      message: 'Payroll processed',
    });
    const res = mockRes();
    await sendBulkNotification(req, res);

    expect(mp.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([
        expect.objectContaining({ employeeId: 'emp-1' }),
        expect.objectContaining({ employeeId: 'emp-2' }),
      ])})
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws 400 when employeeIds is empty', async () => {
    const req = mockReq({ employeeIds: [], type: 'SYSTEM', message: 'test' });
    await expect(sendBulkNotification(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws 400 when employeeIds is not an array', async () => {
    const req = mockReq({ employeeIds: 'emp-1', type: 'SYSTEM', message: 'test' });
    await expect(sendBulkNotification(req, mockRes())).rejects.toBeInstanceOf(HttpError);
  });
});

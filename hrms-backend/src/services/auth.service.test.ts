import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    employee: { findFirst: vi.fn() },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(() => 'mock-token') },
}));

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { HttpError } from '../utils/http-error';

const svc = new AuthService();

beforeEach(() => vi.clearAllMocks());

describe('AuthService.login', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed',
    role: 'EMPLOYEE',
    roleId: 'role-1',
    userRole: { id: 'role-1', name: 'EMPLOYEE', permissions: [] },
    name: 'Test User',
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
  const mockEmployee = { id: 'emp-1', status: 'ACTIVE' };

  it('throws 400 for unknown email', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(svc.login('bad@test.com', 'pass')).rejects.toThrow(HttpError);
  });

  it('throws 403 for TERMINATED employee', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.employee.findFirst as any).mockResolvedValue({ ...mockEmployee, status: 'TERMINATED' });
    await expect(svc.login('test@example.com', 'pass')).rejects.toThrow(HttpError);
  });

  it('throws 400 for wrong password and increments failedLoginAttempts', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.employee.findFirst as any).mockResolvedValue(mockEmployee);
    (bcrypt.compare as any).mockResolvedValue(false);
    (prisma.user.update as any).mockResolvedValue({});
    await expect(svc.login('test@example.com', 'wrong')).rejects.toThrow(HttpError);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 1 }) })
    );
  });

  it('locks account after 5 failed attempts', async () => {
    const nearLockUser = { ...mockUser, failedLoginAttempts: 4 };
    (prisma.user.findUnique as any).mockResolvedValue(nearLockUser);
    (prisma.employee.findFirst as any).mockResolvedValue(mockEmployee);
    (bcrypt.compare as any).mockResolvedValue(false);
    (prisma.user.update as any).mockResolvedValue({});

    await expect(svc.login('test@example.com', 'wrong')).rejects.toThrow(HttpError);
    const updateCall = (prisma.user.update as any).mock.calls[0][0];
    expect(updateCall.data.failedLoginAttempts).toBe(5);
    expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);
  });

  it('throws 403 when account is locked', async () => {
    const lockedUser = {
      ...mockUser,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // locked for 15 more min
    };
    (prisma.user.findUnique as any).mockResolvedValue(lockedUser);
    const err = await svc.login('test@example.com', 'pass').catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).statusCode).toBe(403);
  });

  it('resets failedLoginAttempts and lockedUntil on successful login', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.employee.findFirst as any).mockResolvedValue(mockEmployee);
    (bcrypt.compare as any).mockResolvedValue(true);
    (prisma.user.update as any).mockResolvedValue({});

    await svc.login('test@example.com', 'correct');
    const resetCall = (prisma.user.update as any).mock.calls[0][0];
    expect(resetCall.data.failedLoginAttempts).toBe(0);
    expect(resetCall.data.lockedUntil).toBeNull();
  });

  it('returns tokens and user details on success', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.employee.findFirst as any).mockResolvedValue(mockEmployee);
    (bcrypt.compare as any).mockResolvedValue(true);
    (prisma.user.update as any).mockResolvedValue({});

    const result = await svc.login('test@example.com', 'correct');
    expect(result.accessToken).toBe('mock-token');
    expect(result.userDetails.email).toBe('test@example.com');
    expect(result.rawRefreshToken).toBeTruthy();
  });
});

describe('AuthService.logout', () => {
  it('clears refresh token in DB', async () => {
    (prisma.user.update as any).mockResolvedValue({});
    await svc.logout('user-1');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: null, refreshTokenExp: null },
    });
  });
});

describe('AuthService.changePassword', () => {
  it('throws 400 if token is invalid/expired', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    await expect(svc.changePassword({ token: 'bad', newPassword: 'NewPass1' })).rejects.toThrow(HttpError);
  });

  it('throws 400 if new password is same as old', async () => {
    const mockUser = { id: 'u1', password: 'hashed' };
    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);
    await expect(svc.changePassword({ token: 'valid', newPassword: 'SamePass1' })).rejects.toThrow(HttpError);
  });

  it('updates password when token is valid and new password differs', async () => {
    const mockUser = { id: 'u1', password: 'hashed' };
    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);
    (bcrypt.hash as any).mockResolvedValue('new-hashed');
    (prisma.user.update as any).mockResolvedValue({});

    await svc.changePassword({ token: 'valid-token', newPassword: 'NewPass1' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'new-hashed' }) })
    );
  });
});

describe('AuthService.refresh', () => {
  it('throws 401 when no user matches the hashed refresh token', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    await expect(svc.refresh('invalid-token')).rejects.toThrow(HttpError);
  });

  it('issues new access and refresh tokens on valid token', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'EMPLOYEE',
      roleId: null,
      userRole: null,
      name: 'Test',
    };
    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (prisma.user.update as any).mockResolvedValue({});

    const result = await svc.refresh('valid-raw-token');
    expect(result.newAccessToken).toBe('mock-token');
    expect(result.newRawRefreshToken).toBeTruthy();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('rotates refresh token — stores a new hash on each refresh', async () => {
    const mockUser = { id: 'user-1', email: 'a@b.com', role: 'EMPLOYEE', roleId: null, userRole: null, name: 'A' };
    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (prisma.user.update as any).mockResolvedValue({});

    const result1 = await svc.refresh('raw-token-a');
    vi.clearAllMocks();
    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (prisma.user.update as any).mockResolvedValue({});
    const result2 = await svc.refresh('raw-token-b');

    expect(result1.newRawRefreshToken).not.toBe(result2.newRawRefreshToken);
  });
});

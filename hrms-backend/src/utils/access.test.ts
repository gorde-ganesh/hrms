import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    employee: { findFirst: vi.fn() },
    conversation: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import {
  assertCanAccessEmployee,
  assertSelfOrPrivileged,
  assertSelfManagerOrPrivileged,
  canReadConversation,
  isPrivileged,
} from './access';
import { HttpError } from './http-error';

const mp = prisma as any;

const employee = { id: 'u1', role: 'EMPLOYEE', employeeId: 'e1' };
const manager = { id: 'u2', role: 'MANAGER', employeeId: 'e2' };
const hr = { id: 'u3', role: 'HR', employeeId: 'e3' };
const admin = { id: 'u4', role: 'ADMIN', employeeId: 'e4' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isPrivileged', () => {
  it('is true only for HR and ADMIN', () => {
    expect(isPrivileged(hr)).toBe(true);
    expect(isPrivileged(admin)).toBe(true);
    expect(isPrivileged(manager)).toBe(false);
    expect(isPrivileged(employee)).toBe(false);
    expect(isPrivileged(undefined)).toBe(false);
  });
});

describe('assertCanAccessEmployee', () => {
  it('allows HR and ADMIN for any employee without a DB lookup', async () => {
    await expect(assertCanAccessEmployee(hr, 'other')).resolves.toBeUndefined();
    await expect(assertCanAccessEmployee(admin, 'other')).resolves.toBeUndefined();
    expect(mp.employee.findFirst).not.toHaveBeenCalled();
  });

  it('allows an employee to access their own record', async () => {
    await expect(assertCanAccessEmployee(employee, 'e1')).resolves.toBeUndefined();
  });

  it("denies an employee another employee's record", async () => {
    await expect(assertCanAccessEmployee(employee, 'e9')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mp.employee.findFirst).not.toHaveBeenCalled();
  });

  it('allows a manager to access a direct report', async () => {
    mp.employee.findFirst.mockResolvedValue({ id: 'e9' });
    await expect(assertCanAccessEmployee(manager, 'e9')).resolves.toBeUndefined();
    expect(mp.employee.findFirst).toHaveBeenCalledWith({
      where: { id: 'e9', managerId: 'e2' },
      select: { id: true },
    });
  });

  it('denies a manager a non-report', async () => {
    mp.employee.findFirst.mockResolvedValue(null);
    await expect(assertCanAccessEmployee(manager, 'e9')).rejects.toBeInstanceOf(
      HttpError
    );
  });

  it('denies when the token has no employeeId', async () => {
    await expect(
      assertCanAccessEmployee({ id: 'u5', role: 'EMPLOYEE' }, 'e1')
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('assertSelfOrPrivileged', () => {
  it('allows self, HR and ADMIN; denies others', () => {
    expect(() => assertSelfOrPrivileged(employee, 'u1')).not.toThrow();
    expect(() => assertSelfOrPrivileged(hr, 'u1')).not.toThrow();
    expect(() => assertSelfOrPrivileged(admin, 'u1')).not.toThrow();
    expect(() => assertSelfOrPrivileged(employee, 'u9')).toThrow(HttpError);
    expect(() => assertSelfOrPrivileged(manager, 'u9')).toThrow(HttpError);
  });
});

describe('assertSelfManagerOrPrivileged', () => {
  it('allows the manager themself, HR and ADMIN; denies others', () => {
    expect(() => assertSelfManagerOrPrivileged(manager, 'e2')).not.toThrow();
    expect(() => assertSelfManagerOrPrivileged(hr, 'e2')).not.toThrow();
    expect(() => assertSelfManagerOrPrivileged(manager, 'e9')).toThrow(HttpError);
    expect(() => assertSelfManagerOrPrivileged(employee, 'e2')).toThrow(HttpError);
  });
});

describe('canReadConversation', () => {
  it('is false without a user and does not query', async () => {
    await expect(canReadConversation(undefined, 'c1')).resolves.toBe(false);
    expect(mp.conversation.findFirst).not.toHaveBeenCalled();
  });

  it('is true when the user is a member or the channel is public', async () => {
    mp.conversation.findFirst.mockResolvedValue({ id: 'c1' });
    await expect(canReadConversation(employee, 'c1')).resolves.toBe(true);
    expect(mp.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'c1',
        OR: [{ isPublic: true }, { members: { some: { userId: 'u1' } } }],
      },
      select: { id: true },
    });
  });

  it('is false for a non-member of a private conversation', async () => {
    mp.conversation.findFirst.mockResolvedValue(null);
    await expect(canReadConversation(employee, 'c1')).resolves.toBe(false);
  });
});

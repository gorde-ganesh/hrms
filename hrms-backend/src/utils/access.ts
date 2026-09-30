import { prisma } from '../lib/prisma';
import { HttpError } from './http-error';
import { ERROR_CODES } from './response-codes';

const PRIVILEGED_ROLES = ['HR', 'ADMIN'];

const forbidden = () =>
  new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);

export const isPrivileged = (user: any): boolean =>
  PRIVILEGED_ROLES.includes(user?.role);

/**
 * Allows HR/ADMIN, the employee themself, or (for MANAGER) a direct report.
 * Throws 403 otherwise.
 */
export const assertCanAccessEmployee = async (
  user: any,
  employeeId: string
): Promise<void> => {
  if (isPrivileged(user) || (user?.employeeId && user.employeeId === employeeId)) {
    return;
  }

  if (user?.role === 'MANAGER' && user.employeeId) {
    const report = await prisma.employee.findFirst({
      where: { id: employeeId, managerId: user.employeeId },
      select: { id: true },
    });
    if (report) return;
  }

  throw forbidden();
};

/** Allows HR/ADMIN or the user themself. Throws 403 otherwise. */
export const assertSelfOrPrivileged = (user: any, userId: string): void => {
  if (isPrivileged(user) || (user?.id && user.id === userId)) return;
  throw forbidden();
};

/** Allows HR/ADMIN or the manager themself. Throws 403 otherwise. */
export const assertSelfManagerOrPrivileged = (
  user: any,
  managerEmployeeId: string
): void => {
  if (
    isPrivileged(user) ||
    (user?.employeeId && user.employeeId === managerEmployeeId)
  ) {
    return;
  }
  throw forbidden();
};

/** True if the user is a member of the conversation, or it is a public channel. */
export const canReadConversation = async (
  user: any,
  conversationId: string
): Promise<boolean> => {
  if (!user?.id) return false;
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ isPublic: true }, { members: { some: { userId: user.id } } }],
    },
    select: { id: true },
  });
  return !!conversation;
};

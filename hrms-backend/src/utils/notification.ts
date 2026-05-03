import { NotificationType } from '../../generated/prisma';
import { getIo, getOnlineUsers } from '../lib/socket-state';
import { prisma } from '../lib/prisma';

export const sendNotification = async (options: {
  employeeIds?: string[];
  managerId?: string;
  type: NotificationType;
  message: string;
}) => {
  const { employeeIds = [], managerId, type, message } = options;
  const notificationsData: { employeeId: string; userId: string; type: NotificationType; message: string }[] = [];

  // Employee notifications
  if (employeeIds.length > 0) {
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, userId: true },
    });
    for (const emp of employees) {
      notificationsData.push({ employeeId: emp.id, userId: emp.userId, type, message });
    }
  }

  // Manager notification
  if (managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
      select: { id: true, userId: true },
    });
    if (manager) {
      notificationsData.push({ employeeId: manager.id, userId: manager.userId, type, message });
    }
  }

  // HR users — look up by role name via RBAC
  const hrUsers = await prisma.user.findMany({
    where: { userRole: { name: 'HR' } },
    include: { employee: { select: { id: true } } },
  });
  for (const hr of hrUsers) {
    if (hr.employee) {
      notificationsData.push({ employeeId: hr.employee.id, userId: hr.id, type, message });
    }
  }

  if (notificationsData.length > 0) {
    await prisma.notification.createMany({
      data: notificationsData.map(({ employeeId, type, message }) => ({ employeeId, type, message })),
      skipDuplicates: true,
    });

    // Emit to online users
    const io = getIo();
    const onlineUsers = getOnlineUsers();
    if (io) {
      notificationsData.forEach((n) => {
        const socketId = onlineUsers[n.userId];
        if (socketId) {
          io.to(socketId).emit('notification', { type: n.type, message: n.message });
        }
      });
    }
  }

  return notificationsData.length;
};

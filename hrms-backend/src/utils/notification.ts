import {
  Notification,
  NotificationType,
  PrismaClient,
  Role,
} from '../../generated/prisma';
import { io, onlineUsers } from '../../main';

const prisma = new PrismaClient();

export const sendNotification = async (options: {
  employeeIds?: string[];
  managerId?: string;
  type: NotificationType;
  message: string;
}) => {
  const { employeeIds = [], managerId, type, message } = options;
  const notificationsData: any[] = [];

  // Fetch employees with userIds
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, userId: true },
  });

  // Employee notifications
  for (const emp of employees) {
    notificationsData.push({
      employeeId: emp.id,
      userId: emp.userId,
      type,
      message,
    });
  }

  // Manager notification
  if (managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
      select: { id: true, userId: true },
    });
    if (manager) {
      notificationsData.push({
        employeeId: manager.id,
        userId: manager.userId,
        type,
        message,
      });
    }
  }

  // HR/Admin notifications
  const hrUsers = await prisma.user.findMany({
    where: { role: { in: [Role.HR] } },
  });

  for (const hr of hrUsers) {
    const hrEmployee = await prisma.employee.findUnique({
      where: { userId: hr.id },
    });

    if (hrEmployee) {
      notificationsData.push({
        employeeId: hrEmployee.id,
        userId: hr.id,
        type,
        message,
      });
    }
  }

  if (notificationsData.length > 0) {
    await prisma.notification.createMany({
      data: notificationsData,
      skipDuplicates: true,
    });

    // Emit to online users
    notificationsData.forEach((n) => {
      const socketId = onlineUsers[n.userId];
      if (socketId) {
        io.to(socketId).emit('notification', {
          type: n.type,
          message: n.message,
        });
      }
    });
  }

  return notificationsData.length;
};

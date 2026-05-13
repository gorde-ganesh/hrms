// controllers/notifications.ts

import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { prisma } from '../lib/prisma';


export const sendNotification = async (req: Request, res: Response) => {
  const { employeeId, type, message } = req.body;

  if (!employeeId || !type || !message) {
    throw new HttpError(
      400,
      'employeeId, type, and message are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const notification = await prisma.notification.create({
    data: { employeeId, type, message },
  });

  return res.status(200).json({
    message: 'Notification sent successfully',
    data: notification,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const listNotifications = async (req: Request, res: Response) => {
  const { employeeId, skip = '0', top = '20', unreadOnly } = req.query;
  const currentUser = req.user;

  if (!employeeId) {
    throw new HttpError(400, 'employeeId required', ERROR_CODES.VALIDATION_ERROR);
  }

  const employeeIdStr = Array.isArray(employeeId) ? employeeId[0] : (employeeId as string);

  if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== employeeIdStr) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const where: any = { employeeId: employeeIdStr };
  if (unreadOnly === 'true') where.readStatus = false;

  const [notifications, totalRecords] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(top),
    }),
    prisma.notification.count({ where }),
  ]);

  return res.status(200).json({
    message: 'Notifications fetched successfully',
    data: { content: notifications, totalRecords },
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new HttpError(404, 'Notification not found', ERROR_CODES.NOT_FOUND);

  if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== notification.employeeId) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readStatus: true, readAt: new Date() },
  });

  return res.status(200).json({
    message: 'Notification marked as read',
    data: updated,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  const { employeeId } = req.body;
  const currentUser = req.user;

  if (!employeeId) throw new HttpError(400, 'employeeId required', ERROR_CODES.VALIDATION_ERROR);
  if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== employeeId) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const { count } = await prisma.notification.updateMany({
    where: { employeeId, readStatus: false },
    data: { readStatus: true, readAt: new Date() },
  });

  return res.status(200).json({
    message: `${count} notification(s) marked as read`,
    data: { count },
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const sendBulkNotification = async (req: Request, res: Response) => {
  const { employeeIds, type, message } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new HttpError(
      400,
      'employeeIds array is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
  if (!type || !message) {
    throw new HttpError(
      400,
      'type and message are required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const notificationsData = employeeIds.map((id: string) => ({
    employeeId: id,
    type,
    message,
  }));

  await prisma.notification.createMany({
    data: notificationsData,
  });

  return res.status(200).json({
    message: 'Notifications sent successfully',
    data: { count: notificationsData.length },
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

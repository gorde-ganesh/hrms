// controllers/notifications.ts

import { PrismaClient } from '../../generated/prisma';
import { Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';

const prisma = new PrismaClient();

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
    data: { employeeId, userId: employeeId, type, message },
  });

  return res.status(200).json({
    message: 'Notification sent successfully',
    data: notification,
    statusCode: 200,
    code: SUCCESS_CODES.SUCCESS,
  });
};

export const listNotifications = async (req: Request, res: Response) => {
  const { employeeId } = req.query;
  const currentUser = req.user;

  if (!employeeId) {
    throw new HttpError(
      400,
      'employeeId required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Ensure employeeId is a string
  const employeeIdStr = Array.isArray(employeeId)
    ? employeeId[0]
    : (employeeId as string);

  console.log(employeeId, currentUser);

  // Employees can only view their own notifications
  if (
    currentUser.role === 'EMPLOYEE' &&
    currentUser.employeeId !== employeeIdStr
  ) {
    throw new HttpError(403, 'Access denied', ERROR_CODES.FORBIDDEN);
  }

  const notifications = await prisma.notification.findMany({
    where: { employeeId: employeeIdStr },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({
    message: 'Notifications fetched successfully',
    data: notifications,
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

  // Prepare notifications
  const notificationsData = employeeIds.map((id: string) => ({
    employeeId: id,
    userId: id, // assuming employeeId = userId, adjust if different
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

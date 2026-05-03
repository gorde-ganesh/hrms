import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  sendNotification,
  listNotifications,
  markNotificationAsRead,
  sendBulkNotification,
} from '../controllers/notification.controller';

const bulkNotificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bulk notification rate limit reached.' },
});

function registerRouters(app: express.Application) {
  app.post('/api/notifications', authenticate, sendNotification);
  app.get('/api/notifications', authenticate, listNotifications);
  app.patch('/api/notifications/:id/read', authenticate, markNotificationAsRead);
  app.post('/api/notifications/bulk', authenticate, roleAccess(['HR', 'ADMIN']), bulkNotificationLimiter, sendBulkNotification);
}

export default registerRouters;

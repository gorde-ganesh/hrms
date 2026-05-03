import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  sendNotification,
  listNotifications,
  markNotificationAsRead,
  sendBulkNotification,
} from '../controllers/notification.controller';

function registerRouters(app: express.Application) {
  app.post('/api/notifications', authenticate, sendNotification);
  app.get('/api/notifications', authenticate, listNotifications);
  app.patch('/api/notifications/:id/read', authenticate, markNotificationAsRead);
  app.post('/api/notifications/bulk', authenticate, roleAccess(['HR', 'ADMIN']), sendBulkNotification);
}

export default registerRouters;

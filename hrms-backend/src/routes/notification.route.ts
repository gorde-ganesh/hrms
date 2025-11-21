import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  sendNotification,
  listNotifications,
  sendBulkNotification,
} from '../controllers/notification.controller';

function registerRouters(app: express.Application) {
  app.post('/api/notifications', authenticate, sendNotification);
  app.get('/api/notifications', authenticate, listNotifications);
  app.post('/api/notifications/bulk', sendBulkNotification);
}

export default registerRouters;

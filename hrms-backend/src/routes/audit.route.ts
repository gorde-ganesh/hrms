import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { getAuditLogs } from '../controllers/audit.controller';

function registerRouters(app: express.Application) {
  app.get('/api/admin/audit-logs', authenticate, roleAccess(['ADMIN']), getAuditLogs);
}

export default registerRouters;

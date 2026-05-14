import express from 'express';
import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from '../controllers/roles.controller';
import { getPermissions } from '../controllers/permissions.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';

function registerRouters(app: express.Application) {
  // Role Routes
  app.get('/api/roles', authenticate, roleAccess(['ADMIN']), getRoles);
  app.get('/api/roles/:id', authenticate, roleAccess(['ADMIN']), getRoleById);
  app.post('/api/roles', authenticate, roleAccess(['ADMIN']), createRole);
  app.put('/api/roles/:id', authenticate, roleAccess(['ADMIN']), updateRole);
  app.delete('/api/roles/:id', authenticate, roleAccess(['ADMIN']), deleteRole);

  // Permission Routes
  app.get('/api/permissions', authenticate, roleAccess(['ADMIN']), getPermissions);
}

export default registerRouters;

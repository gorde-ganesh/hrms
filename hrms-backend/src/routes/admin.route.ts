import express from 'express';
import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from '../controllers/roles.controller';
import { getPermissions } from '../controllers/permissions.controller';
import { authenticate } from '../middlewares/auth.middleware';

function registerRouters(app: express.Application) {
  // Role Routes
  app.get('/api/roles', authenticate, getRoles);
  app.get('/api/roles/:id', authenticate, getRoleById);
  app.post('/api/roles', authenticate, createRole);
  app.put('/api/roles/:id', authenticate, updateRole);
  app.delete('/api/roles/:id', authenticate, deleteRole);

  // Permission Routes
  app.get('/api/permissions', authenticate, getPermissions);
}

export default registerRouters;

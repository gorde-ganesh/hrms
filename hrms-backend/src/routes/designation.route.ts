import express from 'express';
import {
  createDesignation,
  deleteDesignation,
  getAllDesignations,
  getDesignationById,
  updateDesignation,
} from '../controllers/designation.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma/client';

function registerRouters(app: express.Application) {
  app.post(
    '/api/designations',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    createDesignation
  );
  app.get(
    '/api/designations',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getAllDesignations
  );
  app.get(
    '/api/designations/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getDesignationById
  );
  app.put(
    '/api/designations/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    updateDesignation
  );
  app.delete(
    '/api/designations/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    deleteDesignation
  );
}

export default registerRouters;

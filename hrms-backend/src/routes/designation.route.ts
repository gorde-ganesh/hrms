import express from 'express';
import {
  createDesignation,
  deleteDesignation,
  getAllDesignations,
  getDesignationById,
  updateDesignation,
  restoreDesignation,
} from '../controllers/designation.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { CreateDesignationSchema, UpdateDesignationSchema } from '../schemas/designation.schema';


function registerRouters(app: express.Application) {
  app.post(
    '/api/designations',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(CreateDesignationSchema),
    createDesignation
  );
  app.get(
    '/api/designations',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getAllDesignations
  );
  app.get(
    '/api/designations/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getDesignationById
  );
  app.put(
    '/api/designations/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(UpdateDesignationSchema),
    updateDesignation
  );
  app.delete(
    '/api/designations/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    deleteDesignation
  );
  app.put(
    '/api/designations/:id/restore',
    authenticate,
    roleAccess(['ADMIN']),
    restoreDesignation
  );
}

export default registerRouters;

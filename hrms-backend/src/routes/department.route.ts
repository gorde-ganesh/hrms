import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
} from '../controllers/department.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { CreateDepartmentSchema, UpdateDepartmentSchema } from '../schemas/department.schema';


function registerRouters(app: express.Application) {
  app.post(
    '/api/departments',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(CreateDepartmentSchema),
    createDepartment
  );
  app.get(
    '/api/departments',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getAllDepartments
  );
  app.get(
    '/api/departments/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getDepartmentById
  );
  app.put(
    '/api/departments/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(UpdateDepartmentSchema),
    updateDepartment
  );
  app.delete(
    '/api/departments/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    deleteDepartment
  );
  app.put(
    '/api/departments/:id/restore',
    authenticate,
    roleAccess(['ADMIN']),
    restoreDepartment
  );
}

export default registerRouters;

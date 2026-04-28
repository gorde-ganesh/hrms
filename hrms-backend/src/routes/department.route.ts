import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { CreateDepartmentSchema, UpdateDepartmentSchema } from '../schemas/department.schema';
import { Role } from '../../generated/prisma/client';

function registerRouters(app: express.Application) {
  app.post(
    '/api/departments',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    validate(CreateDepartmentSchema),
    createDepartment
  );
  app.get(
    '/api/departments',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getAllDepartments
  );
  app.get(
    '/api/departments/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    getDepartmentById
  );
  app.put(
    '/api/departments/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    validate(UpdateDepartmentSchema),
    updateDepartment
  );
  app.delete(
    '/api/departments/:id',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
    deleteDepartment
  );
}

export default registerRouters;

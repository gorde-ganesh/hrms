import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma/client';

function registerRouters(app: express.Application) {
  app.post(
    '/api/departments',
    authenticate,
    roleAccess([Role.HR, Role.ADMIN]),
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

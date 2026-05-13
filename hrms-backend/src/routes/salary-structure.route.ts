import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  createSalaryStructure,
  getSalaryStructures,
  getSalaryStructureById,
  updateSalaryStructure,
  deleteSalaryStructure,
} from '../controllers/salary-structure.controller';
import { validate } from '../middlewares/validate';
import {
  CreateSalaryStructureSchema,
  UpdateSalaryStructureSchema,
} from '../schemas/salary-structure.schema';

function registerRouters(app: express.Application) {
  app.post(
    '/api/salary-structures',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(CreateSalaryStructureSchema),
    createSalaryStructure,
  );
  app.get(
    '/api/salary-structures',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getSalaryStructures,
  );
  app.get(
    '/api/salary-structures/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    getSalaryStructureById,
  );
  app.put(
    '/api/salary-structures/:id',
    authenticate,
    roleAccess(['HR', 'ADMIN']),
    validate(UpdateSalaryStructureSchema),
    updateSalaryStructure,
  );
  app.delete(
    '/api/salary-structures/:id',
    authenticate,
    roleAccess(['ADMIN']),
    deleteSalaryStructure,
  );
}

export default registerRouters;

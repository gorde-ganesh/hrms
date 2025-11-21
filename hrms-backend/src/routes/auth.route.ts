import express from 'express';
import {
  changePassword,
  loginUser,
  registerUser,
  forgotPassword,
} from '../controllers/auth.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { Role } from '../../generated/prisma';

function registerRouters(app: express.Application) {
  app.post('/api/auth/register', registerUser);
  app.post('/api/auth/login', loginUser);
  app.post('/api/auth/forgot-password', forgotPassword);
  app.post('/api/auth/change-password', changePassword);
}

export default registerRouters;

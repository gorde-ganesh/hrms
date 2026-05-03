import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  loginUser,
  registerUser,
  forgotPassword,
  getCurrentUser,
  logoutUser,
  refreshAccessToken,
} from '../controllers/auth.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { LoginSchema, ForgotPasswordSchema, ChangePasswordSchema } from '../schemas/auth.schema';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

function registerRouters(app: express.Application) {
  app.use('/api', globalLimiter);
  app.post('/api/auth/register', authenticate, roleAccess(['HR', 'ADMIN']), registerUser);
  app.post('/api/auth/login', authLimiter, validate(LoginSchema), loginUser);
  app.post('/api/auth/refresh', refreshAccessToken);
  app.post('/api/auth/logout', authenticate, logoutUser);
  app.get('/api/auth/me', authenticate, getCurrentUser);
  app.post('/api/auth/forgot-password', authLimiter, validate(ForgotPasswordSchema), forgotPassword);
  app.post('/api/auth/change-password', authenticate, validate(ChangePasswordSchema), changePassword);
}

export default registerRouters;

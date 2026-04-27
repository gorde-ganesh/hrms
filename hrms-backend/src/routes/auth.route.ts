import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  loginUser,
  registerUser,
  forgotPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

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
  app.post('/api/auth/register', authLimiter, registerUser);
  app.post('/api/auth/login', authLimiter, loginUser);
  app.post('/api/auth/forgot-password', authLimiter, forgotPassword);
  app.post('/api/auth/change-password', authenticate, changePassword);
}

export default registerRouters;

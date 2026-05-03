import express from 'express';
import rateLimit from 'express-rate-limit';
import { startCall, endCall } from '../controllers/call.controller';
import { authenticate } from '../middlewares/auth.middleware';

const callLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many call attempts, slow down.' },
});

function registerRouters(app: express.Application) {
  app.post('/api/calls/start', authenticate, callLimiter, startCall);
  app.post('/api/calls/end', authenticate, endCall);
}

export default registerRouters;

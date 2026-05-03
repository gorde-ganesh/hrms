import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  getActiveHuddles,
  endHuddle,
} from '../controllers/huddle.controller';
import { authenticate } from '../middlewares/auth.middleware';

const huddleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many huddle requests, slow down.' },
});

function registerRouters(app: express.Application) {
  app.post('/api/huddles/start', authenticate, huddleLimiter, startHuddle);
  app.post('/api/huddles/:huddleId/join', authenticate, joinHuddle);
  app.post('/api/huddles/:huddleId/leave', authenticate, leaveHuddle);
  app.post('/api/huddles/:huddleId/end', authenticate, endHuddle);
  app.get('/api/huddles/active', authenticate, getActiveHuddles);
}

export default registerRouters;

import express from 'express';
import {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  getActiveHuddles,
  endHuddle,
} from '../controllers/huddle.controller';
import { authenticate } from '../middlewares/auth.middleware';

function registerRouters(app: express.Application) {
  app.post('/api/huddles/start', authenticate, startHuddle);
  app.post('/api/huddles/:huddleId/join', authenticate, joinHuddle);
  app.post('/api/huddles/:huddleId/leave', authenticate, leaveHuddle);
  app.post('/api/huddles/:huddleId/end', authenticate, endHuddle);
  app.get('/api/huddles/active', authenticate, getActiveHuddles);
}

export default registerRouters;

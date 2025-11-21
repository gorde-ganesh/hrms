import express from 'express';
import {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  getActiveHuddles,
  endHuddle,
} from '../controllers/huddle.controller';

function registerRouters(app: express.Application) {
  app.post('/api/huddles/start', startHuddle);
  app.post('/api/huddles/:huddleId/join', joinHuddle);
  app.post('/api/huddles/:huddleId/leave', leaveHuddle);
  app.post('/api/huddles/:huddleId/end', endHuddle);
  app.get('/api/huddles/active', getActiveHuddles);
}

export default registerRouters;

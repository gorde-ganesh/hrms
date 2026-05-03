import express from 'express';
import { startCall, endCall } from '../controllers/call.controller';
import { authenticate } from '../middlewares/auth.middleware';

function registerRouters(app: express.Application) {
  app.post('/api/calls/start', authenticate, startCall);
  app.post('/api/calls/end', authenticate, endCall);
}

export default registerRouters;

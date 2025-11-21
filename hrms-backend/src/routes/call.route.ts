import express from 'express';
import { startCall, endCall } from '../controllers/call.controller';

function registerRouters(app: express.Application) {
  app.post('/api/calls/start', startCall);
  app.post('/api/calls/end', endCall);
}

export default registerRouters;

import express from 'express';
import { getMasterData } from '../controllers/global.controller';
import { authenticate } from '../middlewares/auth.middleware';

function registerRouters(app: express.Application) {
  app.get('/api/master-data', authenticate, getMasterData);
}

export default registerRouters;

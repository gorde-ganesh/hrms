import { Router } from 'express';
import { getDashboardSummary, getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

export default (app: Router) => {
  app.use('/api/dashboard', router);

  router.get('/summary', authenticate, getDashboardSummary);
  router.get('/stats', authenticate, getDashboardStats);
};

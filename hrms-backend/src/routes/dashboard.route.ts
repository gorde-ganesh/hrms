import { Router } from 'express';
import { getDashboardAlerts, getDashboardSummary, getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';

const router = Router();

export default (app: Router) => {
  app.use('/api/dashboard', router);

  router.get('/summary', authenticate, getDashboardSummary);
  router.get('/stats', authenticate, getDashboardStats);
  router.get('/alerts', authenticate, roleAccess(['ADMIN', 'HR']), getDashboardAlerts);
};

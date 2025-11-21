import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

export default (app: Router) => {
  app.use('/api/dashboard', router);

  router.get('/stats', authenticate, getDashboardStats);
};

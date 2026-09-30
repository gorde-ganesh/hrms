import express from 'express';
import { authenticate, roleAccess } from '../middlewares/auth.middleware';
import {
  getUserDetails,
  updateUserDetails,
  getAllUsers,
} from '../controllers/users.controller';

function registerRouters(app: express.Application) {
  app.get('/api/users', authenticate, roleAccess(['HR', 'ADMIN']), getAllUsers);
  app.get('/api/users/:id', authenticate, getUserDetails);
  app.put('/api/users/:id', authenticate, updateUserDetails);
}

export default registerRouters;

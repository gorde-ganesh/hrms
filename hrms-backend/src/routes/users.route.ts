import express from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getUserDetails,
  updateUserDetails,
  getAllUsers,
} from '../controllers/users.controller';

function registerRouters(app: express.Application) {
  app.get('/api/users', authenticate, getAllUsers);
  app.get('/api/users/:id', authenticate, getUserDetails);
  app.put('/api/users/:id', authenticate, updateUserDetails);
}

export default registerRouters;

import { Role } from '../../generated/prisma';
import { Request } from 'express';

export interface User {
  name: string;
  email: string;
  password: string;
  role: Role;
  token?: string;
  newPassword?: string;
  phone: string;
  address: string;
}

export interface AuthRequest<P = Record<string, any>> extends Request<P> {
  user?: {
    id: number;
    email: string;
    role?: string;
  };
}

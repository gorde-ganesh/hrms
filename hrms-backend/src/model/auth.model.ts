import { Request } from 'express';

export interface User {
  name: string;
  email: string;
  password: string;
  role: string;
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

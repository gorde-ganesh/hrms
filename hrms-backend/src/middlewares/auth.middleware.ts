import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma';
import { ApiResponse } from '../model/response.model';
import { ERROR_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const JWT_SECRET = process.env.JWT_KEY || 'your_secret_key';

export const authenticate = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return successResponse(
        res,
        null,
        'Authorization token missing',
        ERROR_CODES.UNAUTHORIZED,
        401
      );
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    return successResponse(
      res,
      null,
      'Invalid or expired token',
      ERROR_CODES.UNAUTHORIZED,
      401
    );
  }
};

export const roleAccess = (allowedRoles: string[]) => {
  return (req: Request<any>, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return successResponse(
        res,
        null,
        'Unauthorized: User not logged in',
        ERROR_CODES.UNAUTHORIZED,
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return successResponse(
        res,
        null,
        'Forbidden: Access denied',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    next();
  };
};

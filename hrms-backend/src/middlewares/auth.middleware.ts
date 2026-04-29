import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../model/response.model';
import { ERROR_CODES } from '../utils/response-codes';
import { errorResponse } from '../utils/response-helper';

const JWT_SECRET = process.env.JWT_KEY;
if (!JWT_SECRET) {
  throw new Error('JWT_KEY environment variable is required but not set');
}

export const authenticate = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
) => {
  try {
    const cookieToken = (req as any).cookies?.authToken;
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return errorResponse(
        res,
        'Authorization token missing',
        ERROR_CODES.UNAUTHORIZED,
        401
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    return errorResponse(
      res,
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
      return errorResponse(
        res,
        'Unauthorized: User not logged in',
        ERROR_CODES.UNAUTHORIZED,
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return errorResponse(
        res,
        'Forbidden: Access denied',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    next();
  };
};

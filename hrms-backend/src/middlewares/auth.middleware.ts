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

/**
 * Verify the authenticated user has permission for a given module action.
 * Falls back gracefully if the role isn't in the matrix (treats as no access).
 */
export const checkPermission = (module: string, action: string) => {
  return (req: Request<any>, res: Response, next: NextFunction) => {
    const { rolePermissions } = require('../utils/permission.utils');
    const user = req.user;

    if (!user) {
      return errorResponse(res, 'Unauthorized', ERROR_CODES.UNAUTHORIZED, 401);
    }

    const rolePerms: string[] = rolePermissions[user.role]?.[module] ?? [];
    if (!rolePerms.includes(action)) {
      return errorResponse(res, 'Forbidden: insufficient permissions', ERROR_CODES.FORBIDDEN, 403);
    }

    next();
  };
};

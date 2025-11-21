import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http-error';
import { Prisma } from '../../generated/prisma/client';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'SERVER_ERROR';
  let details = null;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details || null;
  }

  // 🧩 Prisma Error Handling
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    code = err.code;
    switch (err.code) {
      case 'P2002':
        message = 'Unique constraint failed on one or more fields';
        break;
      case 'P2025':
        message = 'Record not found';
        break;
      default:
        message = 'Database operation failed';
    }
  }

  // 🧩 Validation Error (e.g. Zod or Joi)
  else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    details = (err as any).issues || null;
    message = 'Validation failed for request data';
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: null,
    code,
    errors: details,
  });
};

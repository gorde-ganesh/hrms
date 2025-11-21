import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/send-response';

export const responseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.success = function (
    message: string,
    data?: any,
    status = 200,
    code = 'SUCCESS'
  ) {
    return sendResponse(this, status, message, data, code);
  };
  next();
};

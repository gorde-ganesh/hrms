import { Response } from 'express';
import { ApiResponse } from '../model/response.model';

/**
 * Send a successful response
 * @param res - Express Response object
 * @param data - Response data payload
 * @param message - Success message
 * @param code - Optional application-specific code
 * @param statusCode - HTTP status code (default: 200)
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string,
  code?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
    code,
  };
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param res - Express Response object
 * @param message - Error message
 * @param code - Optional application-specific error code
 * @param statusCode - HTTP status code (default: 500)
 * @param errors - Optional detailed error information
 */
export const errorResponse = (
  res: Response,
  message: string,
  code?: string,
  statusCode: number = 500,
  errors?: any
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    statusCode,
    message,
    data: null,
    code,
    errors,
  };
  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 * @param res - Express Response object
 * @param data - Created resource data
 * @param message - Success message
 * @param code - Optional application-specific code
 */
export const createdResponse = <T>(
  res: Response,
  data: T,
  message: string,
  code?: string
): Response => {
  return successResponse(res, data, message, code, 201);
};

/**
 * Send a no content response (204)
 * @param res - Express Response object
 * @param message - Success message
 * @param code - Optional application-specific code
 */
export const noContentResponse = (
  res: Response,
  message: string,
  code?: string
): Response => {
  return successResponse(res, null, message, code, 204);
};

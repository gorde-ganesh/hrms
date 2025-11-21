import { ERROR_CODES } from './response-codes';

export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    statusCode: number,
    message: string,
    code = 'HTTP_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain proper stack trace
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  static NotFound(message: string, code = ERROR_CODES.NOT_FOUND) {
    return new HttpError(404, message, code);
  }

  static BadRequest(
    message: string,
    code = ERROR_CODES.VALIDATION_ERROR,
    details?: any
  ) {
    return new HttpError(400, message, code, details);
  }

  static Unauthorized(
    message: string = 'Unauthorized',
    code = ERROR_CODES.UNAUTHORIZED
  ) {
    return new HttpError(401, message, code);
  }

  static Forbidden(
    message: string = 'Forbidden',
    code = ERROR_CODES.FORBIDDEN
  ) {
    return new HttpError(403, message, code);
  }
}

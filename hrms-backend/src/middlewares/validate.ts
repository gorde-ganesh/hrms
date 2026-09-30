import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod/v4';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const [firstField, firstMsgs] = Object.entries(fieldErrors)[0] ?? [];
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: firstField ? `Validation failed: ${firstField} — ${firstMsgs?.[0]}` : 'Validation failed',
        errors: fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };

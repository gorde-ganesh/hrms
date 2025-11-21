import 'express';
import { Response } from 'express';

declare module 'express-serve-static-core' {
  interface Response<ResBody = any, LocalsObj = Record<string, any>> {
    success: (
      message: string,
      data?: any,
      status?: number,
      code?: string
    ) => Response<ResBody, LocalsObj>;
  }
}

import { Response } from 'express';

export const sendResponse = <T>(
  res: Response,
  status: number,
  message: string,
  data?: T,
  code = 'SUCCESS'
) => {
  console.log(res, '>>>>');
  return res.status(status).json({ success: true, message, code, data });
};

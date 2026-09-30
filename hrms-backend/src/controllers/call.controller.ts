import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/response-helper';
import { SUCCESS_CODES, ERROR_CODES } from '../utils/response-codes';
import { prisma } from '../lib/prisma';


export const startCall = async (req: Request, res: Response) => {
  const { callerId, receiverId, callType } = req.body;
  if (callerId !== req.user?.id) {
    return errorResponse(res, 'Access denied', ERROR_CODES.FORBIDDEN, 403);
  }
  try {
    const call = await prisma.callLog.create({
      data: {
        callerId,
        receiverId,
        callType,
        status: 'ongoing',
      },
    });
    successResponse(
      res,
      call,
      'Call started successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (err: any) {
    errorResponse(res, err, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

export const endCall = async (req: Request, res: Response) => {
  const { callId } = req.body;
  try {
    const call = await prisma.callLog.findUnique({ where: { id: callId } });
    if (!call) {
      return errorResponse(res, 'Call not found', ERROR_CODES.NOT_FOUND, 404);
    }
    if (call.callerId !== req.user?.id && call.receiverId !== req.user?.id) {
      return errorResponse(res, 'Access denied', ERROR_CODES.FORBIDDEN, 403);
    }
    const updated = await prisma.callLog.update({
      where: { id: callId },
      data: { status: 'ended', endTime: new Date() },
    });
    successResponse(
      res,
      updated,
      'Call ended successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (err: any) {
    errorResponse(res, err, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

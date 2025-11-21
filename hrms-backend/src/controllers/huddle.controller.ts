import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { errorResponse, successResponse } from '../utils/response-helper';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';

const prisma = new PrismaClient();

// Start Huddle
export const startHuddle = async (req: Request, res: Response) => {
  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      return res
        .status(400)
        .json({ message: 'Conversation ID and User ID are required' });
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a member
    const member = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!member) {
      return res
        .status(403)
        .json({ message: 'You must be a member to start a huddle' });
    }

    // Update conversation to mark huddle as active
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isHuddle: true,
        huddleActive: true,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return successResponse(
      res,
      updatedConversation,
      'Huddle started successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error starting huddle:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Join Huddle
export const joinHuddle = async (req: Request, res: Response) => {
  try {
    const { huddleId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Check if huddle exists and is active
    const huddle = await prisma.conversation.findUnique({
      where: { id: huddleId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!huddle) {
      return errorResponse(res, 'Huddle not found', ERROR_CODES.NOT_FOUND, 404);
    }

    if (!huddle.huddleActive) {
      return errorResponse(
        res,
        'Huddle is not active',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Check if user is a member
    const member = await prisma.conversationMember.findFirst({
      where: {
        conversationId: huddleId,
        userId,
      },
    });

    if (!member) {
      return errorResponse(
        res,
        'You must be a member to join this huddle',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    return successResponse(
      res,
      huddle,
      'Joined huddle successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error joining huddle:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Leave Huddle
export const leaveHuddle = async (req: Request, res: Response) => {
  try {
    const { huddleId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    return successResponse(
      res,
      null,
      'Left huddle successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error leaving huddle:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Get Active Huddles
export const getActiveHuddles = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Get all active huddles where user is a member
    const huddles = await prisma.conversation.findMany({
      where: {
        huddleActive: true,
        members: {
          some: {
            userId: userId as string,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return successResponse(
      res,
      huddles,
      'Active huddles fetched successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error fetching active huddles:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// End Huddle
export const endHuddle = async (req: Request, res: Response) => {
  try {
    const { huddleId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Check if user is admin
    const member = await prisma.conversationMember.findFirst({
      where: {
        conversationId: huddleId,
        userId,
        role: 'admin',
      },
    });

    if (!member) {
      return errorResponse(
        res,
        'Only admins can end the huddle',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    // End the huddle
    await prisma.conversation.update({
      where: { id: huddleId },
      data: {
        huddleActive: false,
      },
    });

    return successResponse(
      res,
      null,
      'Huddle ended successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error ending huddle:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

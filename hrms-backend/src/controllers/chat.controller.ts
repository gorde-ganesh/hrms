import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  successResponse,
  createdResponse,
  errorResponse,
} from '../utils/response-helper';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });

export const getUserConversations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                // Add other safe fields you need
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // ✅ Add lastMessage field for UI convenience
    const conversationsWithLastMessage = conversations.map((conv) => ({
      ...conv,
      lastMessage: conv.messages[0]?.messageText || null,
      lastMessageTime: conv.messages[0]?.createdAt || null,
    }));

    return successResponse(
      res,
      conversationsWithLastMessage,
      'Conversations fetched successfully',
      SUCCESS_CODES.SUCCESS
    );
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return errorResponse(
      res,
      'Internal Server Error',
      ERROR_CODES.SERVER_ERROR,
      500
    );
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return errorResponse(
        res,
        'Conversation ID is required',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return successResponse(
      res,
      messages,
      'Messages fetched successfully',
      SUCCESS_CODES.SUCCESS
    );
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return errorResponse(
      res,
      'Internal Server Error',
      ERROR_CODES.SERVER_ERROR,
      500
    );
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, conversationId, messageText, messageType } = req.body;

    // ✅ Validate required fields
    if (!senderId || !conversationId || !messageText) {
      return errorResponse(
        res,
        'Missing required fields: senderId, conversationId, messageText',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // ✅ Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return errorResponse(
        res,
        'Conversation not found',
        ERROR_CODES.NOT_FOUND,
        404
      );
    }

    await prisma.message.create({
      data: {
        messageText,
        messageType: messageType || 'text',
        conversation: {
          connect: { id: conversationId },
        },
        sender: {
          connect: { id: senderId },
        },
      },
    });

    // Fetch all messages for the conversation
    const allMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return createdResponse(
      res,
      allMessages,
      'Message sent successfully',
      SUCCESS_CODES.SUCCESS
    );
  } catch (error: any) {
    console.error('Error sending message:', error);
    return errorResponse(
      res,
      'Internal Server Error',
      ERROR_CODES.SERVER_ERROR,
      500
    );
  }
};

export const startConversation = async (req: Request, res: Response) => {
  try {
    const { currentUserId, otherUserId } = req.body;

    if (!currentUserId || !otherUserId) {
      return errorResponse(
        res,
        'Missing required parameters.',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Prevent self-conversation
    if (currentUserId === otherUserId) {
      return errorResponse(
        res,
        'Cannot create conversation with yourself.',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // ✅ Validate both users exist
    const [currentUser, otherUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUserId } }),
      prisma.user.findUnique({ where: { id: otherUserId } }),
    ]);

    if (!currentUser) {
      return errorResponse(
        res,
        'Current user not found.',
        ERROR_CODES.USER_NOT_FOUND,
        404
      );
    }
    if (!otherUser) {
      return errorResponse(
        res,
        'Other user not found.',
        ERROR_CODES.USER_NOT_FOUND,
        404
      );
    }

    // ✅ Check if a private conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (existingConversation) {
      return successResponse(
        res,
        {
          ...existingConversation,
          lastMessage: existingConversation.messages[0]?.messageText || null,
        },
        'Existing conversation found',
        SUCCESS_CODES.SUCCESS
      );
    }

    // ✅ Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [{ userId: currentUserId }, { userId: otherUserId }],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return createdResponse(
      res,
      {
        ...newConversation,
        lastMessage: null,
        messages: [],
      },
      'New conversation created successfully',
      SUCCESS_CODES.SUCCESS
    );
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return errorResponse(
      res,
      'Internal Server Error',
      ERROR_CODES.SERVER_ERROR,
      500
    );
  }
};

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return successResponse(
      res,
      users,
      'Users fetched successfully',
      SUCCESS_CODES.SUCCESS
    );
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return errorResponse(
      res,
      'Internal Server Error',
      ERROR_CODES.SERVER_ERROR,
      500
    );
  }
};

// Create Group Chat
export const createGroupChat = async (req: Request, res: Response) => {
  try {
    const { memberIds, groupName, createdById } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res
        .status(400)
        .json({ message: 'At least 2 members required for a group' });
    }

    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await prisma.conversation.create({
      data: {
        isGroup: true,
        name: groupName,
        channelType: 'GROUP',
        createdById,
        members: {
          create: memberIds.map((userId: string) => ({
            userId,
            role: userId === createdById ? 'admin' : 'member',
          })),
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

    res.status(201).json(group);
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Create Channel
export const createChannel = async (req: Request, res: Response) => {
  try {
    const { name, description, isPublic, createdById } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    const channel = await prisma.conversation.create({
      data: {
        isGroup: true,
        name,
        description,
        channelType: isPublic ? 'PUBLIC_CHANNEL' : 'PRIVATE_CHANNEL',
        createdById,
        members: {
          create: [
            {
              userId: createdById,
              role: 'admin',
            },
          ],
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

    res.status(201).json(channel);
  } catch (error: any) {
    console.error('Error creating channel:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get Public Channels
export const getPublicChannels = async (_req: Request, res: Response) => {
  try {
    const channels = await prisma.conversation.findMany({
      where: {
        channelType: 'PUBLIC_CHANNEL',
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { members: true, messages: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(
      res,
      channels,
      'Channels fetched successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error fetching public channels:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Join Channel
export const joinChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Check if channel exists and is public
    const channel = await prisma.conversation.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return errorResponse(
        res,
        'Channel not found',
        ERROR_CODES.NOT_FOUND,
        404
      );
    }

    if (channel.channelType !== 'PUBLIC_CHANNEL') {
      return errorResponse(
        res,
        'Cannot join private channel without invitation',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    // Check if already a member
    const existingMember = await prisma.conversationMember.findFirst({
      where: {
        conversationId: channelId,
        userId,
      },
    });

    if (existingMember) {
      return errorResponse(
        res,
        'Already a member',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Add member
    await prisma.conversationMember.create({
      data: {
        conversationId: channelId,
        userId,
        role: 'member',
      },
    });

    return successResponse(
      res,
      null,
      'Successfully joined channel',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error joining channel:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Leave Channel
export const leaveChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    const member = await prisma.conversationMember.findFirst({
      where: {
        conversationId: channelId,
        userId,
      },
    });

    if (!member) {
      return errorResponse(
        res,
        'Not a member of this channel',
        ERROR_CODES.NOT_FOUND,
        404
      );
    }

    await prisma.conversationMember.delete({
      where: { id: member.id },
    });

    return successResponse(
      res,
      null,
      'Successfully left channel',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error leaving channel:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Add Member to Group/Channel
export const addMember = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId, addedBy } = req.body;

    if (!userId) {
      return errorResponse(
        res,
        'User ID is required',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    // Check if requester is admin
    const requesterMember = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId: addedBy,
        role: 'admin',
      },
    });

    if (!requesterMember) {
      return errorResponse(
        res,
        'Only admins can add members',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (existingMember) {
      return errorResponse(
        res,
        'User is already a member',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    await prisma.conversationMember.create({
      data: {
        conversationId,
        userId,
        role: 'member',
      },
    });

    return successResponse(
      res,
      null,
      'Member added successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error adding member:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Remove Member from Group/Channel
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { conversationId, userId } = req.params;
    const { removedBy } = req.body;

    // Check if requester is admin
    const requesterMember = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId: removedBy,
        role: 'admin',
      },
    });

    if (!requesterMember) {
      return errorResponse(
        res,
        'Only admins can remove members',
        ERROR_CODES.FORBIDDEN,
        403
      );
    }

    const member = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!member) {
      return errorResponse(res, 'Member not found', ERROR_CODES.NOT_FOUND, 404);
    }

    await prisma.conversationMember.delete({
      where: { id: member.id },
    });

    return successResponse(
      res,
      null,
      'Member removed successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error removing member:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

// Upload File
export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return errorResponse(
        res,
        'No file uploaded',
        ERROR_CODES.BAD_REQUEST,
        400
      );
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return successResponse(
      res,
      { fileUrl, fileName: req.file.originalname },
      'File uploaded successfully',
      SUCCESS_CODES.SUCCESS,
      200
    );
  } catch (error: any) {
    console.error('Error uploading file:', error);
    errorResponse(res, error, ERROR_CODES.INTERNAL_SERVER_ERROR, 500);
  }
};

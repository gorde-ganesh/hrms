import express from 'express';
import {
  getUserConversations,
  getMessages,
  sendMessage,
  startConversation,
  getAllUsers,
  createGroupChat,
  createChannel,
  getPublicChannels,
  joinChannel,
  leaveChannel,
  addMember,
  removeMember,
  uploadFile,
  upload,
} from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';

function registerRouters(app: express.Application) {
  // Existing routes
  app.get('/api/chats/users', authenticate, getAllUsers);
  app.get('/api/chats/:userId/conversations', authenticate, getUserConversations);
  app.get('/api/chats/messages/:conversationId', authenticate, getMessages);
  app.post('/api/chats/messages', authenticate, sendMessage);
  app.post('/api/chats/start', authenticate, startConversation);

  // Group chat routes
  app.post('/api/chats/groups', authenticate, createGroupChat);

  // Channel routes
  app.post('/api/chats/channels', authenticate, createChannel);
  app.get('/api/chats/channels/public', authenticate, getPublicChannels);
  app.post('/api/chats/channels/:channelId/join', authenticate, joinChannel);
  app.post('/api/chats/channels/:channelId/leave', authenticate, leaveChannel);

  // Member management
  app.post('/api/chats/:conversationId/members', authenticate, addMember);
  app.delete('/api/chats/:conversationId/members/:userId', authenticate, removeMember);

  // File upload
  app.post('/api/chats/upload', authenticate, upload.single('file'), uploadFile);
}

export default registerRouters;

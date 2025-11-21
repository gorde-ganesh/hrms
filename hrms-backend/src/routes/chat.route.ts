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

function registerRouters(app: express.Application) {
  // Existing routes
  app.get('/api/chats/users', getAllUsers);
  app.get('/api/chats/:userId/conversations', getUserConversations);
  app.get('/api/chats/messages/:conversationId', getMessages);
  app.post('/api/chats/messages', sendMessage);
  app.post('/api/chats/start', startConversation);

  // Group chat routes
  app.post('/api/chats/groups', createGroupChat);

  // Channel routes
  app.post('/api/chats/channels', createChannel);
  app.get('/api/chats/channels/public', getPublicChannels);
  app.post('/api/chats/channels/:channelId/join', joinChannel);
  app.post('/api/chats/channels/:channelId/leave', leaveChannel);

  // Member management
  app.post('/api/chats/:conversationId/members', addMember);
  app.delete('/api/chats/:conversationId/members/:userId', removeMember);

  // File upload
  app.post('/api/chats/upload', upload.single('file'), uploadFile);
}

export default registerRouters;

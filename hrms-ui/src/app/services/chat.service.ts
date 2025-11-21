import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environment/environment';
import { ApiService } from './api-interface.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private socket: Socket;
  private socketUrl = environment.apiUrl;

  messages$ = new BehaviorSubject<any[]>([]);
  onlineUsers$ = new BehaviorSubject<string[]>([]);
  typingUsers$ = new BehaviorSubject<
    { conversationId: string; userId: string; userName: string }[]
  >([]);

  constructor(private serverApiService: ApiService) {
    this.socket = io(this.socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // allow fallback
      reconnection: true,
      // auth: { token: '...' } // optional
    });
  }

  // ==================== User Management ====================

  registerUser(userId: string) {
    this.socket.emit('register', userId);
  }

  async getAllUsers() {
    return await this.serverApiService.get<any[]>(`/api/chats/users`);
  }

  // ==================== 1-1 Conversations ====================

  async startConversation(currentUserId: string, otherUserId: string) {
    return await this.serverApiService.post(`/api/chats/start`, {
      currentUserId,
      otherUserId,
    });
  }

  async getUserConversations(userId: string) {
    return await this.serverApiService.get<any[]>(
      `/api/chats/${userId}/conversations`
    );
  }

  // ==================== Group Chat ====================

  async createGroupChat(
    memberIds: string[],
    groupName: string,
    createdById: string
  ) {
    return await this.serverApiService.post(`/api/chats/groups`, {
      memberIds,
      groupName,
      createdById,
    });
  }

  async addMemberToGroup(
    conversationId: string,
    userId: string,
    addedBy: string
  ) {
    return await this.serverApiService.post(
      `/api/chats/${conversationId}/members`,
      {
        userId,
        addedBy,
      }
    );
  }

  async removeMemberFromGroup(
    conversationId: string,
    userId: string,
    removedBy: string
  ) {
    return await this.serverApiService.delete(
      `/api/chats/${conversationId}/members/${userId}?removedBy=${removedBy}`
    );
  }

  // ==================== Channels ====================

  async createChannel(
    name: string,
    description: string,
    isPublic: boolean,
    createdById: string
  ) {
    return await this.serverApiService.post(`/api/chats/channels`, {
      name,
      description,
      isPublic,
      createdById,
    });
  }

  async getPublicChannels() {
    return await this.serverApiService.get<any[]>(`/api/chats/channels/public`);
  }

  async joinChannel(channelId: string, userId: string) {
    return await this.serverApiService.post(
      `/api/chats/channels/${channelId}/join`,
      {
        userId,
      }
    );
  }

  async leaveChannel(channelId: string, userId: string) {
    return await this.serverApiService.post(
      `/api/chats/channels/${channelId}/leave`,
      {
        userId,
      }
    );
  }

  // ==================== Messages ====================

  async sendMessage(data: any) {
    this.socket.emit('sendMessage', data);
    const message = await this.serverApiService.post(
      `/api/chats/messages`,
      data
    );

    console.log(message);

    return message;
  }

  async getMessages(conversationId: string) {
    return await this.serverApiService.get<any[]>(
      `/api/chats/messages/${conversationId}`
    );
  }

  listenForMessages() {
    this.socket.on('receiveMessage', (data) => {
      const current = this.messages$.getValue();
      this.messages$.next([...current, data]);
    });
  }

  // ==================== File Upload ====================

  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return await this.serverApiService.post(`/api/chats/upload`, formData);
  }

  // ==================== Real-time Features ====================

  // Typing indicators
  emitTyping(conversationId: string, userId: string, userName: string) {
    this.socket.emit('typing', { conversationId, userId, userName });
  }

  emitStopTyping(conversationId: string, userId: string) {
    this.socket.emit('stop-typing', { conversationId, userId });
  }

  listenForTyping() {
    this.socket.on(
      'user-typing',
      (data: { conversationId: string; userId: string; userName: string }) => {
        const current = this.typingUsers$.getValue();
        const exists = current.find(
          (u) =>
            u.conversationId === data.conversationId && u.userId === data.userId
        );
        if (!exists) {
          this.typingUsers$.next([...current, data]);
        }
      }
    );

    this.socket.on(
      'user-stop-typing',
      (data: { conversationId: string; userId: string }) => {
        const current = this.typingUsers$.getValue();
        this.typingUsers$.next(
          current.filter(
            (u) =>
              !(
                u.conversationId === data.conversationId &&
                u.userId === data.userId
              )
          )
        );
      }
    );
  }

  // Online status
  listenForOnlineStatus() {
    this.socket.on('user-online', (userId: string) => {
      const current = this.onlineUsers$.getValue();
      if (!current.includes(userId)) {
        this.onlineUsers$.next([...current, userId]);
      }
    });

    this.socket.on('user-offline', (userId: string) => {
      const current = this.onlineUsers$.getValue();
      this.onlineUsers$.next(current.filter((id) => id !== userId));
    });
  }

  // Read receipts
  markAsRead(messageId: string) {
    this.socket.emit('message-read', { messageId });
  }

  // ==================== Cleanup ====================

  disconnect() {
    this.socket.disconnect();
  }
}

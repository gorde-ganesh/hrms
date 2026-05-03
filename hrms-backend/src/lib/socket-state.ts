import { Server as SocketIOServer } from 'socket.io';

// Shared Socket.IO state — populated by main.ts at startup.
// Importing this module never triggers server boot.
let _io: SocketIOServer | null = null;
let _onlineUsers: Record<string, string> = {};

export function setSocketState(io: SocketIOServer, onlineUsers: Record<string, string>): void {
  _io = io;
  _onlineUsers = onlineUsers;
}

export function getIo(): SocketIOServer | null {
  return _io;
}

export function getOnlineUsers(): Record<string, string> {
  return _onlineUsers;
}

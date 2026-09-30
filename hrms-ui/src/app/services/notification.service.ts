import { ApplicationRef, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api-interface.service';
import { environment } from '../../environment/environment';
import { MessageService } from 'primeng/api';

export interface Notification {
  id?: string;
  employeeId: string;
  type: string;
  message: string;
  createdAt?: string;
  readStatus?: boolean;
  readAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private socket?: Socket;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private serverApi: ApiService,
    private messageService: MessageService,
    private appRef: ApplicationRef
  ) {}

  connect(userId: string) {
    // Several components call connect(); reuse the live socket instead of opening one per call.
    if (this.socket) return;

    const socket = io(environment.apiUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true, // send the authToken cookie on the handshake
    });
    this.socket = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('register', userId); // Register user on server
    });

    socket.on('notification', (notification: any) => {
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...current]);
      const joinHuddle = notification.action === 'join-huddle';
      this.messageService.add({
        severity: 'info',
        summary: notification.title,
        detail: notification.message,
        // Huddle invites stay until acted on; clicking one opens the chat and joins
        sticky: joinHuddle,
        data: joinHuddle ? { action: 'join-huddle', conversationId: notification.conversationId } : undefined,
      });
      // Socket events arrive outside Angular's change detection (zoneless), so draw the toast now
      setTimeout(() => this.appRef.tick());
    });
  }

  async fetchNotifications(employeeId: string) {
    const res: any = await this.serverApi.get(
      `/api/notifications?employeeId=${employeeId}&top=50`
    );
    this.notificationsSubject.next(res?.content ?? []);
  }

  async markAllAsRead(employeeId: string) {
    await this.serverApi.patch('/api/notifications/read-all', { employeeId });
    const updated = this.notificationsSubject.value.map((n) => ({
      ...n,
      readStatus: true,
      readAt: new Date().toISOString(),
    }));
    this.notificationsSubject.next(updated);
  }

  markAsRead(notificationId: string) {
    this.serverApi
      .patch(`/api/notifications/${notificationId}/read`, {})
      .then(() => {
        const updated = this.notificationsSubject.value.map((n) =>
          n.id === notificationId ? { ...n, readStatus: true, readAt: new Date().toISOString() } : n
        );
        this.notificationsSubject.next(updated);
      })
      .catch(() => {
        // Silently ignore — optimistic update already applied in UI
      });
  }

  sendNotification(notification: Notification) {
    this.socket?.emit('sendNotification', notification);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}

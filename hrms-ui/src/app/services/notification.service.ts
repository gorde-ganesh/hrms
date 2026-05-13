import { Injectable } from '@angular/core';
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
  private socket!: Socket;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private serverApi: ApiService,
    private messageService: MessageService
  ) {}

  connect(userId: string) {
    this.socket = io(environment.apiUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.socket.emit('register', userId); // Register user on server
    });

    this.socket.on('notification', (notification: any) => {
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...current]);
      this.messageService.add({
        severity: 'info',
        summary: notification.title,
        detail: notification.message,
      });
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
    this.socket.emit('sendNotification', notification);
  }
}

import { Component } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { OverlayBadgeModule } from 'primeng/overlaybadge';

@Component({
  selector: 'app-notifictaion',
  imports: [CommonModule, ButtonModule, DrawerModule, OverlayBadgeModule],
  templateUrl: './notifictaion.html',
  styleUrl: './notifictaion.css',
})
export class Notifictaion {
  notifications: any[] = [];
  unreadCount = 0;
  visible: boolean = false;
  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    this.notificationService.connect(userInfo.employeeId);
    this.notificationService.fetchNotifications(userInfo.employeeId);

    this.notificationService.notifications$.subscribe((data) => {
      this.notifications = data;
      this.unreadCount = this.notifications.filter((n) => !n.read).length;
    });
  }

  markRead(notification: any) {
    if (!notification.read && notification.id) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      INFO: 'pi pi-info-circle',
      SUCCESS: 'pi pi-check-circle',
      WARNING: 'pi pi-exclamation-triangle',
      ERROR: 'pi pi-times-circle',
      LEAVE: 'pi pi-calendar',
      ATTENDANCE: 'pi pi-clock',
      PAYROLL: 'pi pi-money-bill',
      SYSTEM: 'pi pi-cog',
    };
    return iconMap[type?.toUpperCase()] || 'pi pi-bell';
  }

  getNotificationIconClass(type: string): string {
    const classMap: Record<string, string> = {
      INFO: 'info',
      SUCCESS: 'success',
      WARNING: 'warning',
      ERROR: 'error',
      LEAVE: 'info',
      ATTENDANCE: 'info',
      PAYROLL: 'success',
      SYSTEM: 'info',
    };
    return classMap[type?.toUpperCase()] || 'info';
  }
}

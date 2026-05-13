import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../services/notification.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { ApiService } from '../../../services/api-interface.service';

@Component({
  selector: 'app-notification-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectButtonModule, TagModule],
  templateUrl: './notification-page.html',
  styleUrl: './notification.css',
})
export class NotificationPage implements OnInit, OnDestroy {
  notifications: any[] = [];
  totalRecords = 0;
  skip = 0;
  top = 20;
  unreadOnly = false;
  loading = false;

  filterOptions = [
    { label: 'All', value: false },
    { label: 'Unread', value: true },
  ];

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.readStatus).length;
  }

  private destroy$ = new Subject<void>();
  private employeeId = '';

  constructor(
    private notificationService: NotificationService,
    private authState: AuthStateService,
    private serverApi: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.employeeId = String(this.authState.userInfo?.employeeId ?? '');
    this.notificationService.connect(this.employeeId);
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (this.skip === 0) {
          this.notifications = data;
          this.cdr.detectChanges();
        }
      });
    this.loadPage();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadPage(reset = false) {
    if (reset) this.skip = 0;
    this.loading = true;
    try {
      const params: any = {
        employeeId: this.employeeId,
        skip: this.skip,
        top: this.top,
      };
      if (this.unreadOnly) params.unreadOnly = true;
      const res: any = await this.serverApi.get('/api/notifications', params);
      this.notifications = res?.content ?? [];
      this.totalRecords = res?.totalRecords ?? 0;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async markRead(n: any) {
    if (n.readStatus) return;
    this.notificationService.markAsRead(n.id);
    n.readStatus = true;
  }

  async markAllRead() {
    await this.notificationService.markAllAsRead(this.employeeId);
    this.notifications = this.notifications.map((n) => ({ ...n, readStatus: true }));
    this.cdr.detectChanges();
  }

  onFilterChange() {
    this.loadPage(true);
  }

  prevPage() {
    if (this.skip === 0) return;
    this.skip = Math.max(0, this.skip - this.top);
    this.loadPage();
  }

  nextPage() {
    if (this.skip + this.top >= this.totalRecords) return;
    this.skip += this.top;
    this.loadPage();
  }

  get currentPage(): number {
    return Math.floor(this.skip / this.top) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.top) || 1;
  }

  getNotificationIcon(type: string): string {
    const map: Record<string, string> = {
      INFO: 'pi pi-info-circle',
      SUCCESS: 'pi pi-check-circle',
      WARNING: 'pi pi-exclamation-triangle',
      ERROR: 'pi pi-times-circle',
      LEAVE: 'pi pi-calendar',
      ATTENDANCE: 'pi pi-clock',
      PAYROLL: 'pi pi-money-bill',
      SYSTEM: 'pi pi-cog',
    };
    return map[type?.toUpperCase()] ?? 'pi pi-bell';
  }

  getNotificationIconClass(type: string): string {
    const map: Record<string, string> = {
      SUCCESS: 'success',
      WARNING: 'warning',
      ERROR: 'error',
    };
    return map[type?.toUpperCase()] ?? 'info';
  }
}

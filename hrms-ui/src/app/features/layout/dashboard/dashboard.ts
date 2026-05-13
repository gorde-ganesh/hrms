import { CommonModule, formatDate } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import dayjs from 'dayjs';

interface DashboardSummary {
  // HR / normalized ADMIN
  totalEmployees?: number;
  totalDepartments?: number;
  pendingLeaves?: number;
  todayAttendance?: number;
  pendingPayrolls?: number;
  // ADMIN raw
  headcount?: { total: number; active: number; inactive: number };
  payrollSummary?: { draft?: number; finalized?: number; paid?: number };
  recentJoiners?: Array<{
    user: { name: string; email: string };
    designation?: { name: string } | null;
    joiningDate?: string;
  }>;
  // MANAGER
  teamSize?: number;
  teamLeaves?: number;
  teamAttendance?: number;
  // EMPLOYEE
  leaveBalance?: { totalLeaves: number; usedLeaves: number } | null;
  attendanceSummary?: number;
}

interface DashboardAlert {
  type: string;
  message: string;
  count: number;
}


@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule,
    CommonModule,
    CardModule,
    AvatarModule,
    ButtonModule,
    DividerModule,
    ChartModule,
    ProgressBarModule,
    TagModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  currentDate = new Date();
  checkInTime = '9:05 AM';
  workingHours = '7h 25m';

  upcomingLeaves: any = [];

  pendingTasks: any = [
    {
      title: 'Complete Q4 Performance Review',
      due: 'Dec 5',
      priority: 'High',
      severity: 'danger',
    },
    {
      title: 'Submit Expense Report',
      due: 'Dec 3',
      priority: 'Medium',
      severity: 'warning',
    },
    {
      title: 'Update Project Documentation',
      due: 'Dec 10',
      priority: 'Low',
      severity: 'info',
    },
  ];

  performanceGoals = [
    { title: 'Complete Training Modules', progress: 80, progressLabel: '8/10' },
    { title: 'Project Deliverables', progress: 85, progressLabel: '5/6' },
    { title: 'Team Collaboration', progress: 95, progressLabel: '95%' },
  ];

  quickActions = [
    { label: 'Request Leave', icon: 'pi pi-calendar', color: 'text-blue-600' },
    { label: 'View Payslips', icon: 'pi pi-dollar', color: 'text-green-600' },
    {
      label: 'Performance',
      icon: 'pi pi-chart-line',
      color: 'text-purple-600',
    },
    { label: 'Timesheet', icon: 'pi pi-clock', color: 'text-orange-600' },
  ];

  attendanceData = {};

  chartOptions = {};
  userInfo: any;

  dashboardStats: DashboardSummary = {};
  alerts: DashboardAlert[] = [];

  constructor(private serverApi: ApiService, private cdr: ChangeDetectorRef, private authState: AuthStateService, private router: Router) {}

  ngOnInit(): void {
    this.userInfo = this.authState.userInfo;
    if (this.userInfo?.role) {
      this.userInfo.role = this.userInfo.role.toUpperCase();
    }

    this.loadQuickActions();
    this.loadDashboardStats();

    if (['EMPLOYEE', 'MANAGER', 'HR'].includes(this.userInfo?.role) && this.userInfo?.employeeId) {
      this.initChartOptions();
    }

    if (['ADMIN', 'HR', 'MANAGER'].includes(this.userInfo?.role)) {
      this.loadUpcomingLeaves();
    }

    if (['ADMIN', 'HR'].includes(this.userInfo?.role)) {
      this.loadAlerts();
    }
  }


  get leaveBalanceDaysRemaining(): number {
    if (!this.dashboardStats.leaveBalance) return 0;
    return this.dashboardStats.leaveBalance.totalLeaves - this.dashboardStats.leaveBalance.usedLeaves;
  }
  async loadDashboardStats() {
    try {
      const res = await this.serverApi.get<DashboardSummary>('/api/dashboard/summary');
      // Normalize ADMIN headcount so templates use the same field name across roles
      if (res.headcount) {
        res.totalEmployees = res.headcount.total;
      }
      this.dashboardStats = res;
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    }
    this.cdr.detectChanges();
  }

  async loadAlerts() {
    try {
      const res: any = await this.serverApi.get('/api/dashboard/alerts', undefined, false);
      this.alerts = res?.alerts ?? [];
    } catch {
      this.alerts = [];
    }
    this.cdr.detectChanges();
  }

  alertSeverity(type: string): string {
    return ({ LEAVE: 'warn', CONTRACT: 'danger', PAYROLL: 'info' } as any)[type] ?? 'secondary';
  }

  alertIcon(type: string): string {
    return ({ LEAVE: 'pi pi-calendar-times', CONTRACT: 'pi pi-file', PAYROLL: 'pi pi-dollar' } as any)[type] ?? 'pi pi-bell';
  }

  async clockInOut() {
    const clockInOut = await this.serverApi.post(`/api/attendance`, {
      employeeId: this.userInfo.employeeId,
    });
    this.loadAttendenceSummary();
  }

  todayCheckInTime = '';
  todayWorkHours = '';
  todayStatus = '';
  attendenceSummary: any = {};
  async loadAttendenceSummary(month?: number, year?: number) {
    if (!this.userInfo?.employeeId) return;

    const now = new Date();
    month = month || now.getMonth() + 1;
    year = year || now.getFullYear();
    try {
      const summary: any = await this.serverApi.get(
        `/api/attendance/summary/${this.userInfo.employeeId}`,
        { month, year }
      );
    this.attendenceSummary = summary;
    this.todayWorkHours = summary.today.totalHours
      ? `${summary.today.totalHours.toFixed(2)}h`
      : '-';
    this.todayStatus = summary.today.status || '-';
    this.todayCheckInTime = summary.today.checkInTime
      ? formatDate(summary.today.checkInTime, 'shortTime', 'en')
      : '-';

    const labels = summary.history.map((d: any) => dayjs(d.date).format('ddd'));
    const hours = summary.history.map((d: any) => d.totalHours || 0);

    this.attendanceData = {
      labels,
      datasets: [
        {
          label: 'Hours Worked',
          backgroundColor: '#f97316',
          borderRadius: 4,
          data: hours,
        },
      ],
    };
      this.cdr.detectChanges();
    } catch {
      this.attendanceData = { labels: [], datasets: [] };
    }
  }

  async loadUpcomingLeaves() {
    try {
      const res: any = await this.serverApi.get('/api/leaves/upcoming');
      this.upcomingLeaves = (res || []).map((l: any) => ({
      title: l.title,
      status: l.status,
      date: `${dayjs(l.startDate).format('MMM D')} - ${dayjs(l.endDate).format(
        'D'
      )}`,
      away: `${dayjs(l.startDate).diff(dayjs(), 'day')} days away`,
      }));
    } catch {
      this.upcomingLeaves = [];
    }
  }

  async loadPerformanceGoals() {
    if (!this.userInfo?.employeeId) return;
    try {
      const records: any = await this.serverApi.get(
        `/api/performance/${this.userInfo.employeeId}`
      );
      if (records?.data?.length) {
        this.performanceGoals = records.data.slice(0, 3).map((r: any, i: number) => ({
          title: r.goals?.split('\n')[0]?.substring(0, 40) || `Goal ${i + 1}`,
          progress: r.rating ? Math.min(r.rating * 10, 100) : 0,
          progressLabel: r.rating ? `${r.rating}/10` : 'Pending',
        }));
      }
    } catch {
      // keep default placeholder goals on error
    }
  }

  // Placeholder tasks and quick actions for now
  loadPendingTasks() {
    this.pendingTasks = [
      {
        title: 'Complete Q4 Performance Review',
        due: 'Dec 5',
        priority: 'High',
        severity: 'danger',
      },
      {
        title: 'Submit Expense Report',
        due: 'Dec 3',
        priority: 'Medium',
        severity: 'warning',
      },
      {
        title: 'Update Project Documentation',
        due: 'Dec 10',
        priority: 'Low',
        severity: 'info',
      },
    ];
  }

  loadQuickActions() {
    this.quickActions = [
      {
        label: 'Request Leave',
        icon: 'pi pi-calendar',
        color: 'text-green-600',
      },
      { label: 'View Payslip', icon: 'pi pi-dollar', color: 'text-purple-600' },
      { label: 'View Attendance', icon: 'pi pi-clock', color: 'text-blue-600' },
      {
        label: 'Performance Review',
        icon: 'pi pi-chart-line',
        color: 'text-orange-600',
      },
    ];
  }


  onQuickAction(actionLabel: string) {
    const routeMap: Record<string, string> = {
      'Request Leave': '/leaves',
      'View Payslip': '/payroll',
      'View Attendance': '/attendence',
      'Performance Review': '/performance',
    };

    const targetRoute = routeMap[actionLabel];
    if (targetRoute) {
      this.router.navigate([targetRoute]);
    }
  }

  async initChartOptions() {
    await this.loadAttendenceSummary();

    this.chartOptions = {
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#111827',
          bodyColor: '#6b7280',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f3f4f6' },
          border: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11 } },
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11 } },
        },
      },
    };
    
    this.cdr.markForCheck();
  }
}

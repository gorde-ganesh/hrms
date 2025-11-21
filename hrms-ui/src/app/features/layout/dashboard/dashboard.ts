import { CommonModule, formatDate } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api-interface.service';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import dayjs from 'dayjs';

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
export class Dashboard {
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

  dashboardStats: any = {};

  constructor(private serverApi: ApiService, private cdr: ChangeDetectorRef) {
    this.userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    if (this.userInfo && this.userInfo.role) {
      this.userInfo.role = this.userInfo.role.toUpperCase();
    }
    console.log('UserInfo:', this.userInfo);
    this.initChartOptions();
    this.loadUpcomingLeaves();
    // this.loadPerformanceGoals();
    this.loadPendingTasks();
    this.loadQuickActions();
    this.loadDashboardStats();
  }

  async loadDashboardStats() {
    try {
      const res: any = await this.serverApi.get('/api/dashboard/stats');
      this.dashboardStats = res;
      console.log('Dashboard Stats:', this.dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    }
    this.cdr.detectChanges();
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
    const now = new Date();
    month = month || now.getMonth() + 1;
    year = year || now.getFullYear();
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
          backgroundColor: '#3B82F6',
          data: hours,
        },
      ],
    };
    this.cdr.detectChanges();
    console.log(this.todayStatus, 'status>>>>');
  }

  async loadUpcomingLeaves() {
    const res: any = await this.serverApi.get('/api/leaves/upcoming');
    this.upcomingLeaves = res?.content?.map((l: any) => ({
      title: l.title,
      status: l.status,
      date: `${dayjs(l.startDate).format('MMM D')} - ${dayjs(l.endDate).format(
        'D'
      )}`,
      away: `${dayjs(l.startDate).diff(dayjs(), 'day')} days away`,
    }));
  }

  // loadPerformanceGoals() {
  //   this.dashboardService.getPerformanceGoals().subscribe((res) => {
  //     this.performanceGoals = res.map((goal: any, i: number) => ({
  //       title: goal.goal || `Goal ${i + 1}`,
  //       progress: goal.rating ? Math.min(goal.rating * 10, 100) : 0,
  //       progressLabel: `${goal.rating ? goal.rating * 10 : 0}%`,
  //     }));
  //   });
  // }

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

  async initChartOptions() {
    await this.loadAttendenceSummary();

    this.chartOptions = {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    };
    console.log(this.attendanceData, 'chartdata');
    this.cdr.markForCheck();
  }
}

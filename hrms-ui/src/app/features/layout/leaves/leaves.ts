import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { StatusPipe } from '../../../pipes/status.pipe';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { debounceTime, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-leaves',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    DialogModule,
    TabsModule,
    MessageModule,
    ToastModule,
    DatePickerModule,
    FloatLabel,
    TextareaModule,
    SelectModule,
    StatusPipe,
    FullCalendarModule,
  ],
  templateUrl: './leaves.html',
  styleUrl: './leaves.css',
})
export class Leaves implements OnInit, OnDestroy {
  leaves: any[] = [];
  totalRecords = 0;
  teamLeaves: any[] = [];
  teamTotalRecords = 0;

  searchControl = new FormControl('');
  teamSearchControl = new FormControl('');

  apiParams: any = { pageno: 0, top: 10 };
  teamApiParams: any = { pageno: 0, top: 10 };

  applyLeaveDialog = false;
  applyLeaveForm!: FormGroup;
  statuses: any[] = [];
  leaveTypes: any[] = [];
  leaveBalances: any[] = [];
  leaveDates: Date[] = [];

  clonedLeaves: { [id: string]: any } = {};
  minDate = new Date();
  permissions: any;

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    events: [],
    eventClick: (arg) => this.handleEventClick(arg),
  };

  private destroy$ = new Subject<void>();

  constructor(
    private serverApi: ApiService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private fb: FormBuilder,
    private authState: AuthStateService
  ) {
    this.permissions = this.authState.userInfo?.permissions?.['leaves'];
    this.applyLeaveForm = fb.group({
      date: ['', [Validators.required]],
      reason: ['', [Validators.required]],
      leaveType: ['', [Validators.required]],
    });
  }

  async ngOnInit() {
    this.loadLeaves();
    this.loadLeaveBalances();

    const role = this.authState.userInfo?.role;
    if (role === 'MANAGER' || role === 'ADMIN' || role === 'HR') {
      this.loadTeamLeaves();
    }

    const masterData: any = await this.serverApi.get('/api/master-data');
    this.statuses = masterData.LEAVE_STATUS;
    this.leaveTypes = masterData.LEAVE_TYPE;

    this.searchControl.valueChanges
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.apiParams = { ...this.apiParams, pageno: 0, search: val || undefined };
        this.loadLeaves(this.apiParams);
      });

    this.teamSearchControl.valueChanges
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.teamApiParams = { ...this.teamApiParams, pageno: 0, search: val || undefined };
        this.loadTeamLeaves(this.teamApiParams);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadLeaveBalances() {
    const userInfo = this.authState.userInfo;
    const balances: any = await this.serverApi.get(
      `/api/leave-balance/${userInfo?.employeeId}`
    );
    this.leaveBalances = balances;
    this.cdr.detectChanges();
  }

  async loadLeaves(payload = this.apiParams) {
    const userInfo = this.authState.userInfo;
    const leave: any = await this.serverApi.get(
      `/api/leaves/${userInfo?.employeeId}`,
      payload
    );
    this.leaves = leave.content;
    this.totalRecords = leave.totalRecords;
    this.updateCalendarEvents();
    this.cdr.detectChanges();
  }

  async loadTeamLeaves(payload = this.teamApiParams) {
    const userInfo = this.authState.userInfo;
    const leave: any = await this.serverApi.get(
      `/api/leaves/${userInfo?.employeeId}/team`,
      payload
    );
    this.teamLeaves = leave.content;
    this.teamTotalRecords = leave.totalRecords;
    this.cdr.detectChanges();
  }

  updateCalendarEvents() {
    const events = this.leaves.map((l) => ({
      title: `${this.formatLeaveType(l.leaveType)} — ${l.reason}`,
      start: l.startDate,
      end: l.endDate,
      color: this.getEventColor(l.status),
    }));
    this.calendarOptions = { ...this.calendarOptions, events };
  }

  getEventColor(status: string): string {
    switch (status) {
      case 'APPROVED': return '#22c55e';
      case 'PENDING':  return '#eab308';
      case 'REJECTED': return '#ef4444';
      default:         return '#3b82f6';
    }
  }

  handleEventClick(_arg: any) {
    // Reserved for leave detail popover
  }

  pageChange(event: any) {
    this.apiParams = { ...this.apiParams, pageno: event.first, top: event.rows };
    this.loadLeaves(this.apiParams);
  }

  teamPageChange(event: any) {
    this.teamApiParams = { ...this.teamApiParams, pageno: event.first, top: event.rows };
    this.loadTeamLeaves(this.teamApiParams);
  }

  clearFilter() {
    this.searchControl.reset();
    this.apiParams = { pageno: 0, top: this.apiParams.top };
    this.loadLeaves(this.apiParams);
  }

  clearTeamFilter() {
    this.teamSearchControl.reset();
    this.teamApiParams = { pageno: 0, top: this.teamApiParams.top };
    this.loadTeamLeaves(this.teamApiParams);
  }

  async onApplyLeave() {
    const fromtos = this.leaves.map((l) => ({ from: l.startDate, to: l.endDate }));
    this.leaveDates = this.getAllLeaveDates(fromtos);
    this.applyLeaveDialog = true;
  }

  async onAddLeave() {
    this.applyLeaveForm.markAllAsTouched();
    if (!this.applyLeaveForm.valid) return;

    const userInfo = this.authState.userInfo;
    const { date, reason, leaveType } = this.applyLeaveForm.value;

    const selectedBalance = this.leaveBalances.find((b) => b.leaveType === leaveType);
    const start = new Date(date[0]);
    const end = new Date(date[1] ?? date[0]);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (selectedBalance && selectedBalance.totalLeaves - selectedBalance.usedLeaves < diffDays) {
      this.messageService.add({
        severity: 'error',
        summary: 'Insufficient Balance',
        detail: `Not enough ${this.formatLeaveType(leaveType)} balance for ${diffDays} day${diffDays > 1 ? 's' : ''}.`,
      });
      return;
    }

    const user: any = await this.serverApi.get(`/api/users/${userInfo?.id}`);
    await this.serverApi.post('/api/leaves', {
      employeeId: userInfo?.employeeId,
      startDate: date[0],
      endDate: date[1] ?? date[0],
      reason,
      leaveType,
      managerApprovalId: user.manager?.userId ?? null,
    });

    this.messageService.add({
      severity: 'success',
      summary: 'Request Submitted',
      detail: 'Your leave request has been submitted for approval.',
    });

    this.applyLeaveForm.reset();
    this.applyLeaveDialog = false;
    this.loadLeaves();
    this.loadLeaveBalances();
  }

  onRowEditInit(leave: any) {
    this.clonedLeaves[leave.id] = { ...leave };
  }

  onRowEditCancel(leave: any, index: number, isTeam = false) {
    const list = isTeam ? this.teamLeaves : this.leaves;
    list[index] = this.clonedLeaves[leave.id];
    delete this.clonedLeaves[leave.id];
  }

  async onRowEditSave(leave: any) {
    const userInfo = this.authState.userInfo;
    await this.serverApi.patch(`/api/leaves/${leave.id}/status`, {
      status: leave.status,
      approvedBy: userInfo?.id,
    });
    this.messageService.add({
      severity: 'success',
      summary: 'Status Updated',
      detail: `Leave marked as ${this.formatStatus(leave.status)}.`,
    });
    this.loadLeaves();
    this.loadTeamLeaves();
  }

  getAllLeaveDates(arr: { from: string; to: string }[]): Date[] {
    const dates: Date[] = [];
    arr.forEach(({ from, to }) => {
      for (const d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    });
    return dates;
  }

  isLeaveDate(day: number, month: number, year: number): boolean {
    return this.leaveDates.some(
      (d) => d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    );
  }

  hasPermission(action: string): boolean {
    return this.permissions?.includes(action) ?? false;
  }

  // ── Display helpers ──────────────────────────────────────────────────────

  formatLeaveType(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatStatus(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  leaveTypeIcon(type: string): string {
    const t = type.toUpperCase();
    if (t.includes('SICK'))                              return 'pi pi-heart';
    if (t.includes('ANNUAL') || t.includes('VACATION')) return 'pi pi-sun';
    if (t.includes('MATERNITY') || t.includes('PATERNITY')) return 'pi pi-heart-fill';
    if (t.includes('CASUAL'))                            return 'pi pi-calendar-clock';
    return 'pi pi-calendar';
  }

  leaveDuration(leave: any): number {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  getUsedPercent(balance: any): number {
    if (!balance.totalLeaves) return 0;
    return Math.min((balance.usedLeaves / balance.totalLeaves) * 100, 100);
  }
}

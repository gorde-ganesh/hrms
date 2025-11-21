import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { ApiService } from '../../../services/api-interface.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { StatusPipe } from '../../../pipes/status.pipe';
import { CardModule } from 'primeng/card';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

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
    DatePickerModule,
    FloatLabel,
    TextareaModule,
    SelectModule,
    StatusPipe,
    StatusPipe,
    CardModule,
    FullCalendarModule,
  ],
  templateUrl: './leaves.html',
  styleUrl: './leaves.css',
})
export class Leaves implements OnInit {
  leaves: any[] = [];
  totalRecords = 0;
  teamLeaves: any[] = [];
  teamTotalRecords = 0;
  searchControl = new FormControl('');
  apiParams: any = { pageno: 0, top: 10 };
  applyLeaveDialog = false;
  applyLeaveForm!: FormGroup;
  statuses = [];
  clonedLeaves: { [s: string]: any } = {};
  minDate = new Date();
  permissions = JSON.parse(sessionStorage.getItem('userInfo') as string)
    .permissions['leaves'];
  leaveBalances: any[] = [];
  leaveTypes: any[] = [];
  leaveBalanceSummary: any = {};

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

  constructor(
    private serverApi: ApiService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    this.applyLeaveForm = fb.group({
      date: ['', [Validators.required]],
      reason: ['', [Validators.required]],
      leaveType: ['', [Validators.required]],
    });
  }

  async ngOnInit() {
    this.loadLeaves();
    this.loadTeamLeaves();
    this.loadLeaveBalances();
    const masterData: any = await this.serverApi.get('/api/master-data');
    this.statuses = masterData.LEAVE_STATUS;
    this.leaveTypes = masterData.LEAVE_TYPE;
  }

  async loadLeaveBalances() {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    const balances: any = await this.serverApi.get(
      `/api/leave-balance/${userInfo.employeeId}`
    );
    this.leaveBalances = balances;

    // Calculate summary
    this.leaveBalanceSummary = {
      total: this.leaveBalances.reduce(
        (acc, curr) => acc + curr.totalLeaves,
        0
      ),
      used: this.leaveBalances.reduce((acc, curr) => acc + curr.usedLeaves, 0),
      available: this.leaveBalances.reduce(
        (acc, curr) => acc + (curr.totalLeaves - curr.usedLeaves),
        0
      ),
    };

    this.cdr.detectChanges();
  }

  async loadLeaves(payload = this.apiParams) {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    let leave: any;
    leave = await this.serverApi.get(
      `/api/leaves/${userInfo.employeeId}`,
      payload
    );
    this.leaves = leave.content;
    this.totalRecords = leave.totalRecords;

    // Update calendar events
    this.updateCalendarEvents();

    this.cdr.detectChanges();
  }

  updateCalendarEvents() {
    const events = this.leaves.map((l) => ({
      title: `${l.leaveType} - ${l.reason}`,
      start: l.startDate,
      end: l.endDate, // FullCalendar end date is exclusive, might need adjustment if backend returns inclusive
      color: this.getEventColor(l.status),
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: events,
    };
  }

  getEventColor(status: string) {
    switch (status) {
      case 'APPROVED':
        return '#22c55e'; // green-500
      case 'PENDING':
        return '#eab308'; // yellow-500
      case 'REJECTED':
        return '#ef4444'; // red-500
      default:
        return '#3b82f6'; // blue-500
    }
  }

  handleEventClick(arg: any) {
    // Optional: show details
    console.log(arg.event.title);
  }

  async loadTeamLeaves(payload = this.apiParams) {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    let leave: any;

    leave = await this.serverApi.get(
      `/api/leaves/${userInfo.employeeId}/team`,
      payload
    );
    this.teamLeaves = leave.content;
    this.teamTotalRecords = leave.totalRecords;
    this.cdr.detectChanges();
  }

  pageChange(event: any) {
    this.apiParams.pageno = event.first;
    this.apiParams.top = event.rows;
    this.loadLeaves();
  }

  clearFilter() {
    this.searchControl.reset();
  }

  async onAddLeave() {
    this.applyLeaveForm.markAllAsTouched();
    if (!this.applyLeaveForm.valid) return;
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    const { date, reason, leaveType } = this.applyLeaveForm.value;

    // Client-side validation for balance
    const selectedBalance = this.leaveBalances.find(
      (b) => b.leaveType === leaveType
    );

    // Calculate requested days (simple approximation, backend does full validation)
    const start = new Date(date[0]);
    const end = new Date(date[1]);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (
      selectedBalance &&
      selectedBalance.totalLeaves - selectedBalance.usedLeaves < diffDays
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Insufficient Balance',
        detail: `You don't have enough ${leaveType} leave balance.`,
      });
      return;
    }

    const user: any = await this.serverApi.get(`/api/users/${userInfo.id}`);
    const leave = await this.serverApi.post('/api/leaves', {
      employeeId: userInfo.employeeId,
      startDate: date[0],
      endDate: date[1],
      reason,
      leaveType,
      managerApprovalId: user.manager.userId,
    });

    this.applyLeaveForm.reset();
    this.applyLeaveDialog = false;
    this.applyLeaveForm.reset();
    this.applyLeaveDialog = false;
    this.loadLeaves();
    this.loadLeaveBalances();
  }

  onRowEditInit(leave: any) {
    this.clonedLeaves[leave.id as string] = { ...leave };
  }

  leaveDates: any = [];
  async onApplyLeave() {
    const fromtos = this.leaves.map((ii) => {
      return { from: ii.startDate, to: ii.endDate };
    });
    this.leaveDates = this.getAllLeaveDates(fromtos);
    this.applyLeaveDialog = true;
  }

  getAllLeaveDates(arr: any[]): Date[] {
    const dates: Date[] = [];

    arr.forEach((range: any) => {
      const from = new Date(range.from);
      const to = new Date(range.to);

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    });

    return dates;
  }

  isLeaveDate(day: number, month: number, year: number): boolean {
    return this.leaveDates.some(
      (d: any) =>
        d.getDate() === day &&
        d.getMonth() === month &&
        d.getFullYear() === year
    );
  }

  async onRowEditSave(leave: any) {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    const updateLeave = await this.serverApi.patch(
      `/api/leaves/${leave.id}/status`,
      { status: leave.status, approvedBy: userInfo.id }
    );

    this.loadLeaves();
    this.loadTeamLeaves();
  }

  onRowEditCancel(leave: any, index: number) {
    this.leaves[index] = this.clonedLeaves[leave.id as string];
    delete this.clonedLeaves[leave.id as string];
  }

  hasPermission(action: string) {
    return this.permissions.includes(action);
  }
}

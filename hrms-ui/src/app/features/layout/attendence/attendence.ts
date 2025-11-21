import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ApiService } from '../../../services/api-interface.service';
import { CommonModule, formatDate } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FloatLabel } from 'primeng/floatlabel';

@Component({
  selector: 'app-attendence',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IconFieldModule,
    ButtonModule,
    TabsModule,
    TableModule,
    InputIconModule,
    InputTextModule,
    CardModule,
    DialogModule,
    DatePickerModule,
    SelectModule,
    CheckboxModule,
    ToastModule,
    FloatLabel,
  ],
  providers: [MessageService],
  templateUrl: './attendence.html',
  styleUrl: './attendence.css',
})
export class Attendence implements OnInit {
  myAttendence: any[] = [];
  myAttendenceRecords = 0;
  myAttendenceParams: any = {
    pageno: 0,
    top: 10,
  };

  teamAttendence: any[] = [];
  teamAttendenceRecords = 0;
  teamAttendenceParams: any = {
    pageno: 0,
    top: 10,
  };

  allAttendence: any[] = [];
  allAttendenceRecords = 0;
  allAttendenceParams: any = {
    pageno: 0,
    top: 10,
  };

  searchControl = new FormControl(null);
  teamSearchControl = new FormControl(null);
  allSearchControl = new FormControl(null);

  userInfo: any;
  attendenceSummary: any = {};
  userRole: string = '';

  // Role visibility flags
  showTeamTab = false;
  showAllEmployeesTab = false;

  // Edit dialog
  showEditDialog = false;
  editForm: FormGroup;
  selectedAttendance: any = null;

  // Bulk operations
  selectedEmployees: any[] = [];
  showBulkDialog = false;
  bulkDate: Date = new Date();
  bulkStatus: string = 'PRESENT';

  // Filters for All Employees
  departments: any[] = [];
  designations: any[] = [];
  selectedDepartment: any = null;
  selectedDesignation: any = null;

  statusOptions = [
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'Half Day', value: 'HALF_DAY' },
    { label: 'Leave', value: 'LEAVE' },
  ];

  todayCheckInTime = '';
  todayWorkHours = '';
  todayStatus = '';

  constructor(
    private serverApi: ApiService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {
    this.userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    this.userRole = this.userInfo?.role || 'EMPLOYEE';

    // Set role visibility
    this.showTeamTab = this.userRole === 'MANAGER';
    this.showAllEmployeesTab =
      this.userRole === 'HR' || this.userRole === 'ADMIN';

    // Initialize edit form
    this.editForm = new FormGroup({
      checkIn: new FormControl(null),
      checkOut: new FormControl(null),
      status: new FormControl('PRESENT', Validators.required),
      attendanceDate: new FormControl(new Date(), Validators.required),
    });

    this.getAttendenceSummary();
  }

  ngOnInit(): void {
    this.loadAttendence();
    if (this.showTeamTab) {
      this.loadTeamAttendence();
    } else if (this.showAllEmployeesTab) {
      this.loadAllAttendence();
    }
    if (this.showAllEmployeesTab) {
      this.loadDepartmentsAndDesignations();
    }
  }

  async loadDepartmentsAndDesignations() {
    try {
      const [depts, desigs]: any = await Promise.all([
        this.serverApi.get('/api/departments', { skip: 0, top: 100 }),
        this.serverApi.get('/api/designations', { skip: 0, top: 100 }),
      ]);
      this.departments = depts.content || [];
      this.designations = desigs.content || [];
    } catch (error) {
      console.error('Error loading departments/designations:', error);
    }
  }

  async clockInOut() {
    try {
      await this.serverApi.post(`/api/attendance`, {
        employeeId: this.userInfo.employeeId,
      });
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Attendance marked successfully',
      });
      this.loadAttendence();
      this.getAttendenceSummary();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to mark attendance',
      });
    }
  }

  async getAttendenceSummary(month?: number, year?: number) {
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
    } catch (error) {
      console.error('Error loading attendance summary:', error);
    }
  }

  getPercentage(present: number, working: number): number {
    return working ? Math.round((present / working) * 100) : 0;
  }

  async loadAttendence(payload = this.myAttendenceParams) {
    const now = new Date();
    payload.month = payload.month || now.getMonth() + 1;
    payload.year = payload.year || now.getFullYear();
    try {
      const data: any = await this.serverApi.get(
        `/api/attendance/${this.userInfo.employeeId}`,
        payload
      );
      this.myAttendence = data.content;
      this.myAttendenceRecords = data.totalRecords;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading my attendance:', error);
    }
  }

  async loadTeamAttendence(payload = this.teamAttendenceParams) {
    const now = new Date();
    payload.month = payload.month || now.getMonth() + 1;
    payload.year = payload.year || now.getFullYear();
    if (this.teamSearchControl.value) {
      payload.search = this.teamSearchControl.value;
    }
    try {
      const data: any = await this.serverApi.get(
        '/api/attendance/team',
        payload
      );
      this.teamAttendence = data.content;
      this.teamAttendenceRecords = data.totalRecords;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading team attendance:', error);
    }
  }

  async loadAllAttendence(payload = this.allAttendenceParams) {
    const now = new Date();
    payload.month = payload.month || now.getMonth() + 1;
    payload.year = payload.year || now.getFullYear();
    if (this.allSearchControl.value) {
      payload.search = this.allSearchControl.value;
    }
    if (this.selectedDepartment) {
      payload.departmentId = this.selectedDepartment.id;
    }
    if (this.selectedDesignation) {
      payload.designationId = this.selectedDesignation.id;
    }
    try {
      const data: any = await this.serverApi.get(
        '/api/attendance/all',
        payload
      );
      this.allAttendence = data.content;
      this.allAttendenceRecords = data.totalRecords;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading all attendance:', error);
    }
  }

  pageChange(event: any) {
    this.myAttendenceParams.pageno = event.first;
    this.myAttendenceParams.top = event.rows;
    this.loadAttendence();
  }

  teamPageChange(event: any) {
    this.teamAttendenceParams.pageno = event.first;
    this.teamAttendenceParams.top = event.rows;
    this.loadTeamAttendence();
  }

  allPageChange(event: any) {
    this.allAttendenceParams.pageno = event.first;
    this.allAttendenceParams.top = event.rows;
    this.loadAllAttendence();
  }

  clearFilter() {
    this.searchControl.reset();
  }

  clearTeamFilter() {
    this.teamSearchControl.reset();
    this.loadTeamAttendence();
  }

  clearAllFilter() {
    this.allSearchControl.reset();
    this.selectedDepartment = null;
    this.selectedDesignation = null;
    this.loadAllAttendence();
  }

  openEditDialog(attendance: any) {
    this.selectedAttendance = attendance;
    this.editForm.patchValue({
      checkIn: attendance.checkIn ? new Date(attendance.checkIn) : null,
      checkOut: attendance.checkOut ? new Date(attendance.checkOut) : null,
      status: attendance.status,
      attendanceDate: attendance.attendanceDate
        ? new Date(attendance.attendanceDate)
        : new Date(),
    });
    this.showEditDialog = true;
  }

  async saveAttendance() {
    if (this.editForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill all required fields',
      });
      return;
    }

    try {
      const formValue = this.editForm.value;
      await this.serverApi.put(
        `/api/attendance/${this.selectedAttendance.id}`,
        {
          checkIn: formValue.checkIn,
          checkOut: formValue.checkOut,
          status: formValue.status,
          attendanceDate: formValue.attendanceDate,
        }
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Attendance updated successfully',
      });
      this.showEditDialog = false;
      this.loadAllAttendence();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update attendance',
      });
    }
  }

  openBulkDialog() {
    if (this.selectedEmployees.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select at least one employee',
      });
      return;
    }
    this.showBulkDialog = true;
  }

  async saveBulkAttendance() {
    try {
      const employeeIds = this.selectedEmployees.map((emp) => emp.employee.id);
      await this.serverApi.post('/api/attendance/bulk', {
        employeeIds,
        date: this.bulkDate,
        status: this.bulkStatus,
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Bulk attendance marked for ${employeeIds.length} employees`,
      });
      this.showBulkDialog = false;
      this.selectedEmployees = [];
      this.loadAllAttendence();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to mark bulk attendance',
      });
    }
  }

  async exportReport() {
    try {
      const now = new Date();
      const params: any = {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      };

      if (this.selectedDepartment) {
        params.departmentId = this.selectedDepartment.id;
      }
      if (this.selectedDesignation) {
        params.designationId = this.selectedDesignation.id;
      }

      const report: any = await this.serverApi.get(
        '/api/attendance/report',
        params
      );

      // Convert to CSV
      const csvData = this.convertToCSV(report.employees);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${params.month}_${params.year}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Report exported successfully',
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to export report',
      });
    }
  }

  convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = [
      'Employee Code',
      'Name',
      'Email',
      'Department',
      'Designation',
      'Present Days',
      'Absent Days',
      'Half Days',
      'Leave Days',
      'Total Hours',
      'Avg Hours',
    ];

    const rows = data.map((emp) => [
      emp.employeeCode,
      emp.name,
      emp.email,
      emp.department,
      emp.designation,
      emp.presentDays,
      emp.absentDays,
      emp.halfDays,
      emp.leaveDays,
      emp.totalHours,
      emp.avgHours,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }
}

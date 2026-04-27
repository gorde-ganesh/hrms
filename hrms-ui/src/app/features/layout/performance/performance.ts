import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../services/api-interface.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import dayjs from 'dayjs';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    ChartModule,
    DialogModule,
    FloatLabel,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TabsModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './performance.html',
  styleUrl: './performance.css',
})
export class Performance implements OnInit {
  userInfo: any;
  performanceRecords: any[] = [];
  teamRecords: any[] = [];
  employees: any[] = [];

  appraisalDialog = false;
  appraisalForm: FormGroup;
  editingId: string | null = null;
  saving = false;

  chartData: any = {};
  chartOptions: any = {};

  get latestRating(): number | null {
    return this.performanceRecords[0]?.rating ?? null;
  }

  get ratingLabel(): string {
    const r = this.latestRating;
    if (r === null) return 'No review yet';
    if (r <= 3) return 'Needs Improvement';
    if (r <= 6) return 'Good';
    if (r <= 8) return 'Excellent';
    return 'Outstanding';
  }

  get ratingLabelSeverity(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null | undefined {
    const r = this.latestRating;
    if (r === null) return 'secondary';
    if (r <= 3) return 'danger';
    if (r <= 6) return 'info';
    if (r <= 8) return 'success';
    return 'warn';
  }

  get lastReviewDate(): string {
    if (!this.performanceRecords[0]) return 'N/A';
    return dayjs(this.performanceRecords[0].createdAt).format('MMM D, YYYY');
  }

  get canManage(): boolean {
    return ['ADMIN', 'HR', 'MANAGER'].includes(
      this.userInfo?.role?.toUpperCase()
    );
  }

  get showTeamTab(): boolean {
    return ['ADMIN', 'HR', 'MANAGER'].includes(
      this.userInfo?.role?.toUpperCase()
    );
  }

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    this.appraisalForm = this.fb.group({
      employeeId: [null, Validators.required],
      goals: ['', Validators.required],
      rating: [null, [Validators.min(1), Validators.max(10)]],
      comments: [''],
      managerComments: [''],
    });
    this.chartOptions = {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 10, ticks: { stepSize: 1 } },
      },
    };
  }

  async ngOnInit() {
    await this.loadMyPerformance();
    if (this.showTeamTab) {
      this.loadTeamPerformance();
      this.loadEmployees();
    }
  }

  async loadMyPerformance() {
    if (!this.userInfo?.employeeId) return;
    try {
      const res: any = await this.apiService.get(
        `/api/performance/${this.userInfo.employeeId}`
      );
      this.performanceRecords = res?.data ?? [];
      this.buildChartData();
    } catch {
      this.performanceRecords = [];
    }
    this.cdr.detectChanges();
  }

  async loadTeamPerformance() {
    try {
      const role = this.userInfo?.role?.toUpperCase();
      const endpoint =
        role === 'MANAGER' ? '/api/performance/team' : '/api/performance/all';
      const res: any = await this.apiService.get(endpoint);
      this.teamRecords = res?.data ?? [];
    } catch {
      this.teamRecords = [];
    }
    this.cdr.detectChanges();
  }

  async loadEmployees() {
    try {
      const res: any = await this.apiService.get('/api/employees', {
        skip: 0,
        top: 1000,
      });
      this.employees = res?.content ?? [];
    } catch {
      this.employees = [];
    }
  }

  buildChartData() {
    const sorted = [...this.performanceRecords]
      .filter((r) => r.rating != null)
      .reverse()
      .slice(-8);

    this.chartData = {
      labels: sorted.map((r) => dayjs(r.createdAt).format('MMM D')),
      datasets: [
        {
          label: 'Rating',
          backgroundColor: '#3B82F6',
          data: sorted.map((r) => r.rating),
        },
      ],
    };
  }

  openAddDialog() {
    this.editingId = null;
    this.appraisalForm.reset();
    this.appraisalDialog = true;
  }

  openEditDialog(record: any) {
    this.editingId = record.id;
    this.appraisalForm.patchValue({
      employeeId: record.employeeId,
      goals: record.goals,
      rating: record.rating,
      comments: record.comments,
      managerComments: record.managerComments,
    });
    this.appraisalDialog = true;
  }

  async saveAppraisal() {
    this.appraisalForm.markAllAsTouched();
    if (this.appraisalForm.invalid) return;

    this.saving = true;
    const val = this.appraisalForm.value;
    try {
      if (this.editingId) {
        await this.apiService.put(`/api/performance/${this.editingId}`, {
          rating: val.rating,
          comments: val.comments,
          managerComments: val.managerComments,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'Appraisal updated successfully',
        });
      } else {
        await this.apiService.post('/api/performance', {
          employeeId: val.employeeId,
          goals: val.goals,
          rating: val.rating,
          comments: val.comments,
          managerComments: val.managerComments,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: 'Appraisal added successfully',
        });
      }
      this.appraisalDialog = false;
      await this.loadMyPerformance();
      if (this.showTeamTab) this.loadTeamPerformance();
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'Failed to save appraisal',
      });
    } finally {
      this.saving = false;
    }
  }

  getTeamSummary(): any[] {
    const map = new Map<string, any>();
    for (const r of this.teamRecords) {
      const emp = r.employee;
      const key = r.employeeId;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: key,
          name: emp?.user?.name ?? 'Unknown',
          designation: emp?.designation?.name ?? '-',
          reviewCount: 0,
          latestRating: null,
          lastReviewed: null,
        });
      }
      const entry = map.get(key);
      entry.reviewCount++;
      if (!entry.latestRating) entry.latestRating = r.rating;
      if (!entry.lastReviewed) entry.lastReviewed = r.createdAt;
    }
    return Array.from(map.values());
  }
}

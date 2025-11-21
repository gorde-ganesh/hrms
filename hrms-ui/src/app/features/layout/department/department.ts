import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiService } from '../../../services/api-interface.service';
import { FormErrorDirective } from '../../../directives/form-error.directive';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

interface DepartmentDto {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    FloatLabel,
    FormErrorDirective,
    IconFieldModule,
    InputIconModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './department.html',
  styleUrl: './department.css',
})
export class Department implements OnInit {
  @ViewChild('dt') dt?: Table;
  departments: DepartmentDto[] = [];
  totalRecords = 0;
  departmentForm: FormGroup;
  dialogVisible = false;
  isEditMode = false;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.departmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(250)]],
    });
  }

  ngOnInit(): void {
    // Initial load is handled by p-table lazy load
  }

  async loadDepartments(event?: any) {
    const page = event ? Math.floor(event.first / event.rows) + 1 : 1;
    const limit = event ? event.rows : 10;

    const response: any = await this.apiService.get('/api/departments', {
      page,
      limit,
    });

    this.departments = response.content;
    this.totalRecords = response.totalRecords;

    this.cdr.detectChanges();
  }

  applyGlobalFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dt?.filterGlobal(value, 'contains');
  }

  openCreateDialog() {
    this.dialogVisible = true;
    this.isEditMode = false;
    this.editingId = null;
    this.departmentForm.reset();
  }

  editDepartment(row: DepartmentDto) {
    this.dialogVisible = true;
    this.isEditMode = true;
    this.editingId = row.id;
    this.departmentForm.patchValue({
      name: row.name,
      description: row.description,
    });
  }

  async saveDepartment() {
    this.departmentForm.markAllAsTouched();
    if (this.departmentForm.invalid) return;

    const payload = this.departmentForm.value;
    if (this.isEditMode && this.editingId) {
      await this.apiService.put(`/api/departments/${this.editingId}`, payload);
      this.messageService.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Department updated successfully',
      });
    } else {
      await this.apiService.post('/api/departments', payload);
      this.messageService.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Department created successfully',
      });
    }

    this.dialogVisible = false;
    this.departmentForm.reset();
    this.loadDepartments();
  }

  confirmDelete(event: Event, row: DepartmentDto) {
    this.confirmationService.confirm({
      target: event.currentTarget as HTMLElement,
      message: `Delete department "${row.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        await this.apiService.delete(`/api/departments/${row.id}`);
        this.messageService.add({
          severity: 'success',
          summary: 'Removed',
          detail: 'Department deleted successfully',
        });
        this.loadDepartments();
      },
    });
  }
}

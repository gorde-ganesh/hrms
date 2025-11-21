import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
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

interface DesignationDto {
  id: string;
  name: string;
  description?: string | null;
  classification?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-designations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
  templateUrl: './designations.html',
  styleUrl: './designations.css',
})
export class Designations implements OnInit {
  @ViewChild('dt') dt!: Table;
  designations: DesignationDto[] = [];
  totalRecords = 0;
  designationForm: FormGroup;
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
    this.designationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      classification: ['', [Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(250)]],
    });
  }

  ngOnInit(): void {
    // Initial load is handled by p-table lazy load
  }

  async loadDesignations(event?: any) {
    const page = event ? Math.floor(event.first / event.rows) + 1 : 1;
    const limit = event ? event.rows : 10;

    const response: any = await this.apiService.get('/api/designations', {
      page,
      limit,
    });

    this.designations = response.content;
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
    this.designationForm.reset();
  }

  editDesignation(row: DesignationDto) {
    this.dialogVisible = true;
    this.isEditMode = true;
    this.editingId = row.id;
    this.designationForm.patchValue({
      name: row.name,
      classification: row.classification,
      description: row.description,
    });
  }

  async saveDesignation() {
    this.designationForm.markAllAsTouched();
    if (this.designationForm.invalid) return;

    const payload = this.designationForm.value;

    if (this.isEditMode && this.editingId) {
      await this.apiService.put(`/api/designations/${this.editingId}`, payload);
      this.messageService.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Designation updated successfully',
      });
    } else {
      await this.apiService.post('/api/designations', payload);
      this.messageService.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Designation created successfully',
      });
    }

    this.dialogVisible = false;
    this.designationForm.reset();
    this.loadDesignations();
  }

  confirmDelete(event: Event, row: DesignationDto) {
    this.confirmationService.confirm({
      target: event.currentTarget as HTMLElement,
      message: `Delete designation "${row.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        await this.apiService.delete(`/api/designations/${row.id}`);
        this.messageService.add({
          severity: 'success',
          summary: 'Removed',
          detail: 'Designation deleted successfully',
        });
        this.loadDesignations();
      },
    });
  }
}

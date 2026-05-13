import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule } from 'primeng/autocomplete';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmPopup } from 'primeng/confirmpopup';
import { TagModule } from 'primeng/tag';
import { StatusPipe } from '../../../pipes/status.pipe';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { FormErrorDirective } from '../../../directives/form-error.directive';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';

interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  netSalary: number;
  lopDays: number;
  status: 'DRAFT' | 'FINALIZED' | 'PAID';
  employee?: { employeeCode: string; user: { name: string } };
}

interface SalaryStructure {
  id: string;
  employeeId: string;
  ctcAnnual: number;
  basicPct: number;
  hraPct: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface BankTransferBatch {
  id: string;
  month: number;
  year: number;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
  fileUrl: string | null;
  _count: { items: number };
  createdAt: string;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SelectModule,
    AutoCompleteModule,
    ButtonModule,
    InputText,
    InputNumberModule,
    FloatLabel,
    TabsModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    ToolbarModule,
    DialogModule,
    TextareaModule,
    DatePickerModule,
    TagModule,
    StatusPipe,
    ToastModule,
    DividerModule,
    FormErrorDirective,
    CardModule,
    ConfirmPopup,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll.html',
  styleUrl: './payroll.css',
})
export class Payroll implements OnInit {
  options: any = {};
  userInfo: any;
  tabIndex = '0';
  readonly monthNames = MONTH_NAMES;

  // ── Payslips tab ─────────────────────────────────────────────────────────
  payrolls: PayrollRecord[] = [];
  payrollTotal = 0;
  payrollSkip = 0;
  payrollTop = 10;
  filterEmployee: any = null;
  filterMonthYear: Date | null = null;
  empSuggestions: any[] = [];

  // ── Generate tab ─────────────────────────────────────────────────────────
  generateForm!: FormGroup;
  isBatch = false;
  generating = false;
  generateResult: any = null;
  batchResult: any = null;

  // ── Salary structure tab ─────────────────────────────────────────────────
  structEmployee: any = null;
  structEmpSuggestions: any[] = [];
  structures: SalaryStructure[] = [];
  structForm!: FormGroup;
  structDialogVisible = false;

  // ── Bank transfer tab ────────────────────────────────────────────────────
  transfers: BankTransferBatch[] = [];
  transferMonth: Date = new Date();

  // ── Components tab ────────────────────────────────────────────────────────
  payrollComponentsAll: any[] = [];
  payrollComponentsParams = { pageno: 0, top: 10 };
  payrollComponentsTotal = 0;
  componentDialog = false;
  isEditMode = false;
  editId: string | null = null;
  addComponentForm!: FormGroup;

  get isHR() {
    return ['HR', 'ADMIN'].includes(this.userInfo?.role);
  }

  get isAdmin() {
    return this.userInfo?.role === 'ADMIN';
  }

  constructor(
    private serverApi: ApiService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private authState: AuthStateService
  ) {}

  ngOnInit() {
    this.userInfo = this.authState.userInfo;
    this.serverApi
      .get<any>('/api/master-data')
      .then((r) => (this.options = r))
      .catch(() => {});

    this.generateForm = this.fb.group({
      employee: [null],
      monthYear: [new Date(), Validators.required],
    });

    this.structForm = this.fb.group({
      ctcAnnual: [null, [Validators.required, Validators.min(1)]],
      basicPct: [
        40,
        [Validators.required, Validators.min(1), Validators.max(100)],
      ],
      hraPct: [
        50,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      effectiveFrom: [new Date(), Validators.required],
    });

    this.addComponentForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      percent: [''],
      description: [''],
    });

    this.loadPayrolls();
    if (this.isHR) {
      this.loadComponents();
      this.loadTransfers();
    }
  }

  // ── Payslips ──────────────────────────────────────────────────────────────

  async loadPayrolls(event?: any) {
    if (event) {
      this.payrollSkip = event.first ?? 0;
      this.payrollTop = event.rows ?? 10;
    }

    const params: any = { skip: this.payrollSkip, top: this.payrollTop };

    if (this.isHR) {
      if (this.filterEmployee?.id) params.employeeId = this.filterEmployee.id;
      if (this.filterMonthYear) {
        params.month = this.filterMonthYear.getMonth() + 1;
        params.year = this.filterMonthYear.getFullYear();
      }
    } else {
      params.employeeId = this.userInfo?.employeeId;
    }

    const resp: any = await this.serverApi.get('/api/payroll', params);
    this.payrolls = resp.content;
    this.payrollTotal = resp.totalRecords;
  }

  applyFilter() {
    this.payrollSkip = 0;
    this.loadPayrolls();
  }

  clearFilter() {
    this.filterEmployee = null;
    this.filterMonthYear = null;
    this.payrollSkip = 0;
    this.loadPayrolls();
  }

  async searchEmployees(event: any) {
    try {
      const r: any = await this.serverApi.get(
        '/api/employees',
        { search: event.query, top: 10 },
        false
      );
      this.empSuggestions = r.content ?? [];
    } catch {
      this.empSuggestions = [];
    }
  }

  payrollMonthLabel(p: PayrollRecord) {
    return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
  }

  statusSeverity(
    status: string
  ): 'secondary' | 'warn' | 'success' | 'secondary' {
    return (
      ({ DRAFT: 'secondary', FINALIZED: 'warn', PAID: 'success' } as any)[
        status
      ] ?? 'secondary'
    );
  }

  async finalizePayroll(row: PayrollRecord) {
    try {
      await this.serverApi.post(`/api/payroll/${row.id}/finalize`, {});
      this.toast('success', 'Finalized', 'Payroll finalized successfully');
      this.loadPayrolls();
    } catch (e: any) {
      this.toast('error', 'Error', e?.message);
    }
  }

  async markPaid(row: PayrollRecord) {
    try {
      await this.serverApi.post(`/api/payroll/${row.id}/mark-paid`, {});
      this.toast('success', 'Paid', 'Payroll marked as paid');
      this.loadPayrolls();
    } catch (e: any) {
      this.toast('error', 'Error', e?.message);
    }
  }

  async downloadPayslip(row: PayrollRecord) {
    await this.serverApi.downloadPayslip(row.id as any);
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  toggleBatch(batch: boolean) {
    this.isBatch = batch;
    this.generateResult = null;
    this.batchResult = null;
    if (batch) this.generateForm.get('employee')?.clearValidators();
    else this.generateForm.get('employee')?.setValidators(Validators.required);
    this.generateForm.get('employee')?.updateValueAndValidity();
  }

  async runGenerate() {
    this.generateForm.markAllAsTouched();
    if (this.generateForm.invalid) return;
    if (!this.isBatch && !this.generateForm.value.employee) {
      this.toast(
        'error',
        'Employee required',
        'Select an employee for single payroll generation'
      );
      return;
    }

    const { employee, monthYear } = this.generateForm.value;
    const month = (monthYear as Date).getMonth() + 1;
    const year = (monthYear as Date).getFullYear();

    this.generating = true;
    this.generateResult = null;
    this.batchResult = null;

    try {
      if (this.isBatch) {
        const r: any = await this.serverApi.post('/api/payroll/batch', {
          month,
          year,
        });
        this.batchResult = r;
        this.toast(
          'success',
          'Batch complete',
          `${r.succeeded} succeeded, ${r.failed} failed`
        );
      } else {
        const r: any = await this.serverApi.post('/api/payroll', {
          employeeId: employee.id,
          month,
          year,
        });
        this.generateResult = r;
        this.toast('success', 'Generated', 'Payroll record created');
      }
      this.loadPayrolls();
    } catch (e: any) {
      this.toast('error', 'Generation failed', e?.message ?? 'Unknown error');
    } finally {
      this.generating = false;
    }
  }

  resetGenerate() {
    this.generateForm.reset({ employee: null, monthYear: new Date() });
    this.generateResult = null;
    this.batchResult = null;
  }

  async searchGenerateEmployee(event: any) {
    try {
      const r: any = await this.serverApi.get(
        '/api/employees',
        { search: event.query, top: 10 },
        false
      );
      this.empSuggestions = r.content ?? [];
    } catch {
      this.empSuggestions = [];
    }
  }

  // ── Salary structures ─────────────────────────────────────────────────────

  async searchStructEmployee(event: any) {
    try {
      const r: any = await this.serverApi.get(
        '/api/employees',
        { search: event.query, top: 10 },
        false
      );
      this.structEmpSuggestions = r.content ?? [];
    } catch {
      this.structEmpSuggestions = [];
    }
  }

  async onStructEmployeeSelect() {
    if (!this.structEmployee?.id) {
      this.structures = [];
      return;
    }
    const r: any = await this.serverApi.get('/api/salary-structures', {
      employeeId: this.structEmployee.id,
    });
    this.structures = r.content;
  }

  openAddStructure() {
    this.structForm.reset({
      ctcAnnual: null,
      basicPct: 40,
      hraPct: 50,
      effectiveFrom: new Date(),
    });
    this.structDialogVisible = true;
  }

  async saveStructure() {
    this.structForm.markAllAsTouched();
    if (this.structForm.invalid || !this.structEmployee?.id) return;

    const { ctcAnnual, basicPct, hraPct, effectiveFrom } =
      this.structForm.value;
    const d = effectiveFrom as Date;
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    try {
      await this.serverApi.post('/api/salary-structures', {
        employeeId: this.structEmployee.id,
        ctcAnnual,
        basicPct,
        hraPct,
        effectiveFrom: isoDate,
      });
      this.toast('success', 'Created', 'Salary structure created');
      this.structDialogVisible = false;
      this.onStructEmployeeSelect();
    } catch (e: any) {
      this.toast('error', 'Error', e?.message);
    }
  }

  confirmDeleteStructure(event: Event, s: SalaryStructure) {
    this.confirmationService.confirm({
      target: event.currentTarget as HTMLElement,
      message: 'Delete this salary structure?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.serverApi.delete(`/api/salary-structures/${s.id}`);
          this.toast('success', 'Deleted', 'Structure removed');
          this.onStructEmployeeSelect();
        } catch (e: any) {
          this.toast('error', 'Error', e?.message);
        }
      },
    });
  }

  // ── Bank transfers ────────────────────────────────────────────────────────

  async loadTransfers() {
    try {
      const r: any = await this.serverApi.get('/api/payroll/bank-transfer');
      this.transfers = r.content;
    } catch {
      this.transfers = [];
    }
  }

  async createTransferBatch() {
    const month = this.transferMonth.getMonth() + 1;
    const year = this.transferMonth.getFullYear();
    try {
      const r: any = await this.serverApi.post('/api/payroll/bank-transfer', {
        month,
        year,
      });
      const count = r.batch?.items?.length ?? 0;
      const skipped = r.skipped?.length ?? 0;
      this.toast(
        'success',
        'Batch created',
        `${count} transfer(s) queued${skipped ? `, ${skipped} skipped (missing bank details)` : ''}`
      );
      this.loadTransfers();
    } catch (e: any) {
      this.toast('error', 'Error', e?.message);
    }
  }

  async downloadTransferCsv(batch: BankTransferBatch) {
    const label = `${MONTH_NAMES[batch.month - 1]}-${batch.year}`;
    await this.serverApi.downloadFile(
      `/api/payroll/bank-transfer/${batch.id}/download`,
      `neft-salary-${label}.csv`
    );
  }

  transferStatusSeverity(
    status: string
  ): 'secondary' | 'info' | 'success' | 'danger' {
    return (
      (
        {
          PENDING: 'secondary',
          SUBMITTED: 'info',
          CONFIRMED: 'success',
          FAILED: 'danger',
        } as any
      )[status] ?? 'secondary'
    );
  }

  // ── Components ────────────────────────────────────────────────────────────

  async loadComponents() {
    const r: any = await this.serverApi.get(
      '/api/payroll/components',
      this.payrollComponentsParams
    );
    this.payrollComponentsAll = r.content;
    this.payrollComponentsTotal = r.totalRecords;
  }

  pageComponentChange(event: any) {
    this.payrollComponentsParams.pageno = event.first;
    this.payrollComponentsParams.top = event.rows;
    this.loadComponents();
  }

  addNew() {
    this.componentDialog = true;
    this.isEditMode = false;
    this.editId = null;
    this.addComponentForm.reset();
  }

  hideDialog() {
    this.addComponentForm.reset();
    this.componentDialog = false;
  }

  onComponentEdit(c: any) {
    this.componentDialog = true;
    this.isEditMode = true;
    this.editId = c.id;
    this.addComponentForm.patchValue({
      name: c.name,
      type: c.type,
      percent: c.percent,
      description: c.description,
    });
  }

  onComponentDelete(event: any, c: any) {
    if (!c?.id) return;
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: `Delete component "${c.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      accept: async () => {
        await this.serverApi.delete(`/api/payroll/components/${c.id}`);
        this.toast('success', 'Deleted', 'Component deleted');
        this.loadComponents();
      },
    });
  }

  async saveComponent() {
    this.addComponentForm.markAllAsTouched();
    if (!this.addComponentForm.valid) return;
    const { name, type, description, percent } = this.addComponentForm.value;
    if (!this.isEditMode) {
      await this.serverApi.post('/api/payroll/components', {
        name,
        type,
        percent,
        description,
      });
    } else {
      await this.serverApi.put(`/api/payroll/components/${this.editId}`, {
        name,
        type,
        percent,
        description,
      });
    }
    this.hideDialog();
    this.loadComponents();
  }

  // ── util ──────────────────────────────────────────────────────────────────

  private toast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}

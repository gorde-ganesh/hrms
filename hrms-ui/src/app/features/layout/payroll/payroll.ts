import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
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
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-payroll',
  imports: [
    CommonModule,
    SelectModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputText,
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
    CardModule,
    TooltipModule,
    ConfirmPopup,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll.html',
  styleUrl: './payroll.css',
})
export class Payroll implements OnInit {
  employees: any[] = [];
  netSalary: number = 0;

  payrolls: any[] = [];
  apiParams = { pageno: 1, top: 10 };
  totalRecords = 0;

  payrollComponentsAll: any[] = [];
  payrollComponentsApiParams = { pageno: 1, top: 10 };
  payrollComponentsTotalRecords = 0;

  options: any;

  componentDialog = false;
  isEditMode = false;
  editId: string | null = null;
  tabIndex = '0';
  addComponentForm!: FormGroup;
  generatePayrollForm!: FormGroup;

  calculatedComponents: any[] = [];
  monthlySalary: number = 0;
  grossSalary: number = 0;

  permissions: any;
  userInfo: any;

  readonly statusSeverityMap: Record<string, string> = {
    DRAFT: 'secondary',
    APPROVED: 'info',
    LOCKED: 'warn',
    PAID: 'success',
  };

  constructor(
    private serverApi: ApiService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private authState: AuthStateService
  ) {
    this.userInfo = this.authState.userInfo;
    this.permissions = this.userInfo?.permissions?.['payroll'];

    this.addComponentForm = fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      percent: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      description: [''],
    });

    this.generatePayrollForm = fb.group({
      employee: [null, Validators.required],
      month: [new Date(), Validators.required],
      year: [new Date(), Validators.required],
      lopDays: [0, [Validators.min(0), Validators.max(31)]],
    });
  }

  async ngOnInit() {
    this.options = await this.serverApi.get('/api/master-data');
    await this.loadPayrolls();
    if (this.hasPermission('generate')) {
      await Promise.all([this.loadPayrollComponents(), this.loadEmployees()]);
    }
  }

  async loadEmployees() {
    try {
      const response: any = await this.serverApi.get('/api/employees', {
        skip: 0,
        top: 1000,
      });
      this.employees = response.content || [];
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load employees' });
    }
  }

  async loadPayrolls() {
    try {
      const isHrOrAdmin = this.userInfo?.role === 'HR' || this.userInfo?.role === 'ADMIN';
      const params: any = { ...this.apiParams };
      // Employees are restricted server-side; HR/Admin can optionally filter
      if (!isHrOrAdmin) {
        params.employeeId = this.userInfo?.employeeId;
      }

      const payroll: any = await this.serverApi.get('/api/payroll', params);
      this.payrolls = (payroll.content ?? []).map((p: any) => ({
        ...p,
        date: new Date(p.year, p.month - 1, 1),
        netSalaryNum: Number(p.netSalary),
      }));
      this.totalRecords = payroll.totalRecords ?? 0;
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.message || 'Failed to load payroll records',
      });
    }
  }

  async loadPayrollComponents() {
    try {
      const components: any = await this.serverApi.get(
        '/api/payroll/components',
        this.payrollComponentsApiParams
      );
      this.payrollComponentsAll = components.content ?? [];
      this.payrollComponentsTotalRecords = components.totalRecords ?? 0;
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.message || 'Failed to load components',
      });
    }
  }

  async onPayrollDownload(pay: any) {
    try {
      await this.serverApi.downloadPayslip(pay.id);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Download failed' });
    }
  }

  pageChange(event: any) {
    this.apiParams.pageno = Math.floor(event.first / event.rows) + 1;
    this.apiParams.top = event.rows;
    this.loadPayrolls();
  }

  pageComponentChange(event: any) {
    this.payrollComponentsApiParams.pageno = Math.floor(event.first / event.rows) + 1;
    this.payrollComponentsApiParams.top = event.rows;
    this.loadPayrollComponents();
  }

  onComponentEdit(component: any) {
    this.componentDialog = true;
    this.isEditMode = true;
    this.editId = component.id;
    this.addComponentForm.patchValue({
      name: component.name,
      type: component.type,
      percent: component.percent != null ? Number(component.percent) : null,
      description: component.description ?? '',
    });
  }

  onComponentDelete(event: any, component: any) {
    if (!component?.id) return;
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: 'Deactivate this component? Historical payslips are unaffected.',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      accept: async () => {
        try {
          await this.serverApi.delete(`/api/payroll/components/${component.id}`);
          this.messageService.add({ severity: 'success', summary: 'Deactivated', detail: 'Component deactivated', life: 3000 });
          await this.loadPayrollComponents();
        } catch (error: any) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to deactivate' });
        }
      },
      reject: () => {},
    });
  }

  addNew() {
    this.isEditMode = false;
    this.editId = null;
    this.addComponentForm.reset({ name: '', type: '', percent: null, description: '' });
    this.componentDialog = true;
  }

  hideDialog() {
    this.addComponentForm.reset();
    this.componentDialog = false;
    this.isEditMode = false;
    this.editId = null;
  }

  async saveComponent() {
    this.addComponentForm.markAllAsTouched();
    if (!this.addComponentForm.valid) return;

    const { name, type, description, percent } = this.addComponentForm.value;

    try {
      if (!this.isEditMode) {
        await this.serverApi.post('/api/payroll/components', { name, type, percent: Number(percent), description });
        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Component created', life: 3000 });
      } else {
        await this.serverApi.put(`/api/payroll/components/${this.editId}`, { name, type, percent: Number(percent), description });
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Component updated', life: 3000 });
      }
      this.hideDialog();
      await this.loadPayrollComponents();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Save failed' });
    }
  }

  async onEmployeeChange() {
    const employee = this.generatePayrollForm.get('employee')?.value;

    if (!employee) {
      this.calculatedComponents = [];
      this.netSalary = 0;
      this.grossSalary = 0;
      this.monthlySalary = 0;
      return;
    }

    if (!employee.salary) {
      this.messageService.add({
        severity: 'error',
        summary: 'No Salary',
        detail: 'Selected employee does not have an annual CTC configured',
      });
      this.calculatedComponents = [];
      return;
    }

    this.monthlySalary = Number(employee.salary) / 12;
    await this.recalculateComponents();
  }

  async onLopDaysChange() {
    if (this.generatePayrollForm.get('employee')?.value) {
      await this.recalculateComponents();
    }
  }

  private async recalculateComponents() {
    const formValue = this.generatePayrollForm.value;
    if (!formValue.employee) return;

    const month = formValue.month instanceof Date ? formValue.month.getMonth() + 1 : formValue.month;
    const year = formValue.year instanceof Date ? formValue.year.getFullYear() : formValue.year;
    const lopDays = formValue.lopDays ?? 0;

    try {
      const calc: any = await this.serverApi.get(
        `/api/payroll/components/${formValue.employee.id}`,
        { month, year, lopDays }
      );

      this.calculatedComponents = calc.components ?? [];
      this.grossSalary = Number(calc.grossSalary ?? 0);
      this.netSalary = Number(calc.netSalary ?? 0);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.message || 'Failed to calculate components',
      });
    }
  }

  async generatePayroll() {
    this.generatePayrollForm.markAllAsTouched();
    if (!this.generatePayrollForm.valid) {
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: 'Please fill all required fields' });
      return;
    }

    if (this.calculatedComponents.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No Components', detail: 'No active payroll components found. Configure components first.' });
      return;
    }

    const formValue = this.generatePayrollForm.value;
    const month = formValue.month instanceof Date ? formValue.month.getMonth() + 1 : formValue.month;
    const year = formValue.year instanceof Date ? formValue.year.getFullYear() : formValue.year;

    try {
      await this.serverApi.post('/api/payroll', {
        employeeId: formValue.employee.id,
        month,
        year,
        lopDays: formValue.lopDays ?? 0,
      });

      this.messageService.add({ severity: 'success', summary: 'Draft Created', detail: 'Payroll generated in DRAFT state. An HR Admin must approve it.' });
      this.resetPayrollForm();
      await this.loadPayrolls();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to generate payroll' });
    }
  }

  resetPayrollForm() {
    this.generatePayrollForm.reset({ employee: null, month: new Date(), year: new Date(), lopDays: 0 });
    this.calculatedComponents = [];
    this.netSalary = 0;
    this.grossSalary = 0;
    this.monthlySalary = 0;
  }

  getStatusSeverity(status: string): string {
    return this.statusSeverityMap[status] ?? 'secondary';
  }

  hasPermission(action: string): boolean {
    return this.permissions?.includes(action) ?? false;
  }
}

import { Component } from '@angular/core';
import { ApiService } from '../../../services/api-interface.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import {
  FormArray,
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
import { TagModule } from 'primeng/tag';
import { StatusPipe } from '../../../pipes/status.pipe';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-payroll',
  imports: [
    CommonModule,
    SelectModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    ReactiveFormsModule,
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
  ],
  providers: [MessageService],
  templateUrl: './payroll.html',
  styleUrl: './payroll.css',
})
export class Payroll {
  employees: any[] = [];
  payrollComponents: any[] = [];
  selectedEmployee: any = null;
  netSalary: number = 0;
  payrollForm!: FormGroup;

  payrolls: any[] = [];
  apiParams = { pageno: 0, top: 10 };
  totalRecords = 0;

  payrollComponentsAll: any[] = [];
  payrollComponentsApiParams = { pageno: 0, top: 10 };
  payrollComponentsTotalRecords = 0;

  options: any;

  componentDialog = false;
  tabIndex = '0';
  addComponentForm!: FormGroup;
  generatePayrollForm!: FormGroup;

  // Payroll generation
  selectedMonth: Date = new Date();
  selectedYear: Date = new Date();
  calculatedComponents: any[] = [];
  monthlySalary: number = 0;

  permissions = JSON.parse(sessionStorage.getItem('userInfo') as string)
    .permissions['payroll'];
  userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);

  constructor(
    private serverApi: ApiService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.addComponentForm = fb.group({
      name: ['', Validators.required],
      type: ['', [Validators.required]],
      percent: [''],
      description: [''],
    });

    this.generatePayrollForm = fb.group({
      employee: [null, Validators.required],
      month: [new Date(), Validators.required],
      year: [new Date(), Validators.required],
    });
  }

  async ngOnInit() {
    this.options = await this.serverApi.get('/api/master-data');

    this.loadPayrolls();
    if (this.hasPermission('generate')) {
      this.loadPayrollComponents();
      this.loadEmployees();
    }
  }

  async loadEmployees() {
    try {
      const response: any = await this.serverApi.get('/api/employees', {
        skip: 0,
        top: 1000,
      });
      this.employees = response.content || [];
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }

  get components(): FormArray {
    return this.payrollForm.get('components') as FormArray;
  }

  async loadPayrolls() {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    const payroll: any = await this.serverApi.get(
      `/api/payroll?employeeId=${userInfo.employeeId}`,
      this.apiParams
    );
    this.payrolls = payroll.content.map((p: any) => ({
      ...p,
      date: new Date(p.year, p.month - 1, 1), // first day of the month
    }));

    this.totalRecords = payroll.totalRecords;
  }

  async loadPayrollComponents() {
    const components: any = await this.serverApi.get(
      `/api/payroll/components`,
      this.payrollComponentsApiParams
    );

    this.payrollComponentsAll = components.content;
    this.payrollComponentsTotalRecords = components.totalRecords;
  }

  async onPayrollDownload(pay: any) {
    const payId = pay.id;

    await this.serverApi.downloadPayslip(payId);
  }

  pageChange(event: any) {
    this.apiParams.pageno = event.first;
    this.apiParams.top = event.rows;
    this.loadPayrolls();
  }

  pageComponentChange(event: any) {
    this.payrollComponentsApiParams.pageno = event.first;
    this.payrollComponentsApiParams.top = event.rows;
    this.loadPayrollComponents();
  }

  isEditMode = false;
  editId = null;
  onComponentEdit(component: any) {
    this.componentDialog = true;
    this.isEditMode = true;
    this.editId = component.id;
    this.addComponentForm.patchValue({
      name: component.name,
      type: component.type,
      percent: component.percent,
      description: component.description,
    });
  }

  onComponentDelete(event: any, component: any) {
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: 'Are you sure you want to proceed?',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Save',
      },
      accept: () => {
        this.serverApi.delete(`/api/payroll/components/${component.id}`);
      },
      reject: () => {},
    });
    if (!component?.id) return;
  }

  addNew() {
    this.componentDialog = true;
  }

  hideDialog() {
    this.addComponentForm.reset();
    this.componentDialog = false;
  }

  async saveComponent() {
    this.addComponentForm.markAllAsTouched();
    if (!this.addComponentForm.valid) return;

    const { name, type, description, percent } = this.addComponentForm.value;

    if (!this.isEditMode)
      await this.serverApi.post('/api/payroll/components', {
        name,
        type,
        percent,
        description,
      });
    else
      await this.serverApi.put(`/api/payroll/components/${this.editId}`, {
        name,
        type,
        percent,
        description,
      });

    this.hideDialog();
    this.loadPayrollComponents();
  }

  async onEmployeeChange() {
    if (!this.generatePayrollForm.get('employee')?.value) {
      this.calculatedComponents = [];
      this.netSalary = 0;
      this.monthlySalary = 0;
      return;
    }

    const employee = this.generatePayrollForm.get('employee')?.value;

    if (!employee.salary) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Selected employee does not have a salary configured',
      });
      return;
    }

    // Calculate monthly salary from annual CTC
    this.monthlySalary = employee.salary / 12;

    // Load payroll components and calculate amounts
    try {
      const components: any = await this.serverApi.get(
        `/api/payroll/components/${employee.id}`
      );

      this.calculatedComponents = components.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        amount: comp.amount,
      }));

      // Calculate net salary
      this.netSalary = this.calculatedComponents.reduce((sum, comp) => {
        if (comp.type === 'ALLOWANCE') {
          return sum + comp.amount;
        } else if (comp.type === 'DEDUCTION') {
          return sum - comp.amount;
        }
        return sum;
      }, 0);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load payroll components',
      });
    }
  }

  async generatePayroll() {
    this.generatePayrollForm.markAllAsTouched();
    if (!this.generatePayrollForm.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill all required fields',
      });
      return;
    }

    if (this.calculatedComponents.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No payroll components found for this employee',
      });
      return;
    }

    const formValue = this.generatePayrollForm.value;
    const month = formValue.month.getMonth() + 1;
    const year = formValue.year.getFullYear();

    try {
      await this.serverApi.post('/api/payroll', {
        employeeId: formValue.employee.id,
        month,
        year,
        components: this.calculatedComponents.map((comp) => ({
          componentTypeId: comp.id,
          percent: (comp.amount / this.monthlySalary) * 100,
        })),
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Payroll generated successfully',
      });

      // Reset form and reload payrolls
      this.generatePayrollForm.reset({
        employee: null,
        month: new Date(),
        year: new Date(),
      });
      this.calculatedComponents = [];
      this.netSalary = 0;
      this.monthlySalary = 0;
      this.loadPayrolls();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to generate payroll',
      });
    }
  }

  resetPayrollForm() {
    this.generatePayrollForm.reset({
      employee: null,
      month: new Date(),
      year: new Date(),
    });
    this.calculatedComponents = [];
    this.netSalary = 0;
    this.monthlySalary = 0;
  }

  hasPermission(action: string) {
    return this.permissions.includes(action);
  }
}

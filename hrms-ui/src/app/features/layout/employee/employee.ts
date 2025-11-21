import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../../services/api-interface.service';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormErrorDirective } from '../../../directives/form-error.directive';
import { StepperModule } from 'primeng/stepper';
import { ValidationService } from '../../../services/validation.service';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-employee',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    DialogModule,
    FloatLabel,
    SelectModule,
    MessageModule,
    DatePickerModule,
    InputNumberModule,
    StepperModule,
    PasswordModule,
    DividerModule,
  ],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
  standalone: true,
})
export class Employee implements OnInit {
  employees: any[] = [];
  totalRecords = 0;
  searchControl = new FormControl('');
  apiParams: any = { pageno: 0, top: 10 };
  filterParams: Record<string, any> = {};
  addEmployeeDialog = false;
  generatePayrollDialog = false;
  editEmployeeDialog = false;
  addEmployeeForm!: FormGroup;
  registerUserForm!: FormGroup;
  filterForm!: FormGroup;
  payrollForm!: FormGroup;
  options: any;
  activeStep: number = 1;
  lastEmployeeCode = '';
  editingEmployeeId: string | null = null;
  constructor(
    private fb: FormBuilder,
    private serverApi: ApiService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private validationService: ValidationService
  ) {
    this.registerUserForm = fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, validationService.passwordValidator],
      ],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      country: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      role: ['', [Validators.required]],
    });

    this.filterForm = fb.group({
      departmentId: [''],
      status: [''],
      designationId: [''],
    });

    this.addEmployeeForm = fb.group({
      employeeCode: ['', [Validators.required]],
      departmentId: ['', [Validators.required]],
      designationId: ['', [Validators.required]],
      joiningDate: ['', [Validators.required]],
      salary: ['', [Validators.required]],
      managerId: ['', [Validators.required]],
      dob: [''],
      personalEmail: ['', [Validators.email]],
      bloodGroup: [''],
      emergencyContactPerson: [''],
      emergencyContactNumber: [''],
    });
    this.addEmployeeForm.get('managerId')?.disable();
    this.addEmployeeForm
      .get('managerId')
      ?.removeValidators([Validators.required]);

    this.payrollForm = fb.group({
      date: ['', [Validators.required]],
      components: this.fb.array([]),
    });

    this.registerUserForm.valueChanges
      .pipe(debounceTime(600))
      .subscribe((value) => {
        if (value && value.role === 'EMPLOYEE') {
          this.addEmployeeForm
            .get('managerId')
            ?.setValidators([Validators.required]);
          this.addEmployeeForm.get('managerId')?.enable();
          this.addEmployeeForm.get('managerId')?.updateValueAndValidity();
        } else {
          this.addEmployeeForm
            .get('managerId')
            ?.removeValidators([Validators.required]);
          this.addEmployeeForm.get('managerId')?.disable();

          this.addEmployeeForm.get('managerId')?.updateValueAndValidity();
        }
      });
  }

  employeeSummary: any = {
    totalEmployees: 0,
    activeEmployees: 0,
    newEmployees: 0,
    totalDepartments: 0,
  };

  async ngOnInit() {
    this.loadEmployees();
    this.loadEmployeeSummary();
    const deparment: any = await this.serverApi.get('/api/master-data');
    this.options = deparment;

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        if (value) {
          this.filterParams['search'] = value;
        } else {
          delete this.filterParams['search'];
        }
        this.loadEmployees({ pageno: 0 });
      });
  }

  async loadEmployeeSummary() {
    const summary: any = await this.serverApi.get('/api/employees/summary');
    this.employeeSummary = summary;

    this.cdr.detectChanges();
  }

  private buildRequestParams(extra: any = {}) {
    return {
      ...this.apiParams,
      ...this.filterParams,
      ...extra,
    };
  }

  async loadEmployees(extraParams: any = {}) {
    const params = this.buildRequestParams(extraParams);
    const employee: any = await this.serverApi.get('/api/employees', params);
    this.employees = employee?.content || [];
    this.totalRecords = employee?.totalRecords || 0;
    this.apiParams.pageno = params.pageno ?? this.apiParams.pageno;
    this.apiParams.top = params.top ?? this.apiParams.top;
    this.cdr.detectChanges();
  }

  pageChange(event: any) {
    this.loadEmployees({ pageno: event.first, top: event.rows });
  }

  applyFilter() {
    const filters = Object.entries(this.filterForm.value).reduce(
      (acc: Record<string, any>, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      },
      {}
    );
    this.filterParams = filters;
    this.loadEmployees({ pageno: 0 });
  }

  clearFilter() {
    this.filterForm.reset();
    this.filterParams = {};
    this.searchControl.setValue('', { emitEvent: false });
    this.loadEmployees({ pageno: 0 });
  }

  viewEmployeeDialog = false;
  viewEmployeeDetails: any = null;

  onView(employee: any) {
    this.viewEmployeeDetails = employee;
    this.viewEmployeeDialog = true;
  }

  async onDelete(event: Event, employee: any) {
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
      accept: async () => {
        //delete
        const deletedEmployee: any = await this.serverApi.delete(
          `/api/employees/${employee.id}`
        );
        this.messageService.add({
          severity: 'info',
          summary: 'Confirmed',
          detail: deletedEmployee.message,
          life: 3000,
        });
        this.loadEmployees();
      },
      reject: () => {
        // nothing
      },
    });
  }

  async onEdit(employee: any) {
    const employeeDetails: any = await this.serverApi.get(
      `/api/employees/${employee.id}`
    );
    this.editingEmployeeId = employee.id;

    const role = employee.user.role;
    console.log(employee);
    if (role && role === 'EMPLOYEE') {
      this.addEmployeeForm
        .get('managerId')
        ?.setValidators([Validators.required]);
      this.addEmployeeForm.get('managerId')?.enable();
      this.addEmployeeForm.get('managerId')?.updateValueAndValidity();
    } else {
      this.addEmployeeForm
        .get('managerId')
        ?.removeValidators([Validators.required]);
      this.addEmployeeForm.get('managerId')?.disable();

      this.addEmployeeForm.get('managerId')?.updateValueAndValidity();
    }

    this.addEmployeeForm.controls['employeeCode'].disable();

    this.addEmployeeForm.patchValue({
      employeeCode: employeeDetails.employeeCode,
      managerId: employeeDetails.managerId,
      dob: new Date(employeeDetails.dob),
      personalEmail: employeeDetails.personalEmail,
      bloodGroup: employeeDetails.bloodGroup,
      emergencyContactPerson: employeeDetails.emergencyContactPerson,
      emergencyContactNumber: employeeDetails.emergencyContactNumber,
      departmentId: employeeDetails.departmentId,
      designationId: employeeDetails.designationId,
      joiningDate: new Date(employeeDetails.joiningDate),
      salary: employeeDetails.salary,
    });

    this.editEmployeeDialog = true;
  }

  async onAddEmploeeDialog() {
    this.addEmployeeDialog = true;
    this.lastEmployeeCode = await this.serverApi.get(
      '/api/employees/last-employee-code'
    );
  }

  async onRegisterUser() {
    this.registerUserForm.markAllAsTouched();
    if (!this.registerUserForm.valid) return;
    this.activeStep = 2;
  }

  async onAddEmployee() {
    this.addEmployeeForm.markAllAsTouched();
    if (!this.addEmployeeForm.valid) return;

    await this.serverApi.post('/api/auth/register', {
      ...this.registerUserForm.value,
      ...this.addEmployeeForm.value,
    });
    this.registerUserForm.reset();
    this.addEmployeeForm.reset();
    this.addEmployeeForm.get('employeeCode')?.enable();
    this.addEmployeeDialog = false;
    this.activeStep = 1;
    this.messageService.add({
      severity: 'success',
      summary: 'Employee created',
      detail: 'Employee registered successfully',
    });

    this.loadEmployees();
  }

  async onEditEmployee() {
    this.addEmployeeForm.markAllAsTouched();
    if (!this.addEmployeeForm.valid) return;
    if (!this.editingEmployeeId) return;

    const payload = this.addEmployeeForm.getRawValue();
    await this.serverApi.put(
      `/api/employees/${this.editingEmployeeId}`,
      payload
    );
    this.addEmployeeForm.reset();
    this.addEmployeeForm.get('employeeCode')?.enable();
    this.editEmployeeDialog = false;
    this.editingEmployeeId = null;
    this.messageService.add({
      severity: 'success',
      summary: 'Employee updated',
      detail: 'Employee details saved successfully',
    });

    this.loadEmployees();
  }

  get components(): FormArray {
    return this.payrollForm.get('components') as FormArray;
  }

  payrollComponents: any[] = [];
  selectedEmployee: number | undefined;
  netSalary: number | null = null;
  async onGeneratePayroll(employee: any) {
    const employeeId = employee.id;
    const components: any = await this.serverApi.get(
      `/api/payroll/components/${employeeId}`
    );

    this.selectedEmployee = employeeId;
    this.payrollComponents = components;
    this.components.clear();
    components?.forEach((comp: any) => {
      this.components.push(
        this.fb.group({
          name: [comp.name],
          type: [comp.type],
          amount: [comp.amount],
        })
      );
    });
    this.generatePayrollDialog = true;
    this.calculateNetSalary();
  }

  calculateNetSalary() {
    let total = 0;
    this.components.value.forEach((comp: any) => {
      if (comp.type === 'ALLOWANCE') total += comp.amount;
      if (comp.type === 'DEDUCTION') total -= comp.amount;
    });
    this.netSalary = total;
  }

  async generatePayroll() {
    const components = this.payrollComponents.map((c) => ({
      componentTypeId: c.id,
      amount: c.amount,
    }));
    const date = this.payrollForm.get('date')?.value;
    const salary: any = await this.serverApi.post('/api/payroll', {
      employeeId: this.selectedEmployee,
      month: date ? new Date(date).getMonth() + 1 : null,
      year: date ? new Date(date).getFullYear() : null,
      components,
    });

    this.netSalary = salary.netSalary;

    this.payrollForm.reset();
    this.generatePayrollDialog = false;
  }
}

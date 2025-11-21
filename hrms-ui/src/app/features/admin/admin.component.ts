import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Role } from '../../models/global';
import { AdminService, GroupedPermissions } from '../../services/admin.service';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TabsModule,
    ButtonModule,
    TableModule,
    CardModule,
    TagModule,
    SelectModule,
    DialogModule,
    CheckboxModule,
    InputTextModule,
    TextareaModule,
  ],
  standalone: true,
})
export class Admin implements OnInit {
  // Permissions data

  usersLoading: boolean = false;
  users: any[] = [];
  rolesLoading: boolean = false;
  roles: any[] = [];
  permissionsLoading: boolean = false;
  permissions: any[] = [];
  groupedPermissions: GroupedPermissions = {};
  resources: string[] = [];

  // Role dialog
  showRoleDialog = false;
  editingRole: any | null = null;
  roleName = '';
  roleDescription = '';
  selectedPermissions: Set<string> = new Set();

  // Department data
  departments: any[] = [];
  departmentsLoading = false;
  showDepartmentDialog = false;
  departmentForm: FormGroup;
  editingDepartmentId: string | null = null;

  // Designation data
  designations: any[] = [];
  designationsLoading = false;
  showDesignationDialog = false;
  designationForm: FormGroup;
  editingDesignationId: string | null = null;

  constructor(
    private adminService: AdminService,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.departmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(250)]],
    });

    this.designationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      classification: ['', [Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(250)]],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadPermissions();
    this.loadDepartments();
    this.loadDesignations();
  }

  // ==================== Users Management ====================

  loadUsers() {
    this.usersLoading = true;
    this.adminService.getUsers().subscribe({
      next: (users: any[]) => {
        this.users = users;
        this.usersLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load users',
        });
        this.usersLoading = false;
      },
    });
  }

  updateUserRole(user: any, roleId: string) {
    if (!roleId) return;
    this.adminService.updateUserRole(user.id, roleId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User role updated successfully',
        });
        this.loadUsers();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update user role',
        });
      },
    });
  }

  getRoleSeverity(
    role: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severityMap: Record<
      string,
      'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'
    > = {
      ADMIN: 'danger',
      HR: 'info',
      MANAGER: 'warn',
      EMPLOYEE: 'success',
    };
    return severityMap[role] || 'secondary';
  }

  // ==================== Roles Management ====================

  loadRoles() {
    this.rolesLoading = true;
    this.adminService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.rolesLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load roles',
        });
        this.rolesLoading = false;
      },
    });
  }

  openCreateRoleDialog() {
    this.editingRole = null;
    this.roleName = '';
    this.roleDescription = '';
    this.selectedPermissions.clear();
    this.showRoleDialog = true;
  }

  openEditRoleDialog(role: any) {
    this.editingRole = role;
    this.roleName = role.name;
    this.roleDescription = role.description || '';
    this.selectedPermissions.clear();
    role.permissions.forEach((p: any) => this.selectedPermissions.add(p.id));
    this.showRoleDialog = true;
  }

  closeRoleDialog() {
    this.showRoleDialog = false;
  }

  togglePermission(permId: string) {
    if (this.selectedPermissions.has(permId)) {
      this.selectedPermissions.delete(permId);
    } else {
      this.selectedPermissions.add(permId);
    }
  }

  isPermissionSelected(permId: string): boolean {
    return this.selectedPermissions.has(permId);
  }

  saveRole() {
    if (!this.roleName.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Role name is required',
      });
      return;
    }

    const roleData = {
      name: this.roleName,
      description: this.roleDescription,
      permissionIds: Array.from(this.selectedPermissions),
    };

    if (this.editingRole) {
      this.adminService.updateRole(this.editingRole.id, roleData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Role updated successfully',
          });
          this.loadRoles();
          this.closeRoleDialog();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update role',
          });
        },
      });
    } else {
      this.adminService.createRole(roleData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Role created successfully',
          });
          this.loadRoles();
          this.closeRoleDialog();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create role',
          });
        },
      });
    }
  }

  deleteRole(role: any) {
    if (role.isSystem) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Cannot delete system roles',
      });
      return;
    }

    this.adminService.deleteRole(role.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Role deleted successfully',
        });
        this.loadRoles();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to delete role',
        });
      },
    });
  }

  // ==================== Permissions Management ====================

  loadPermissions() {
    this.adminService.getPermissions().subscribe({
      next: (data) => {
        this.groupedPermissions = data.groupedPermissions;
        this.resources = Object.keys(this.groupedPermissions);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load permissions',
        });
      },
    });
  }

  // ==================== Department Management ====================

  loadDepartments() {
    this.departmentsLoading = true;
    this.adminService.getDepartments({ page: 1, limit: 100 }).subscribe({
      next: (response) => {
        this.departments = response.content || response;
        this.departmentsLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load departments',
        });
        this.departmentsLoading = false;
      },
    });
  }

  openCreateDepartmentDialog() {
    this.editingDepartmentId = null;
    this.departmentForm.reset();
    this.showDepartmentDialog = true;
  }

  editDepartment(dept: any) {
    this.editingDepartmentId = dept.id;
    this.departmentForm.patchValue({
      name: dept.name,
      description: dept.description,
    });
    this.showDepartmentDialog = true;
  }

  saveDepartment() {
    this.departmentForm.markAllAsTouched();
    if (this.departmentForm.invalid) return;

    const payload = this.departmentForm.value;

    if (this.editingDepartmentId) {
      this.adminService
        .updateDepartment(this.editingDepartmentId, payload)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Department updated successfully',
            });
            this.showDepartmentDialog = false;
            this.loadDepartments();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update department',
            });
          },
        });
    } else {
      this.adminService.createDepartment(payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Department created successfully',
          });
          this.showDepartmentDialog = false;
          this.loadDepartments();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create department',
          });
        },
      });
    }
  }

  deleteDepartment(dept: any) {
    this.adminService.deleteDepartment(dept.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Department deleted successfully',
        });
        this.loadDepartments();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete department',
        });
      },
    });
  }

  // ==================== Designation Management ====================

  loadDesignations() {
    this.designationsLoading = true;
    this.adminService.getDesignations({ page: 1, limit: 100 }).subscribe({
      next: (response) => {
        this.designations = response.content || response;
        this.designationsLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load designations',
        });
        this.designationsLoading = false;
      },
    });
  }

  openCreateDesignationDialog() {
    this.editingDesignationId = null;
    this.designationForm.reset();
    this.showDesignationDialog = true;
  }

  editDesignation(desig: any) {
    this.editingDesignationId = desig.id;
    this.designationForm.patchValue({
      name: desig.name,
      classification: desig.classification,
      description: desig.description,
    });
    this.showDesignationDialog = true;
  }

  saveDesignation() {
    this.designationForm.markAllAsTouched();
    if (this.designationForm.invalid) return;

    const payload = this.designationForm.value;

    if (this.editingDesignationId) {
      this.adminService
        .updateDesignation(this.editingDesignationId, payload)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Designation updated successfully',
            });
            this.showDesignationDialog = false;
            this.loadDesignations();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update designation',
            });
          },
        });
    } else {
      this.adminService.createDesignation(payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Designation created successfully',
          });
          this.showDesignationDialog = false;
          this.loadDesignations();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create designation',
          });
        },
      });
    }
  }

  deleteDesignation(desig: any) {
    this.adminService.deleteDesignation(desig.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Designation deleted successfully',
        });
        this.loadDesignations();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete designation',
        });
      },
    });
  }
}

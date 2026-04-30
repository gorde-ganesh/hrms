import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Role } from '../../models/global';
import { AdminService, GroupedPermissions } from '../../services/admin.service';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    DialogModule,
    CheckboxModule,
    InputTextModule,
    TextareaModule,
    TooltipModule,
  ],
  standalone: true,
})
export class Admin implements OnInit {
  usersLoading = false;
  users: any[] = [];
  rolesLoading = false;
  roles: any[] = [];
  groupedPermissions: GroupedPermissions = {};
  resources: string[] = [];

  activeTab = '0';
  showRoleDialog = false;
  editingRole: any | null = null;
  roleName = '';
  roleDescription = '';
  selectedPermissions: Set<string> = new Set();

  constructor(
    private adminService: AdminService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadPermissions();
  }


  onTabChange(tabValue: string | number | undefined) {
    const nextTab = String(tabValue ?? '0');
    this.activeTab = nextTab;

    if (nextTab === '0' && this.users.length === 0 && !this.usersLoading) {
      this.loadUsers();
    }
  }

  // ===== Users =====

  loadUsers() {
    this.usersLoading = true;
    this.adminService.getUsers().subscribe({
      next: (users: any[]) => {
        this.users = users;
        this.usersLoading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users' });
        this.usersLoading = false;
      },
    });
  }

  updateUserRole(user: any, roleId: string) {
    if (!roleId) return;
    this.adminService.updateUserRole(user.id, roleId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User role updated' });
        this.loadUsers();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update user role' });
      },
    });
  }

  getRoleSeverity(role: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      ADMIN: 'danger',
      HR: 'info',
      MANAGER: 'warn',
      EMPLOYEE: 'success',
    };
    return map[role] || 'secondary';
  }

  // ===== Roles =====

  loadRoles() {
    this.rolesLoading = true;
    this.adminService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.rolesLoading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load roles' });
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
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Role name is required' });
      return;
    }

    const roleData = {
      name: this.roleName,
      description: this.roleDescription,
      permissionIds: Array.from(this.selectedPermissions),
    };

    const req = this.editingRole
      ? this.adminService.updateRole(this.editingRole.id, roleData)
      : this.adminService.createRole(roleData);

    req.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: this.editingRole ? 'Role updated' : 'Role created',
        });
        this.loadRoles();
        this.closeRoleDialog();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.editingRole ? 'Failed to update role' : 'Failed to create role',
        });
      },
    });
  }

  deleteRole(role: any) {
    if (role.isSystem) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Cannot delete system roles' });
      return;
    }

    this.adminService.deleteRole(role.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Role deleted' });
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

  // ===== Permissions =====

  loadPermissions() {
    this.adminService.getPermissions().subscribe({
      next: (data) => {
        this.groupedPermissions = data.groupedPermissions;
        this.resources = Object.keys(this.groupedPermissions);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load permissions' });
      },
    });
  }
}

import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { permissionGuard } from './guards/permission-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/layout/layout').then((m) => m.Layout),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/layout/dashboard/dashboard').then(
            (m) => m.Dashboard
          ),
      },
      {
        path: 'employees',
        canActivate: [permissionGuard],
        data: { permission: 'employees' },
        loadComponent: () =>
          import('./features/layout/employee/employee').then((m) => m.Employee),
      },
      {
        path: 'leaves',
        canActivate: [permissionGuard],
        data: { permission: 'leaves' },
        loadComponent: () =>
          import('./features/layout/leaves/leaves').then((m) => m.Leaves),
      },
      {
        path: 'payroll',
        canActivate: [permissionGuard],
        data: { permission: 'payroll' },
        loadComponent: () =>
          import('./features/layout/payroll/payroll').then((m) => m.Payroll),
      },
      {
        path: 'attendence',
        canActivate: [permissionGuard],
        data: { permission: 'attendence' },
        loadComponent: () =>
          import('./features/layout/attendence/attendence').then(
            (m) => m.Attendence
          ),
      },
      {
        path: 'performance',
        canActivate: [permissionGuard],
        data: { permission: 'performance' },
        loadComponent: () =>
          import('./features/layout/performance/performance').then(
            (m) => m.Performance
          ),
      },
      {
        path: 'department',
        canActivate: [permissionGuard],
        data: { permission: 'departments' },
        loadComponent: () =>
          import('./features/layout/department/department').then(
            (m) => m.Department
          ),
      },
      {
        path: 'designations',
        canActivate: [permissionGuard],
        data: { permission: 'designations' },
        loadComponent: () =>
          import('./features/layout/designations/designations').then(
            (m) => m.Designations
          ),
      },
      {
        path: 'chat',
        canActivate: [permissionGuard],
        data: { permission: 'chat' },
        loadComponent: () =>
          import('./features/layout/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'notifications',
        canActivate: [permissionGuard],
        data: { permission: 'notifications' },
        loadComponent: () =>
          import('./features/layout/notification/notification-page').then(
            (m) => m.NotificationPage
          ),
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.Admin),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' },
];

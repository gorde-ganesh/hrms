import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
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
        loadComponent: () =>
          import('./features/layout/employee/employee').then((m) => m.Employee),
      },
      {
        path: 'leaves',
        loadComponent: () =>
          import('./features/layout/leaves/leaves').then((m) => m.Leaves),
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./features/layout/payroll/payroll').then((m) => m.Payroll),
      },
      {
        path: 'attendence',
        loadComponent: () =>
          import('./features/layout/attendence/attendence').then(
            (m) => m.Attendence
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('./features/layout/performance/performance').then(
            (m) => m.Performance
          ),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/layout/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.Admin),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' },
];

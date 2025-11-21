import { SpinnerService } from './../../services/spinner.service';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { Ripple } from 'primeng/ripple';
import { PanelMenuModule } from 'primeng/panelmenu';
import { DividerModule } from 'primeng/divider';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { FormErrorDirective } from '../../directives/form-error.directive';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ValidationService } from '../../services/validation.service';
import { ApiService } from '../../services/api-interface.service';
import { filter, Observable } from 'rxjs';
import { ProgressBarModule } from 'primeng/progressbar';
import { Notifictaion } from './notifictaion/notifictaion';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterOutlet,
    PanelMenuModule,
    BadgeModule,
    AvatarModule,
    InputTextModule,
    Ripple,
    CommonModule,
    DividerModule,
    PopoverModule,
    ButtonModule,
    DrawerModule,
    TooltipModule,
    DialogModule,
    MessageModule,
    ProgressBarModule,
    FloatLabel,
    PasswordModule,
    Notifictaion,
    ToolbarModule,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  standalone: true,
})
export class Layout implements OnInit {
  items: MenuItem[] | undefined;
  isSettings: boolean = false;
  changePasswordDialog: boolean = false;
  userInfo!: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: Record<string, string[]>;
  };
  changePasswordForm!: FormGroup;
  loading$!: Observable<boolean>;
  activeRoute: string = '';
  userDetails: any = {};

  pageRouteMap: Record<string, MenuItem> = {
    dashboard: { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
    attendence: {
      label: 'Attendence',
      icon: 'pi pi-clock',
      route: '/attendence',
    },
    employees: { label: 'Employees', icon: 'pi pi-users', route: '/employees' },
    departments: {
      label: 'Departments',
      icon: 'pi pi-sitemap',
      route: '/department',
    },
    designations: {
      label: 'Designations',
      icon: 'pi pi-briefcase',
      route: '/designations',
    },
    payroll: { label: 'Payroll', icon: 'pi pi-money-bill', route: '/payroll' },
    leaves: { label: 'Leaves', icon: 'pi pi-calendar-times', route: '/leaves' },
    performance: {
      label: 'Performance',
      icon: 'pi pi-star',
      route: '/performance',
    },
    chat: {
      label: 'Chat',
      icon: 'pi pi-comments',
      route: '/chat',
    },
    notifications: {
      label: 'Notifications',
      icon: 'pi pi-bell',
      route: '/notifications',
    },
    reports: { label: 'Reports', icon: 'pi pi-chart-line', route: '/reports' },
    admin: { label: 'Admin', icon: 'pi pi-cog', route: '/admin' },
  };

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private validationService: ValidationService,
    private serverApi: ApiService,
    private spinnerService: SpinnerService
  ) {
    this.userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    this.changePasswordForm = this.fb.group(
      {
        oldPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [Validators.required, validationService.passwordValidator],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: [this.validationService.matchPasswords] }
    );
  }

  ngOnInit(): void {
    this.loading$ = this.spinnerService.getSpinnerState();

    const permissions = this.userInfo.permissions;
    this.items = this.buildMenu(permissions);
    this.loadDetails();

    this.activeRoute = this.router.url;
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.activeRoute = event.url;
      });
  }

  async loadDetails() {
    const details: any = await this.serverApi.get(
      `/api/users/${this.userInfo.id}`
    );

    const parts = details.name?.trim().split(' ');
    let initials = '';

    if (parts && parts.length > 1) {
      // First letter of first + last name
      initials =
        parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
    } else if (parts && parts.length === 1) {
      // Single name → use first two letters
      initials = parts[0].substring(0, 2).toUpperCase();
    }
    this.userDetails = { ...details, initials: initials };
    console.log(this.userDetails);
  }

  buildMenu(permissions: Record<string, string[]>): MenuItem[] {
    const menu: MenuItem[] = [];
    for (const page in permissions) {
      console.log(page, permissions[page]);
      if (permissions[page].includes('view') && this.pageRouteMap[page]) {
        menu.push(this.pageRouteMap[page]);
      }
    }

    // Manually add Admin for ADMIN role if not already present
    if (
      this.userInfo.role === 'ADMIN' &&
      !menu.find((m) => m.label === 'Admin')
    ) {
      menu.push(this.pageRouteMap['admin']);
    }

    return menu;
  }

  navigate(item: any) {
    this.router.navigate([item.route]);
  }

  onLogoutClick() {
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  onChangePasswordClick() {
    this.changePasswordDialog = true;
  }

  async onChangePassword() {
    this.changePasswordForm.markAllAsTouched();
    if (!this.changePasswordForm.valid) return;

    const { confirmPassword, oldPassword } = this.changePasswordForm.value;

    const passwordChanged = await this.serverApi.post(
      '/api/auth/change-password',
      {
        userId: this.userInfo.id,
        oldPassword,
        newPassword: confirmPassword,
      }
    );

    this.changePasswordForm.reset();
    this.changePasswordDialog = false;
  }

  toggleDarkMode() {
    const element = document.querySelector('html');
    if (element) {
      element.classList.toggle('my-app-dark');
    }
  }
}

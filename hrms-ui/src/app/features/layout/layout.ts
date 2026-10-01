import { SpinnerService } from './../../services/spinner.service';
import {
  Component,
  HostListener,
  Injector,
  afterNextRender,
  inject,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { Ripple } from 'primeng/ripple';
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
import { AuthStateService } from '../../services/auth-state.service';
import { NotificationService } from '../../services/notification.service';
import { Notification } from './notification/notification';
import { Icon } from '../../shared/icon';
import { Logo } from '../../shared/logo';

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterOutlet,
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
    Notification,
    Icon,
    Logo,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  standalone: true,
})
export class Layout implements OnInit {
  items: MenuItem[] | undefined;
  isSettings: boolean = false;
  changePasswordDialog: boolean = false;
  sidebarOpen = false;
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
  userDetails = signal<any>({});

  // Navigation is grouped by task so 11 flat links become 4 short lists
  private readonly navGroupDefs: { label: string; pages: string[] }[] = [
    { label: 'Workspace', pages: ['dashboard', 'chat', 'notifications'] },
    { label: 'People', pages: ['employees', 'departments', 'designations'] },
    { label: 'Time and pay', pages: ['attendence', 'leaves', 'payroll'] },
    { label: 'Growth', pages: ['performance'] },
    { label: 'System', pages: ['admin'] },
  ];
  navGroups: { label: string; items: MenuItem[] }[] = [];

  // Quick jump (Ctrl/Cmd+K)
  jumpOpen = signal(false);
  jumpQuery = signal('');
  jumpIndex = signal(0);
  jumpResults = computed(() => {
    const q = this.jumpQuery().trim().toLowerCase();
    const all = this.items ?? [];
    return q ? all.filter((i) => i.label?.toLowerCase().includes(q)) : all;
  });

  accountOpen = signal(false);
  private injector = inject(Injector);

  pageRouteMap: Record<string, MenuItem> = {
    dashboard: { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    attendence: {
      label: 'Attendance',
      icon: 'clock',
      route: '/attendence',
    },
    employees: { label: 'Employees', icon: 'users', route: '/employees' },
    departments: {
      label: 'Departments',
      icon: 'sitemap',
      route: '/department',
    },
    designations: {
      label: 'Designations',
      icon: 'briefcase',
      route: '/designations',
    },
    payroll: { label: 'Payroll', icon: 'banknote', route: '/payroll' },
    leaves: { label: 'Leaves', icon: 'calendar', route: '/leaves' },
    performance: {
      label: 'Performance',
      icon: 'trend',
      route: '/performance',
    },
    chat: {
      label: 'Chat',
      icon: 'chat',
      route: '/chat',
    },
    notifications: {
      label: 'Notifications',
      icon: 'bell',
      route: '/notifications',
    },
    admin: { label: 'Admin', icon: 'shield', route: '/admin' },
  };

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private validationService: ValidationService,
    private serverApi: ApiService,
    private spinnerService: SpinnerService,
    private authState: AuthStateService,
    private notificationService: NotificationService,
    private messageService: MessageService,
  ) {
    this.userInfo = this.authState.userInfo as any;
    this.changePasswordForm = this.fb.group(
      {
        oldPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [Validators.required, validationService.passwordValidator],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: [this.validationService.matchPasswords] },
    );
  }

  ngOnInit(): void {
    this.loading$ = this.spinnerService.getSpinnerState();

    const permissions = this.userInfo.permissions;
    this.items = this.buildMenu(permissions);
    this.navGroups = this.navGroupDefs
      .map((g) => ({
        label: g.label,
        items: (this.items ?? []).filter((i) =>
          g.pages.some((p) => this.pageRouteMap[p] === i),
        ),
      }))
      .filter((g) => g.items.length > 0);
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
      `/api/users/${this.userInfo.id}`,
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
    this.userDetails.set({ ...details, initials: initials });
  }

  buildMenu(permissions: Record<string, string[]>): MenuItem[] {
    const menu: MenuItem[] = [];
    for (const page in permissions) {
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

  get activePageLabel(): string {
    const found = this.items?.find(
      (i) =>
        i['route'] &&
        (this.activeRoute === i['route'] ||
          this.activeRoute.startsWith(i['route'] + '/')),
    );
    return found?.label || 'PeopleOS';
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  navigate(item: any) {
    this.router.navigate([item.route]);
    this.sidebarOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openJump();
    } else if (event.key === 'Escape') {
      this.jumpOpen.set(false);
      this.accountOpen.set(false);
    }
  }

  openJump() {
    this.jumpQuery.set('');
    this.jumpIndex.set(0);
    this.jumpOpen.set(true);
    // Focus once the palette input exists in the DOM
    afterNextRender(() => document.getElementById('jump-input')?.focus(), {
      injector: this.injector,
    });
  }

  onJumpKey(event: KeyboardEvent) {
    const count = this.jumpResults().length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.jumpIndex.set(count ? (this.jumpIndex() + 1) % count : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.jumpIndex.set(count ? (this.jumpIndex() - 1 + count) % count : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.jumpTo(this.jumpResults()[this.jumpIndex()]);
    }
  }

  onJumpInput(value: string) {
    this.jumpQuery.set(value);
    this.jumpIndex.set(0);
  }

  jumpTo(item?: MenuItem) {
    if (!item) return;
    this.jumpOpen.set(false);
    this.navigate(item);
  }

  onAccountChangePassword() {
    this.accountOpen.set(false);
    this.onChangePasswordClick();
  }

  onAccountSignOut() {
    this.accountOpen.set(false);
    this.onLogoutClick();
  }

  async onLogoutClick() {
    try {
      await this.serverApi.post('/api/auth/logout', {}, false);
    } finally {
      this.notificationService.disconnect();
      this.authState.clear();
      this.router.navigate(['/login']);
    }
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
      },
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Password changed',
      detail: 'Your password has been updated.',
    });
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

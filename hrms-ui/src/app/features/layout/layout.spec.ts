import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Layout } from './layout';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AuthStateService } from '../../services/auth-state.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

const mockUser = {
  id: 'test-id',
  name: 'Test User',
  email: 'test@test.com',
  role: 'EMPLOYEE',
  permissions: {},
  employeeId: 'emp-1',
};

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: { connect: () => {}, disconnect: () => {}, fetchNotifications: () => {}, markAsRead: () => {}, sendNotification: () => {}, notifications$: of([]) } },
        { provide: AuthStateService, useValue: { userInfo: mockUser, isLoggedIn: () => true, userInfo$: { subscribe: () => ({ unsubscribe: () => {} }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

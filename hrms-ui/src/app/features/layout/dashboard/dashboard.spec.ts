import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({})),
  post: jasmine.createSpy('post').and.returnValue(Promise.resolve({})),
};

const makeAuthState = (role: string) => ({
  userInfo: { employeeId: 'emp-1', role, name: 'Test User', permissions: {} },
  userInfo$: { subscribe: () => ({ unsubscribe: () => {} }) },
});

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  const createComponent = async (role = 'EMPLOYEE') => {
    mockApiService.get.calls.reset();
    await TestBed.configureTestingModule({
      imports: [Dashboard, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthStateService, useValue: makeAuthState(role) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('should create for EMPLOYEE role', async () => {
    await createComponent('EMPLOYEE');
    expect(component).toBeTruthy();
  });

  it('should create for ADMIN role', async () => {
    await createComponent('ADMIN');
    expect(component).toBeTruthy();
  });

  it('sets userInfo from authState on init', async () => {
    await createComponent('HR');
    expect(component.userInfo).toBeTruthy();
    expect(component.userInfo.role).toBe('HR');
  });
});

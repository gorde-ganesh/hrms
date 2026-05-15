import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Employee } from './employee';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ content: [], totalElements: 0 })),
  post: jasmine.createSpy('post').and.returnValue(Promise.resolve({})),
  put: jasmine.createSpy('put').and.returnValue(Promise.resolve({})),
  delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({})),
};

const mockAuthState = {
  userInfo: { employeeId: 'emp-1', role: 'HR', permissions: { employees: ['view', 'add', 'edit'] } },
  userInfo$: { subscribe: () => ({ unsubscribe: () => {} }) },
};

describe('Employee', () => {
  let component: Employee;
  let fixture: ComponentFixture<Employee>;

  beforeEach(async () => {
    mockApiService.get.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Employee, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthStateService, useValue: mockAuthState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Employee);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('employees list initialises as empty array', () => {
    expect(component.employees).toEqual([]);
  });
});

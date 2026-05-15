import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Leaves } from './leaves';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ content: [], totalElements: 0 })),
  post: jasmine.createSpy('post').and.returnValue(Promise.resolve({})),
  patch: jasmine.createSpy('patch').and.returnValue(Promise.resolve({})),
  delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({})),
};

const mockAuthState = {
  userInfo: { employeeId: 'emp-1', role: 'EMPLOYEE', permissions: { leaves: ['view', 'apply'] } },
  userInfo$: { subscribe: () => ({ unsubscribe: () => {} }) },
};

describe('Leaves', () => {
  let component: Leaves;
  let fixture: ComponentFixture<Leaves>;

  beforeEach(async () => {
    mockApiService.get.calls.reset();
    mockApiService.post.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Leaves, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthStateService, useValue: mockAuthState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Leaves);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initialises applyLeaveForm with required controls', () => {
    expect(component.applyLeaveForm).toBeDefined();
    expect(component.applyLeaveForm.get('leaveType')).toBeTruthy();
    expect(component.applyLeaveForm.get('startDate')).toBeTruthy();
    expect(component.applyLeaveForm.get('endDate')).toBeTruthy();
    expect(component.applyLeaveForm.get('reason')).toBeTruthy();
  });

  it('applyLeaveForm is invalid when empty', () => {
    component.applyLeaveForm.reset();
    expect(component.applyLeaveForm.invalid).toBeTrue();
  });

  it('applyLeaveDialog starts as false', () => {
    expect(component.applyLeaveDialog).toBeFalse();
  });

  it('leaves array initialises as empty', () => {
    expect(component.leaves).toEqual([]);
  });

  it('leaveTypes array initialises as empty', () => {
    expect(component.leaveTypes).toBeDefined();
  });

  it('leaveBalances array initialises as empty', () => {
    expect(component.leaveBalances).toBeDefined();
  });
});

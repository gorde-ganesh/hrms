import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Payroll } from './payroll';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { MessageService, ConfirmationService } from 'primeng/api';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ content: [], totalElements: 0 })),
  post: jasmine.createSpy('post').and.returnValue(Promise.resolve({})),
  patch: jasmine.createSpy('patch').and.returnValue(Promise.resolve({})),
  downloadPayslip: jasmine.createSpy('downloadPayslip').and.returnValue(Promise.resolve()),
};

const mockAuthState = {
  userInfo: { employeeId: 'emp-1', role: 'HR', permissions: { payroll: ['view', 'generate'] } },
  userInfo$: { subscribe: () => ({ unsubscribe: () => {} }) },
};

describe('Payroll', () => {
  let component: Payroll;
  let fixture: ComponentFixture<Payroll>;

  beforeEach(async () => {
    mockApiService.get.calls.reset();
    mockApiService.post.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Payroll, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthStateService, useValue: mockAuthState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Payroll);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('payrolls initialises as empty array', () => {
    expect(component.payrolls).toEqual([]);
  });

  it('downloadPayslip calls the api service', async () => {
    const row = { id: 'payroll-1', employeeId: 'emp-1', month: 1, year: 2026 } as any;
    await component.downloadPayslip(row);
    expect(mockApiService.downloadPayslip).toHaveBeenCalledWith('payroll-1');
  });
});

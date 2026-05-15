import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Attendence } from './attendence';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApiService } from '../../../services/api-interface.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { MessageService } from 'primeng/api';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ content: [], totalElements: 0 })),
  post: jasmine.createSpy('post').and.returnValue(Promise.resolve({})),
  put: jasmine.createSpy('put').and.returnValue(Promise.resolve({})),
};

const mockAuthState = {
  userInfo: { employeeId: 'emp-1', role: 'EMPLOYEE', name: 'Test User' },
  userInfo$: { subscribe: () => ({ unsubscribe: () => {} }) },
};

describe('Attendence', () => {
  let component: Attendence;
  let fixture: ComponentFixture<Attendence>;

  beforeEach(async () => {
    mockApiService.get.calls.reset();
    mockApiService.post.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Attendence, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        MessageService,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthStateService, useValue: mockAuthState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Attendence);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('openEditDialog sets selectedAttendance', () => {
    const record = {
      id: 'att-1',
      checkIn: new Date().toISOString(),
      checkOut: null,
      status: 'PRESENT',
      attendanceDate: new Date().toISOString(),
    };
    component.openEditDialog(record);
    expect(component.selectedAttendance).toEqual(record);
  });
});

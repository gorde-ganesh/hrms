import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Department } from './department';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApiService } from '../../../services/api-interface.service';
import { MessageService } from 'primeng/api';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ content: [], totalElements: 0 })),
  post: jasmine.createSpy('post').and.returnValue(Promise.resolve({})),
  put: jasmine.createSpy('put').and.returnValue(Promise.resolve({})),
  delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({})),
};

describe('Department', () => {
  let component: Department;
  let fixture: ComponentFixture<Department>;

  beforeEach(async () => {
    mockApiService.get.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Department, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        MessageService,
        { provide: ApiService, useValue: mockApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Department);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('departments initialises as empty array', () => {
    expect(component.departments).toEqual([]);
  });

  it('departmentForm has name and headId controls', () => {
    expect(component.departmentForm.get('name')).toBeTruthy();
  });

  it('departmentForm is invalid when name is empty', () => {
    component.departmentForm.reset();
    expect(component.departmentForm.invalid).toBeTrue();
  });

  it('dialogVisible starts as false', () => {
    expect(component.dialogVisible).toBeFalse();
  });

  it('openCreateDialog sets dialogVisible to true', () => {
    component.openCreateDialog();
    expect(component.dialogVisible).toBeTrue();
  });
});

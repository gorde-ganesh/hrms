import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Designations } from './designations';
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

describe('Designations Component', () => {
  let component: Designations;
  let fixture: ComponentFixture<Designations>;

  beforeEach(async () => {
    mockApiService.get.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Designations, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        MessageService,
        { provide: ApiService, useValue: mockApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Designations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('designations initialises as empty array', () => {
    expect(component.designations).toEqual([]);
  });

  it('designationForm has required controls', () => {
    expect(component.designationForm.get('title')).toBeTruthy();
  });

  it('designationForm is invalid when empty', () => {
    component.designationForm.reset();
    expect(component.designationForm.invalid).toBeTrue();
  });

  it('dialogVisible starts as false', () => {
    expect(component.dialogVisible).toBeFalse();
  });

  it('openAddDialog sets dialogVisible to true', () => {
    component.openAddDialog();
    expect(component.dialogVisible).toBeTrue();
  });
});

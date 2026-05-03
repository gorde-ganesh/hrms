import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Department } from './department';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Department', () => {
  let component: Department;
  let fixture: ComponentFixture<Department>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Department, NoopAnimationsModule],
      providers: [provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Department);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

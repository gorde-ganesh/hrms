import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Payroll } from './payroll';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Payroll', () => {
  let component: Payroll;
  let fixture: ComponentFixture<Payroll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Payroll, NoopAnimationsModule],
      providers: [provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Payroll);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

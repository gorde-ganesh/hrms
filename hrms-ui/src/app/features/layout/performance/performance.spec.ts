import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Performance } from './performance';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Performance', () => {
  let component: Performance;
  let fixture: ComponentFixture<Performance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Performance, NoopAnimationsModule],
      providers: [provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Performance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

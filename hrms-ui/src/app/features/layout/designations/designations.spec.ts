import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Designations } from './designations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Designations Component', () => {
  let component: Designations;
  let fixture: ComponentFixture<Designations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Designations, NoopAnimationsModule],
      providers: [provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Designations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

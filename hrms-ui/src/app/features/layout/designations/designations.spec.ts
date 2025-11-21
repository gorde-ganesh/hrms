import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Designations } from './designations';

describe('Designations Component', () => {
  let component: Designations;
  let fixture: ComponentFixture<Designations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Designations],
    }).compileComponents();

    fixture = TestBed.createComponent(Designations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});


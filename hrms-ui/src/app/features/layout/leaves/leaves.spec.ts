import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Leaves } from './leaves';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Leaves', () => {
  let component: Leaves;
  let fixture: ComponentFixture<Leaves>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Leaves, NoopAnimationsModule],
      providers: [provideHttpClientTesting(), MessageService, ConfirmationService],
    }).compileComponents();

    fixture = TestBed.createComponent(Leaves);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

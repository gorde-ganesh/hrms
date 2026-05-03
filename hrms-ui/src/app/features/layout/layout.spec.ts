import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Layout } from './layout';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: { connect: () => {}, disconnect: () => {}, notifications$: { subscribe: () => ({ unsubscribe: () => {} }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

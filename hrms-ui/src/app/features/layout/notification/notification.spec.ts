import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Notification } from './notification';
import { NotificationService } from '../../../services/notification.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('Notification', () => {
  let component: Notification;
  let fixture: ComponentFixture<Notification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notification, NoopAnimationsModule],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            connect: () => {},
            disconnect: () => {},
            fetchNotifications: () => {},
            markAsRead: () => {},
            sendNotification: () => {},
            notifications$: of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Notification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

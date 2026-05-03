import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';
import { ApiService } from './api-interface.service';
import { MessageService } from 'primeng/api';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve([])),
  patch: jasmine.createSpy('patch').and.returnValue(Promise.resolve({})),
};

const mockMessageService = {
  add: jasmine.createSpy('add'),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    mockApiService.get.calls.reset();
    mockApiService.patch.calls.reset();
    mockMessageService.add.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: ApiService, useValue: mockApiService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('notifications$ starts as empty array', (done) => {
    service.notifications$.subscribe((n) => {
      expect(n).toEqual([]);
      done();
    });
  });

  describe('fetchNotifications', () => {
    it('calls GET with the correct URL and updates notifications$', fakeAsync(() => {
      const items: Notification[] = [
        { id: 1, employeeId: 'emp-1', type: 'SYSTEM', message: 'Hello' },
      ];
      mockApiService.get.and.returnValue(Promise.resolve(items));

      let result: Notification[] = [];
      service.notifications$.subscribe((n) => (result = n));

      service.fetchNotifications('emp-1');
      tick();

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/notifications?employeeId=emp-1'
      );
      expect(result).toEqual(items);
    }));
  });

  describe('markAsRead', () => {
    it('calls PATCH with correct URL', fakeAsync(() => {
      mockApiService.patch.and.returnValue(Promise.resolve({}));
      service.markAsRead(42);
      tick();
      expect(mockApiService.patch).toHaveBeenCalledWith(
        '/api/notifications/42/read',
        {}
      );
    }));

    it('updates local read state on success', fakeAsync(() => {
      const notifications: Notification[] = [
        { id: 1, employeeId: 'emp-1', type: 'SYSTEM', message: 'A', read: false },
        { id: 2, employeeId: 'emp-1', type: 'SYSTEM', message: 'B', read: false },
      ];
      mockApiService.get.and.returnValue(Promise.resolve(notifications));
      service.fetchNotifications('emp-1');
      tick();

      mockApiService.patch.and.returnValue(Promise.resolve({}));
      service.markAsRead(1);
      tick();

      let result: Notification[] = [];
      service.notifications$.subscribe((n) => (result = n));
      expect(result.find((n) => n.id === 1)?.read).toBeTrue();
      expect(result.find((n) => n.id === 2)?.read).toBeFalse();
    }));

    it('silently ignores PATCH errors without throwing', fakeAsync(() => {
      mockApiService.patch.and.returnValue(Promise.reject(new Error('network')));
      expect(() => {
        service.markAsRead(99);
        tick();
      }).not.toThrow();
    }));
  });
});

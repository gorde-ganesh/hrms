import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';
import { ApiService } from './api-interface.service';
import { MessageService } from 'primeng/api';

const mockApiService = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ content: [] })),
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
        { id: 'n-1', employeeId: 'emp-1', type: 'SYSTEM', message: 'Hello' },
      ];
      mockApiService.get.and.returnValue(Promise.resolve({ content: items }));

      let result: Notification[] = [];
      service.notifications$.subscribe((n) => (result = n));

      service.fetchNotifications('emp-1');
      tick();

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/notifications?employeeId=emp-1&top=50'
      );
      expect(result).toEqual(items);
    }));

    it('falls back to an empty list when the response has no content', fakeAsync(() => {
      mockApiService.get.and.returnValue(Promise.resolve(null));

      let result: Notification[] = [{ id: 'x', employeeId: 'e', type: 'SYSTEM', message: 'm' }];
      service.notifications$.subscribe((n) => (result = n));

      service.fetchNotifications('emp-1');
      tick();

      expect(result).toEqual([]);
    }));
  });

  describe('markAsRead', () => {
    it('calls PATCH with correct URL', fakeAsync(() => {
      mockApiService.patch.and.returnValue(Promise.resolve({}));
      service.markAsRead('42');
      tick();
      expect(mockApiService.patch).toHaveBeenCalledWith(
        '/api/notifications/42/read',
        {}
      );
    }));

    it('updates local read state on success', fakeAsync(() => {
      const notifications: Notification[] = [
        { id: 'n-1', employeeId: 'emp-1', type: 'SYSTEM', message: 'A', readStatus: false },
        { id: 'n-2', employeeId: 'emp-1', type: 'SYSTEM', message: 'B', readStatus: false },
      ];
      mockApiService.get.and.returnValue(Promise.resolve({ content: notifications }));
      service.fetchNotifications('emp-1');
      tick();

      mockApiService.patch.and.returnValue(Promise.resolve({}));
      service.markAsRead('n-1');
      tick();

      let result: Notification[] = [];
      service.notifications$.subscribe((n) => (result = n));
      expect(result.find((n) => n.id === 'n-1')?.readStatus).toBeTrue();
      expect(result.find((n) => n.id === 'n-2')?.readStatus).toBeFalse();
    }));

    it('silently ignores PATCH errors without throwing', fakeAsync(() => {
      mockApiService.patch.and.returnValue(Promise.reject(new Error('network')));
      expect(() => {
        service.markAsRead('99');
        tick();
      }).not.toThrow();
    }));
  });

  describe('disconnect', () => {
    it('does not throw when no socket has been opened', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });
});

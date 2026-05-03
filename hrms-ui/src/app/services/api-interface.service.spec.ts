import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService } from './api-interface.service';
import { SpinnerService } from './spinner.service';
import { environment } from '../../environment/environment';

const mockSpinner = {
  show: jasmine.createSpy('show'),
  hide: jasmine.createSpy('hide'),
};

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    mockSpinner.show.calls.reset();
    mockSpinner.hide.calls.reset();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        { provide: SpinnerService, useValue: mockSpinner },
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // GET
  // ------------------------------------------------------------------
  describe('get()', () => {
    it('returns data on success', fakeAsync(async () => {
      const payload = [{ id: 1 }];
      const promise = service.get<typeof payload>('/api/test');

      const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
      req.flush({ success: true, data: payload, message: 'ok', statusCode: 200 });
      tick();

      const result = await promise;
      expect(result).toEqual(payload);
    }));

    it('shows and hides spinner', fakeAsync(async () => {
      const promise = service.get('/api/test');
      httpMock
        .expectOne(`${environment.apiUrl}/api/test`)
        .flush({ success: true, data: [], message: 'ok', statusCode: 200 });
      tick();
      await promise;
      expect(mockSpinner.show).toHaveBeenCalledTimes(1);
      expect(mockSpinner.hide).toHaveBeenCalledTimes(1);
    }));

    it('throws when success is false', fakeAsync(async () => {
      const promise = service.get('/api/test');
      httpMock
        .expectOne(`${environment.apiUrl}/api/test`)
        .flush({ success: false, data: null, message: 'Not found', statusCode: 404 });
      tick();
      await expectAsync(promise).toBeRejected();
    }));

    it('skips spinner when spinner=false', fakeAsync(async () => {
      const promise = service.get('/api/test', undefined, false);
      httpMock
        .expectOne(`${environment.apiUrl}/api/test`)
        .flush({ success: true, data: {}, message: 'ok', statusCode: 200 });
      tick();
      await promise;
      expect(mockSpinner.show).not.toHaveBeenCalled();
    }));
  });

  // ------------------------------------------------------------------
  // POST
  // ------------------------------------------------------------------
  describe('post()', () => {
    it('sends body and returns data', fakeAsync(async () => {
      const body = { name: 'Test' };
      const promise = service.post<{ id: number }>('/api/items', body);

      const req = httpMock.expectOne(`${environment.apiUrl}/api/items`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ success: true, data: { id: 1 }, message: 'created', statusCode: 200 });
      tick();

      const result = await promise;
      expect(result.id).toBe(1);
    }));
  });

  // ------------------------------------------------------------------
  // DELETE
  // ------------------------------------------------------------------
  describe('delete()', () => {
    it('returns null on empty response', fakeAsync(async () => {
      const promise = service.delete('/api/items/1');
      httpMock
        .expectOne(`${environment.apiUrl}/api/items/1`)
        .flush({ success: true, data: null, message: 'deleted', statusCode: 200 });
      tick();
      const result = await promise;
      expect(result).toBeNull();
    }));
  });
});

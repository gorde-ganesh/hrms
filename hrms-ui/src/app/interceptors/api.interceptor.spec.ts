import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { apiInterceptor } from './api.interceptor';
import { ErrorHandlerService } from '../services/error-handler.service';
import { AuthStateService } from '../services/auth-state.service';
import { environment } from '../../environment/environment';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthState: jasmine.SpyObj<AuthStateService>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthState = jasmine.createSpyObj('AuthStateService', ['clear', 'set', 'get']);
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handle']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: AuthStateService, useValue: mockAuthState },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds withCredentials to every request', fakeAsync(() => {
    http.get(`${environment.apiUrl}/api/test`).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/test`);
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
    tick();
  }));

  it('calls error handler on non-401 errors', fakeAsync(() => {
    http.get(`${environment.apiUrl}/api/test`).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiUrl}/api/test`).flush('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    tick();
    expect(mockErrorHandler.handle).toHaveBeenCalledTimes(1);
  }));

  it('navigates to /login if refresh fails on 401', fakeAsync(() => {
    http.get(`${environment.apiUrl}/api/data`).subscribe({ error: () => {} });

    httpMock.expectOne(`${environment.apiUrl}/api/data`).flush('Unauthorized', {
      status: 401,
      statusText: 'Unauthorized',
    });
    tick();

    const refreshReq = httpMock.expectOne(`${environment.apiUrl}/api/auth/refresh`);
    refreshReq.flush('Refresh failed', { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(mockAuthState.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));
});

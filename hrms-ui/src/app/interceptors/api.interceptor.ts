import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpClient,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../services/error-handler.service';
import { AuthStateService } from '../services/auth-state.service';
import { environment } from '../../environment/environment';

// The in-flight token refresh, shared by every request that gets a 401 while it runs.
let refresh$: Observable<unknown> | null = null;

export const apiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<any> => {
  const errorHandler = inject(ErrorHandlerService);
  const router = inject(Router);
  const http = inject(HttpClient);
  const authState = inject(AuthStateService);

  const modifiedReq = req.clone({ withCredentials: true });

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        refresh$ ??= http
          .post(`${environment.apiUrl}/api/auth/refresh`, {}, { withCredentials: true })
          .pipe(
            finalize(() => (refresh$ = null)),
            shareReplay(1)
          );

        return refresh$.pipe(
          // Only a failed refresh ends the session; a failed retry is reported to the caller.
          catchError((refreshError) => {
            authState.clear();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
          switchMap(() => next(modifiedReq))
        );
      }
      errorHandler.handle(error);
      return throwError(() => error);
    })
  );
};

import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpClient,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../services/error-handler.service';
import { environment } from '../../environment/environment';

let isRefreshing = false;

export const apiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<any> => {
  const errorHandler = inject(ErrorHandlerService);
  const router = inject(Router);
  const http = inject(HttpClient);

  const modifiedReq = req.clone({ withCredentials: true });

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/') && !isRefreshing) {
        isRefreshing = true;
        return from(
          http.post(`${environment.apiUrl}/api/auth/refresh`, {}, { withCredentials: true }).toPromise()
        ).pipe(
          switchMap(() => {
            isRefreshing = false;
            return next(modifiedReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            sessionStorage.clear();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      errorHandler.handle(error);
      return throwError(() => error);
    })
  );
};

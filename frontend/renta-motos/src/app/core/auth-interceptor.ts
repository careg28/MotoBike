import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const token = localStorage.getItem('feos_token');
  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthError = error.status === 401;
      const isAuthRoute = req.url.includes('/login') || req.url.includes('/logout');

      if (isAuthError && !isAuthRoute) {
        auth.clearSession();

        if (!router.url.startsWith('/login')) {
          router.navigateByUrl('/login');
        }
      }

      return throwError(() => error);
    })
  );
};

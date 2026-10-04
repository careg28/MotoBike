import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Auth } from '../auth';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(Auth);
  const hasToken = !!auth.token;

  if (!hasToken) {
    return router.createUrlTree(['/login']);
  }

  return auth.fetchMe().pipe(
    map(() => true),
    catchError(() => {
      auth.clearSession();
      return of(router.createUrlTree(['/login']) as boolean | UrlTree);
    })
  );
};

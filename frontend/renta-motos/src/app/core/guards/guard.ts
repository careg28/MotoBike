import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const hasToken = !!localStorage.getItem('feos_token');
  if (!hasToken) {
    router.navigateByUrl('/login');
    return false;
  }
  return true;
};
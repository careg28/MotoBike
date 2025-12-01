import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const hasToken = !!localStorage.getItem('feos_token');
  if (hasToken) {
    router.navigateByUrl('/admin/motos');
    return false;
  }
  return true;
};
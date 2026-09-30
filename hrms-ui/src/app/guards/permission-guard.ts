import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

/**
 * Route-level access check driven by route data:
 *   data: { permission: 'payroll' }  -> user needs 'view' on that permission key
 *   data: { roles: ['ADMIN'] }       -> user's role must be one of the listed roles
 * Users who fail the check are sent to /dashboard. The backend still enforces access;
 * this only stops users landing on pages they cannot use (e.g. by typing the URL).
 */
export const permissionGuard: CanActivateFn = (route) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  const user = authState.userInfo;
  const { permission, roles } = route.data as {
    permission?: string;
    roles?: string[];
  };

  const roleAllowed = !roles || (!!user?.role && roles.includes(user.role));
  const permissionAllowed =
    !permission || !!user?.permissions?.[permission]?.includes?.('view');

  return roleAllowed && permissionAllowed
    ? true
    : router.createUrlTree(['/dashboard']);
};

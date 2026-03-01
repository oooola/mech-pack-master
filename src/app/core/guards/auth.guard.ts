import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { GlobalService } from '@shared';

const PUBLIC_ROUTES = new Set(['/login', '/403', '/404', '/500']);

export const authGuard: CanActivateChildFn = (_route, state) => {
  const router = inject(Router);
  const globalService = inject(GlobalService);
  const currentPath = state.url.split('?')[0] || '/';

  if (PUBLIC_ROUTES.has(currentPath)) {
    return true;
  }

  const jwtStatus = globalService.getJwt();
  const hasValidJwt = jwtStatus !== 'NO-JWT-FOUND' && jwtStatus !== 'JWT-EXPIRED';

  return hasValidJwt ? true : router.createUrlTree(['/login']);
};

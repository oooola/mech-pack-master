import { Injectable, inject } from '@angular/core';
import { NgxPermissionsService, NgxRolesService } from '@shared/compat/permissions';
import { Menu, MenuService } from './menu.service';

const DEFAULT_MENU: Menu[] = [
  {
    route: 'dashboard',
    name: 'dashboard',
    type: 'link',
    icon: 'dashboard',
  },
  {
    route: 'dashboard/active-users',
    name: 'active-users',
    type: 'link',
    icon: 'groups',
  },
  {
    route: 'company',
    name: 'company',
    type: 'link',
    icon: 'apartment',
  },
  {
    route: '/',
    name: 'sessions',
    type: 'sub',
    icon: 'question_answer',
    children: [
      {
        route: '403',
        name: '403',
        type: 'link',
      },
      {
        route: '404',
        name: '404',
        type: 'link',
      },
      {
        route: '500',
        name: '500',
        type: 'link',
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private readonly menuService = inject(MenuService);
  private readonly permissonsService = inject(NgxPermissionsService);
  private readonly rolesService = inject(NgxRolesService);

  load() {
    return new Promise<void>(resolve => {
      this.setMenu(structuredClone(DEFAULT_MENU));
      this.setPermissions();
      resolve();
    });
  }

  private setMenu(menu: Menu[]) {
    this.menuService.addNamespace(menu, 'menu');
    this.menuService.set(menu);
  }

  private setPermissions() {
    const permissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.permissonsService.loadPermissions(permissions);
    this.rolesService.flushRoles();
    this.rolesService.addRoles({ ADMIN: permissions });
  }
}

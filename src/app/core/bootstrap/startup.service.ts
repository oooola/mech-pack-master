import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { map, tap } from 'rxjs';
import { Menu, MenuService } from './menu.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private readonly http = inject(HttpClient);
  private readonly menuService = inject(MenuService);
  private readonly permissonsService = inject(NgxPermissionsService);
  private readonly rolesService = inject(NgxRolesService);

  /**
   * Load application menu and baseline permissions.
   */
  load() {
    return new Promise<void>(resolve => {
      this.http
        .get<{ menu: Menu[] }>('data/menu.json?_t=' + Date.now())
        .pipe(
          map(response => response?.menu ?? []),
          tap(menu => this.setMenu(menu))
        )
        .subscribe({
          next: () => {
            this.setPermissions();
            resolve();
          },
          error: () => {
            this.setMenu([]);
            this.setPermissions();
            resolve();
          },
        });
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

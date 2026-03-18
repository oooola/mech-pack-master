import { Injectable, inject } from '@angular/core';
import { GlobalService } from '@shared';
import { Menu, MenuService } from './menu.service';

const DEFAULT_MENU: Menu[] = [
  {
    route: 'current-status',
    name: 'Inloggade Användare',
    type: 'link',
    icon: 'how_to_reg',
  },
  {
    route: 'dashboard/active-users',
    name: 'Aktivitet Användare',
    type: 'link',
    icon: 'groups',
  },
  {
    route: 'active-company',
    name: 'Aktivitet Företag',
    type: 'link',
    icon: 'apartment',
  },
  {
    route: 'overview',
    name: 'Fördelning',
    type: 'link',
    icon: 'pie_chart',
  },
  {
    route: 'company',
    name: 'Hitta Företag',
    type: 'link',
    icon: 'search',
  },
  {
    route: 'login',
    name: 'Login',
    type: 'link',
    icon: 'meeting_room',
  },
  {
    route: '/',
    name: 'Sessions',
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
  private readonly globalService = inject(GlobalService);

  load() {
    return new Promise<void>(resolve => {
      this.setMenu(structuredClone(DEFAULT_MENU));
      this.globalService.restoreLoginDisplayName();
      resolve();
    });
  }

  private setMenu(menu: Menu[]) {
    this.menuService.set(menu);
  }
}

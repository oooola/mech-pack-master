import { Injectable, inject } from '@angular/core';
import { Menu, MenuService } from './menu.service';

const DEFAULT_MENU: Menu[] = [
  {
    route: 'dashboard',
    name: 'Dashboard',
    type: 'link',
    icon: 'dashboard',
  },
  {
    route: 'dashboard/active-users',
    name: 'Aktiva Användare',
    type: 'link',
    icon: 'groups',
  },
  {
    route: 'company',
    name: 'Företag',
    type: 'link',
    icon: 'apartment',
  },
  {
    route: 'login',
    name: 'Login',
    type: 'link',
    icon: 'login',
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

  load() {
    return new Promise<void>(resolve => {
      this.setMenu(structuredClone(DEFAULT_MENU));
      resolve();
    });
  }

  private setMenu(menu: Menu[]) {
    this.menuService.set(menu);
  }
}

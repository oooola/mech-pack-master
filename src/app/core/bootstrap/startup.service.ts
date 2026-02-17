import { Injectable, inject } from '@angular/core';
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
    route: 'login',
    name: 'login',
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
    this.menuService.addNamespace(menu, 'menu');
    this.menuService.set(menu);
  }
}

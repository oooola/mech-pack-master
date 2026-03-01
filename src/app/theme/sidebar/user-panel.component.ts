import { Component, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { GlobalService } from '@shared';

@Component({
  selector: 'app-user-panel',
  template: `
    <a class="matero-user-panel" routerLink="/login">
      <img class="matero-user-panel-avatar" [src]="user.avatar" alt="avatar" width="64" />
      <div class="matero-user-panel-info">
        <h4>{{ user.name }}</h4>
        <h5>{{ displayName }}</h5>
      </div>
    </a>
  `,
  styleUrl: './user-panel.component.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
})
export class UserPanelComponent {
  private readonly globalService = inject(GlobalService);

  user = {
    name: 'MechApp Master',
    avatar: 'images/mech-app-icon.png',
  };

  get displayName(): string {
    return this.globalService.getLoginDisplayName();
  }
}

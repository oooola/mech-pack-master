import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SettingsService } from '@core';

@Component({
  selector: 'app-translate',
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu">
      <mat-icon>translate</mat-icon>
    </button>

    <mat-menu #menu="matMenu">
      @for (lang of langs; track lang.value) {
        <button mat-menu-item (click)="changeLang(lang.value)">
          <span class="d-flex justify-content-between gap-8">
            {{ lang.name }}
            @if (lang.value === options.language) {
              <mat-pseudo-checkbox state="checked" appearance="minimal" />
            }
          </span>
        </button>
      }
    </mat-menu>
  `,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatPseudoCheckbox],
})
export class TranslateComponent {
  private settings = inject(SettingsService);

  options = this.settings.options;

  langs = [
    { value: 'en-US', name: 'English (US)' },
    { value: 'zh-CN', name: 'Chinese (Simplified)' },
    { value: 'zh-TW', name: 'Chinese (Traditional)' },
    { value: 'auto', name: 'System' },
  ];

  changeLang(lang: string) {
    this.settings.setLanguage(lang);
  }
}

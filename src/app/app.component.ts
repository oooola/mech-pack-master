import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { PreloaderService, SettingsService } from '@core';
import { RouterOutlet } from '@angular/router';
import { BackendService, GlobalService } from '@shared';
import { UserMessageService } from '@shared/services/user-message.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet />`,
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit, AfterViewInit {
  private readonly backendService = inject(BackendService);
  private readonly preloader = inject(PreloaderService);
  private readonly settings = inject(SettingsService);
  private readonly globalService = inject(GlobalService);
  private readonly userMessageService = inject(UserMessageService);

  async ngOnInit() {
    this.settings.setDirection();
    this.settings.setTheme();
    await this.testConnection();
    void this.globalService.ensureAllCompanyNamesLoaded();
    void this.globalService.ensureCurrentOnlineUsersLoaded();
  }

  ngAfterViewInit() {
    this.preloader.hide();
  }

  private async testConnection() {
    try {
      let result = await this.backendService.testConnection();
    } catch {
      await this.userMessageService.messageBox('Anslutningsfel', "Det gick inte att ansluta till API:t när appen startade.", '', 'Försök igen');
      await this.testConnection();
    }
  }


}

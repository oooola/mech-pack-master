import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { PreloaderService, SettingsService } from '@core';
import { RouterOutlet } from '@angular/router';
import { GlobalService } from '@shared';

@Component({
  selector: 'app-root',
  template: `<router-outlet />`,
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit, AfterViewInit {
  private readonly preloader = inject(PreloaderService);
  private readonly settings = inject(SettingsService);
  private readonly globalService = inject(GlobalService);

  ngOnInit() {
    this.settings.setDirection();
    this.settings.setTheme();
    void this.globalService.ensureAllCompanyNamesLoaded();
  }

  ngAfterViewInit() {
    this.preloader.hide();
  }
}

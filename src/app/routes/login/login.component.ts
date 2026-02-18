import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { GlobalService, PageHeaderComponent } from '@shared';
import { StatsHelpers } from '@shared/helpers/stats-calc';
import { BackendService } from '@shared/services/backend.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatButtonModule],
})
export class LoginComponent implements OnInit {
  private readonly backendService = inject(BackendService);
  private readonly globalService = inject(GlobalService);

  private jwt: string = '';
  public loginButtonText = 'Login';
  public isLoginDisabled = false;

  async ngOnInit(): Promise<void> {
    await this.onLoginPageEnter();
  }

  async onLoginPageEnter(): Promise<void> {
    const jwtStatus = this.globalService.getJwt();
    if (jwtStatus !== 'NO-JWT-FOUND' && jwtStatus !== 'JWT-EXPIRED') {
      this.jwt = jwtStatus;
      this.loginButtonText = 'Redan inloggad';
      this.isLoginDisabled = true;
      return;
    }

    await this.onLoginClick();
  }

  async onLoginClick() {

    try {
      let ret = await this.backendService.masterLogin2('RS232', 'mtsdmasterlogin');
      this.jwt = ret.jwt;
      this.globalService.setJwt(this.jwt);
      this.loginButtonText = 'Redan inloggad';
      this.isLoginDisabled = true;
    } catch (error) {
      console.error('Login request failed', error);
    }
  }

  async onGetStatClick() {
    try {
      let ret = await this.backendService.getStatUserTime(this.jwt);
      this.globalService.setStatsUserTime(ret);
      const res = this.globalService.getStatsUserTime();
      const labels = StatsHelpers.getHorizontalDateLabels(res, 7);
      const ola = 0;
    } catch (error) {
      console.error('Login request failed', error);
    }
  }
}

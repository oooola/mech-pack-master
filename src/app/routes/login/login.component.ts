import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LocalStorageService, PageHeaderComponent } from '@shared';
import { BackendService } from '@shared/services/backend.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatButtonModule],
})
export class LoginComponent {

  private readonly backendService = inject(BackendService);
  private readonly storageService = inject(LocalStorageService);

  private jwt:string ='';

  async onLoginClick() {

    try {
      let ret = await this.backendService.masterLogin2('RS232', 'mtsdmasterlogin');
      this.jwt = ret.jwt;
      this.storageService.set('jwt',this.jwt);
    } catch (error) {
      console.error('Login request failed', error);
    }
  }

  async onGetStatClick() {
    try {
      let ret = await this.backendService.getStatUserTime(this.jwt);
      const o = ret;
    } catch (error) {
      console.error('Login request failed', error);
    }
  }
}

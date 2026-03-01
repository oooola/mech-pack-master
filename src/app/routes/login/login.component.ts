import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GlobalService, PageHeaderComponent } from '@shared';
import { StatsHelpers } from '@shared/helpers/stats-calc';
import { BackendService } from '@shared/services/backend.service';
import { UserMessageService } from '@shared/services/user-message.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
})
export class LoginComponent implements OnInit {
  private readonly backendService = inject(BackendService);
  private readonly globalService = inject(GlobalService);
  private readonly userMessage = inject(UserMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  private jwt: string = '';
  public username = '';
  public password = '';
  public errorMessage = '';
  public isLoading = false;
  public loginButtonText = 'Login';
  public isLoginDisabled = false;
  public hasLocalJwt = false;

  async ngOnInit(): Promise<void> {
    await this.onLoginPageEnter();
  }

  async onLoginPageEnter(): Promise<void> {
    const jwtStatus = this.globalService.getJwt();
    this.hasLocalJwt = jwtStatus !== 'NO-JWT-FOUND' && jwtStatus !== 'JWT-EXPIRED';
    if (jwtStatus !== 'NO-JWT-FOUND' && jwtStatus !== 'JWT-EXPIRED') {
      this.jwt = jwtStatus;
      this.username = this.globalService.getLoginDisplayName();
      this.loginButtonText = 'Redan inloggad';
      this.isLoginDisabled = true;
      return;
    }

    this.loginButtonText = 'Login';
    this.isLoginDisabled = false;
    this.cdr.markForCheck();
  }

  async onLoginClick() {
    if (this.isLoginDisabled || this.isLoading) {
      return;
    }

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Fyll i användarnamn och lösenord.';
      this.loginButtonText = 'Login';
      this.isLoginDisabled = false;
      void this.userMessage.messageBox('Inloggning', this.errorMessage, 'Stäng', 'OK');
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    try {
      const ret = await this.backendService.masterLogin2(this.username.trim(), this.password);
      if (ret?.ok === false) {
        throw new Error('INVALID_CREDENTIALS');
      }

      this.jwt = ret.jwt;
      this.globalService.setJwt(this.jwt);
      this.globalService.setLoginDisplayName(this.username);
      const stats = await this.backendService.getStatUserTime(this.jwt);
      this.globalService.setStatsUserTime(stats);
      this.hasLocalJwt = true;
      this.loginButtonText = 'Redan inloggad';
      this.isLoginDisabled = true;
      await this.router.navigate(['/current-status']);
    } catch (error) {
      console.error('Login request failed', error);
      this.errorMessage = error instanceof Error && error.message === 'INVALID_CREDENTIALS'
        ? 'Fel lösenord eller användarnamn.'
        : 'Inloggning misslyckades. Kontrollera uppgifterna och försök igen.';

      this.loginButtonText = 'Login';
      this.isLoginDisabled = false;
      void this.userMessage.messageBox('Inloggning', this.errorMessage, '', 'OK');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  onClearLocalLoginClick(): void {
    this.globalService.clearJwt();
    this.jwt = '';
    this.hasLocalJwt = false;
    this.loginButtonText = 'Login';
    this.isLoginDisabled = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
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

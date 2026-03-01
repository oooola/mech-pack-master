import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { AdminLayoutComponent } from '@theme/admin-layout/admin-layout.component';
import { ActiveUsersComponent } from './routes/active-users/active-users.component';
import { CompanyComponent } from './routes/company/company.component';
import { CurrentStatusComponent } from './routes/current-status/current-status.component';
import { DashboardComponent } from './routes/dashboard/dashboard.component';
import { LoginComponent } from './routes/login/login.component';
import { OverviewComponent } from './routes/overview/overview.component';
import { Error403Component } from './routes/sessions/403.component';
import { Error404Component } from './routes/sessions/404.component';
import { Error500Component } from './routes/sessions/500.component';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'dashboard/active-users', component: ActiveUsersComponent },
      { path: 'company', component: CompanyComponent },
      { path: 'current-status', component: CurrentStatusComponent },
      { path: 'overview', component: OverviewComponent },
      { path: 'login', component: LoginComponent },
      { path: '403', component: Error403Component },
      { path: '404', component: Error404Component },
      { path: '500', component: Error500Component },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

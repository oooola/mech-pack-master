import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PageHeaderComponent } from '@shared';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-active-users',
  templateUrl: './active-users.component.html',
  styleUrl: './active-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PageHeaderComponent, BaseChartDirective, MatCheckboxModule],
})
export class ActiveUsersComponent {
  showMatkurs = true;

  private readonly labels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  private readonly activeUsersDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [12, 19, 7, 15, 22, 18, 9],
    label: 'Aktiva kunder',
    fill: true,
    borderColor: '#1976d2',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    tension: 0.2,
  };

  private readonly matkursDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [8, 14, 11, 13, 17, 16, 12],
    label: 'MätKurs',
    fill: true,
    borderColor: '#43a047',
    backgroundColor: 'rgba(67, 160, 71, 0.16)',
    tension: 0.2,
  };

  lineChartData: ChartConfiguration<'line'>['data'] = this.buildChartData();

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    animation: false,
    scales: {
      x: {
        offset: true,
      },
    },
  };

  onMatkursToggle(checked: boolean) {
    this.showMatkurs = checked;
    this.lineChartData = this.buildChartData();
  }

  private buildChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.labels,
      datasets: this.showMatkurs
        ? [this.activeUsersDataset, this.matkursDataset]
        : [this.activeUsersDataset],
    };
  }
}

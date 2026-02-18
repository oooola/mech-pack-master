import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BackendService, GlobalService, PageHeaderComponent } from '@shared';
import { StatsHelpers } from '@shared/helpers/stats-calc';
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
export class ActiveUsersComponent implements OnInit {
  showMatkurs = true;

  private readonly globalService = inject(GlobalService);
  private readonly backendService = inject(BackendService);
  private readonly stats = this.globalService.getStatsUserTime();
  private readonly labels = StatsHelpers.getHorizontalDateLabels(this.stats as any, 7);
  
  private horizontalDateLabels = new Array<string>();

  private activeUsersDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
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

  ngOnInit(): void {
    this.onPageLoad();
  }

  async onPageLoad() {
   
    // Hämta statistik 
    let stats = this.globalService.getStatsUserTime();
    if (stats.length === 0) {
      let ret = await this.backendService.getStatUserTime(this.globalService.getJwt());
      this.globalService.setStatsUserTime(ret);
      stats = this.globalService.getStatsUserTime();
    }
    // Skap labels för den horisontala axeln X
    this.horizontalDateLabels = StatsHelpers.getHorizontalDateLabels(this.stats as any, 7);
    // Hämtar nummer array med hur många sammanlagda sekunder per dag som dataa innehåller
    const activUsersDataSet = StatsHelpers.getDataActivUsersTime(stats);
    // Sätter data till graf som minuter i stället för sekunder
    this.activeUsersDataset.data = StatsHelpers.timeDataSecToMin(activUsersDataSet);
    // Bygger om data
    this.lineChartData = this.buildChartData();
    
    const ola = 0;
  }

  onMatkursToggle(checked: boolean) {
    this.showMatkurs = checked;
    this.lineChartData = this.buildChartData();
  }

  private buildChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.horizontalDateLabels,
      datasets: this.showMatkurs
        ? [this.activeUsersDataset, this.matkursDataset]
        : [this.activeUsersDataset],
    };
  }
}

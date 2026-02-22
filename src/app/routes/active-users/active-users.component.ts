import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BackendService, GlobalService, PageHeaderComponent } from '@shared';
import { StatsHelpers } from '@shared/helpers/stats-calc';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

type CompanyOption = {
  id: number | 'all';
  companyLabel: string;
  minutesLabel: string;
};

@Component({
  selector: 'app-active-users',
  templateUrl: './active-users.component.html',
  styleUrl: './active-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PageHeaderComponent, BaseChartDirective, MatCheckboxModule, MatFormFieldModule, MatSelectModule],
})
export class ActiveUsersComponent implements OnInit {
  showMatkurs = true;
  selectedCompanyId: number | 'all' = 'all';
  companyOptions: CompanyOption[] = [
    { id: 'all', companyLabel: 'Alla företag', minutesLabel: '' },
  ];

  private readonly globalService = inject(GlobalService);
  private readonly backendService = inject(BackendService);
  private readonly cdr = inject(ChangeDetectorRef);
  
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
    try {
      // Hämta statistik direkt när sidan laddas om den inte redan finns cachad.
      let stats = this.globalService.getStatsUserTime();
      if (stats.length === 0) {
        const ret = await this.backendService.getStatUserTime(this.globalService.getJwt());
        this.globalService.setStatsUserTime(ret);
        stats = this.globalService.getStatsUserTime();
      }

      // Bygg labels och dataset från den senaste statistiken.
      this.horizontalDateLabels = StatsHelpers.getHorizontalDateLabels(stats as any, 7);
      const activUsersDataSet = StatsHelpers.getDataActivUsersTime(stats);
      this.activeUsersDataset = {
        ...this.activeUsersDataset,
        data: StatsHelpers.timeDataSecToMin(activUsersDataSet),
      };
      this.setCompanyOptions(stats);
      this.lineChartData = this.buildChartData();
    } catch (error) {
      console.error('Kunde inte ladda statistik till active-users.', error);
      this.horizontalDateLabels = [];
      this.activeUsersDataset = { ...this.activeUsersDataset, data: [] };
      this.setCompanyOptions([]);
      this.lineChartData = this.buildChartData();
    } finally {
      this.cdr.markForCheck();
    }
  }

  onMatkursToggle(checked: boolean) {
    this.showMatkurs = checked;
    this.lineChartData = this.buildChartData();
  }

  get selectedCompanyOption(): CompanyOption | undefined {
    return this.companyOptions.find(option => option.id === this.selectedCompanyId);
  }

  private buildChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.horizontalDateLabels,
      datasets: this.showMatkurs
        ? [this.activeUsersDataset, this.matkursDataset]
        : [this.activeUsersDataset],
    };
  }

  private setCompanyOptions(stats: Array<{ CompanyId: number; SecUsed: number }>): void {
    const totalSecUsedByCompany = new Map<number, number>();

    for (const item of stats) {
      if (!Number.isFinite(item.CompanyId)) {
        continue;
      }

      const currentTotal = totalSecUsedByCompany.get(item.CompanyId) ?? 0;
      totalSecUsedByCompany.set(item.CompanyId, currentTotal + (item.SecUsed ?? 0));
    }

    const sortedCompanyEntries = Array.from(totalSecUsedByCompany.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0] - b[0];
      });

    this.companyOptions = [
      { id: 'all', companyLabel: 'Alla företag', minutesLabel: '' },
      ...sortedCompanyEntries.map(([companyId, totalSecUsed]) => {
        const totalMinutes = Math.round(totalSecUsed / 60);
        return {
          id: companyId,
          companyLabel: `Företag ${companyId}`,
          minutesLabel: `Minuter: ${totalMinutes}`,
        };
      }),
    ];
    this.selectedCompanyId = 'all';
  }
}

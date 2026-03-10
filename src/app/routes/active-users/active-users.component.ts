import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { StatsUserTime } from '@shared/models/stats-user-time';
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
  imports: [PageHeaderComponent, BaseChartDirective, MatCheckboxModule, MatFormFieldModule, MatSelectModule, MatTabsModule],
})
export class ActiveUsersComponent implements OnInit {
  private readonly pointCount = 15;

  showAllPrograms = true;
  showMatkurs = false;
  selectedTabIndex = 0;
  selectedCompanyId: number | 'all' = 'all';
  companyOptions: CompanyOption[] = [
    { id: 'all', companyLabel: 'Alla företag', minutesLabel: '' },
  ];

  private readonly globalService = inject(GlobalService);
  private readonly backendService = inject(BackendService);
  private readonly cdr = inject(ChangeDetectorRef);
  private allStats: StatsUserTime[] = [];
  
  private horizontalDateLabels = new Array<string>();

  private activeUsersDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [12, 19, 7, 15, 22, 18, 9],
    label: 'Aktiva kunder',
    fill: true,
    borderColor: '#1976d2',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    tension: 0.2,
  };

  private activeUsersCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [2, 4, 3, 5, 6, 4, 3],
    label: 'Aktiva användare',
    fill: true,
    borderColor: '#ef6c00',
    backgroundColor: 'rgba(239, 108, 0, 0.18)',
    tension: 0.2,
  };

  private readonly matkursDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [8, 14, 11, 13, 17, 16, 12, 10, 9, 15, 18, 14, 13, 11, 8],
    label: 'MätKurs',
    fill: true,
    borderColor: '#43a047',
    backgroundColor: 'rgba(67, 160, 71, 0.16)',
    tension: 0.2,
  };

  activeTimeChartData: ChartConfiguration<'line'>['data'] = this.buildActiveTimeChartData();
  activeCountChartData: ChartConfiguration<'line'>['data'] = this.buildActiveCountChartData();

  activeTimeChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        offset: true,
        ticks: {
          color: '#9aa0a6',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9aa0a6',
        },
        title: {
          display: true,
          text: 'Timmar',
          color: '#9aa0a6',
        },
      },
    },
  };

  activeCountChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        offset: true,
        ticks: {
          color: '#9aa0a6',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#9aa0a6',
        },
        title: {
          display: true,
          text: 'Antal',
          color: '#9aa0a6',
        },
      },
    },
  };

  // Startar initial laddning av data när komponenten initieras.
  ngOnInit(): void {
    this.onPageLoad();
  }

  // Hämtar statistik, bygger filteralternativ och uppdaterar grafen.
  async onPageLoad() {
    try {
      // Hämta statistik direkt när sidan laddas om den inte redan finns cachad.
      let stats = this.globalService.getStatsUserTime();
      if (stats.length === 0) {
        const ret = await this.backendService.getStatUserTime(this.globalService.getJwt());
        this.globalService.setStatsUserTime(ret);
        stats = this.globalService.getStatsUserTime();
      }

      this.allStats = stats;
      this.setCompanyOptions(stats);
      this.updateChartForSelection();
    } catch (error) {
      console.error('Kunde inte ladda statistik till active-users.', error);
      this.allStats = [];
      this.horizontalDateLabels = [];
      this.activeUsersDataset = { ...this.activeUsersDataset, data: [] };
      this.activeUsersCountDataset = { ...this.activeUsersCountDataset, data: [] };
      this.setCompanyOptions([]);
      this.activeTimeChartData = this.buildActiveTimeChartData();
      this.activeCountChartData = this.buildActiveCountChartData();
    } finally {
      this.cdr.markForCheck();
    }
  }

  // Visar eller döljer MätKurs-serien i diagrammet.
  onMatkursToggle(checked: boolean) {
    this.showMatkurs = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.cdr.markForCheck();
  }

  // Visar eller döljer standard-serien för alla programtyper.
  onAllProgramsToggle(checked: boolean) {
    this.showAllPrograms = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.cdr.markForCheck();
  }

  // Byter valt företag och uppdaterar diagrammet för urvalet.
  onCompanySelectionChange(selectedCompanyId: number | 'all') {
    this.selectedCompanyId = selectedCompanyId;
    this.updateChartForSelection();
    this.cdr.markForCheck();
  }

  // Returnerar det aktuellt valda företagsalternativet.
  get selectedCompanyOption(): CompanyOption | undefined {
    return this.companyOptions.find(option => option.id === this.selectedCompanyId);
  }

  // Bygger diagramdata för tabben Aktiv Tid.
  private buildActiveTimeChartData(): ChartConfiguration<'line'>['data'] {
    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [];
    if (this.showAllPrograms) {
      datasets.push(this.activeUsersDataset);
    }
    if (this.showMatkurs) {
      datasets.push(this.matkursDataset);
    }

    return {
      labels: this.horizontalDateLabels,
      datasets,
    };
  }

  // Bygger diagramdata för tabben Aktiv Antal.
  private buildActiveCountChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.horizontalDateLabels,
      datasets: [this.activeUsersCountDataset],
    };
  }

  // Filtrerar statistik per valt företag och uppdaterar aktiv-serien.
  private updateChartForSelection(): void {
    const filteredStats =
      this.selectedCompanyId === 'all'
        ? this.allStats
        : this.allStats.filter(item => item.CompanyId === this.selectedCompanyId);

    const chartSeries = this.getChartSeries(filteredStats);
    this.horizontalDateLabels = chartSeries.labels;
    this.activeUsersDataset = {
      ...this.activeUsersDataset,
      data: chartSeries.timeInHours,
    };
    this.activeUsersCountDataset = {
      ...this.activeUsersCountDataset,
      data: chartSeries.userCounts,
    };
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
  }

  private getChartSeries(stats: StatsUserTime[]): { labels: string[]; timeInHours: number[]; userCounts: number[] } {
    if (!Array.isArray(stats) || stats.length === 0) {
      return {
        labels: [],
        timeInHours: [],
        userCounts: [],
      };
    }

    const dayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' });
    const secUsedByDay = new Map<string, number>();
    const userIdsByDay = new Map<string, Set<number>>();
    let maxTs = 0;

    for (const item of stats) {
      const startTs = Number(item.StartTS);
      const secUsed = Number(item.SecUsed);
      const userId = Number(item.UserId);
      if (!Number.isFinite(startTs)) {
        continue;
      }

      maxTs = Math.max(maxTs, startTs);
      const dayKey = dayFormatter.format(new Date(startTs * 1000));

      if (Number.isFinite(secUsed)) {
        const currentTotal = secUsedByDay.get(dayKey) ?? 0;
        secUsedByDay.set(dayKey, currentTotal + secUsed);
      }

      if (Number.isFinite(userId)) {
        const dayUserIds = userIdsByDay.get(dayKey) ?? new Set<number>();
        dayUserIds.add(userId);
        userIdsByDay.set(dayKey, dayUserIds);
      }
    }

    if (maxTs === 0) {
      return {
        labels: [],
        timeInHours: [],
        userCounts: [],
      };
    }

    const labels: string[] = [];
    const timeInHours: number[] = [];
    const userCounts: number[] = [];
    const endDate = new Date(maxTs * 1000);
    endDate.setHours(12, 0, 0, 0);

    for (let index = this.pointCount - 1; index >= 0; index--) {
      const currentDate = new Date(endDate);
      currentDate.setDate(endDate.getDate() - index);
      const dayKey = dayFormatter.format(currentDate);
      labels.push(StatsHelpers.toDateLabelFromDate(currentDate));
      timeInHours.push(Number(((secUsedByDay.get(dayKey) ?? 0) / 3600).toFixed(2)));
      userCounts.push(userIdsByDay.get(dayKey)?.size ?? 0);
    }

    return { labels, timeInHours, userCounts };
  }

  // Skapar och sorterar företagsalternativ med total användningstid.
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

    const companyNameMap = this.getCompanyNameMap(sortedCompanyEntries.map(([companyId]) => companyId));

    this.companyOptions = [
      { id: 'all', companyLabel: 'Alla företag', minutesLabel: '' },
      ...sortedCompanyEntries.map(([companyId, totalSecUsed]) => {
        const totalMinutes = Math.round(totalSecUsed / 60);
        return {
          id: companyId,
          companyLabel: companyNameMap.get(companyId) || `Företag ${companyId}`,
          minutesLabel: `Minuter: ${totalMinutes}`,
        };
      }),
    ];
    this.selectedCompanyId = 'all';
  }

  // Hämtar en uppslagstabell med företagsnamn per företags-id från global cache.
  private getCompanyNameMap(companyIds: number[]): Map<number, string> {
    if (companyIds.length === 0) {
      return new Map();
    }

    const companyNameMap = new Map<number, string>();
    const allowedCompanyIds = new Set(companyIds);
    for (const item of this.globalService.getAllCompanyNames()) {
      const companyId = Number(item?.CompanyId);
      const companyName = typeof item?.CompanyName === 'string' ? item.CompanyName.trim() : '';
      if (allowedCompanyIds.has(companyId) && companyName.length > 0) {
        companyNameMap.set(companyId, companyName);
      }
    }

    return companyNameMap;
  }
}

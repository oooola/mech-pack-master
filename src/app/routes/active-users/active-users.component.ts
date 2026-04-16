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
  hoursLabel: string;
};

type SummaryRow = {
  label: string;
  value: number | string;
};

type ChartPeriodOption = {
  id: '1w' | '1m' | '3m' | 'ytd' | '1y' | 'all';
  label: string;
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
  showAllPrograms = true;
  showMatkurs = false;
  showIsoIntro = false;
  showIsoKurs = false;
  showRitningslasning = false;
  showKunskapstest = false;
  showMekmat = false;
  selectedTabIndex = 0;
  selectedCompanyId: number | 'all' = 'all';
  selectedChartPeriodId: ChartPeriodOption['id'] = '1m';
  summaryRows: SummaryRow[] = [];
  companyOptions: CompanyOption[] = [
    { id: 'all', companyLabel: 'Alla företag', hoursLabel: '' },
  ];
  chartPeriodOptions: ChartPeriodOption[] = [
    { id: '1w', label: '1 vecka' },
    { id: '1m', label: '1 månad' },
    { id: '3m', label: '3 månader' },
    { id: 'ytd', label: 'i år' },
    { id: '1y', label: '1 år' },
    { id: 'all', label: 'Sedan start' },
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

  private matkursDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'MätKurs',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('MätKurs'),
    backgroundColor: 'rgba(239, 108, 0, 0.16)',
    tension: 0.2,
  };

  private matkursCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'MätKurs',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('MätKurs'),
    backgroundColor: 'rgba(239, 108, 0, 0.16)',
    tension: 0.2,
  };

  private isoIntroDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'IsoIntro',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('IsoIntro'),
    backgroundColor: 'rgba(46, 125, 50, 0.16)',
    tension: 0.2,
  };

  private isoIntroCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'IsoIntro',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('IsoIntro'),
    backgroundColor: 'rgba(46, 125, 50, 0.16)',
    tension: 0.2,
  };

  private isoKursDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'IsoKurs',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('IsoKurs'),
    backgroundColor: 'rgba(25, 118, 210, 0.16)',
    tension: 0.2,
  };

  private isoKursCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'IsoKurs',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('IsoKurs'),
    backgroundColor: 'rgba(25, 118, 210, 0.16)',
    tension: 0.2,
  };

  private ritningslasningDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'Ritningsläsning',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('Ritningsläsning'),
    backgroundColor: 'rgba(0, 131, 143, 0.16)',
    tension: 0.2,
  };

  private ritningslasningCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'Ritningsläsning',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('Ritningsläsning'),
    backgroundColor: 'rgba(0, 131, 143, 0.16)',
    tension: 0.2,
  };

  private kunskapstestDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'Kunskapstest',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('Kunskapstest'),
    backgroundColor: 'rgba(198, 40, 40, 0.16)',
    tension: 0.2,
  };

  private kunskapstestCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'Kunskapstest',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('Kunskapstest'),
    backgroundColor: 'rgba(198, 40, 40, 0.16)',
    tension: 0.2,
  };

  private mekmatDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'MekMät',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('MekMät'),
    backgroundColor: 'rgba(142, 36, 170, 0.16)',
    tension: 0.2,
  };

  private mekmatCountDataset: ChartConfiguration<'line'>['data']['datasets'][number] = {
    data: [],
    label: 'MekMät',
    fill: true,
    borderColor: this.globalService.appNameToChartColor('MekMät'),
    backgroundColor: 'rgba(142, 36, 170, 0.16)',
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
          autoSkip: true,
          maxTicksLimit: 12,
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
          autoSkip: true,
          maxTicksLimit: 12,
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
      await this.globalService.ensureAllCompanyNamesLoaded();

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
      this.summaryRows = [];
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
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  onIsoIntroToggle(checked: boolean) {
    this.showIsoIntro = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  onIsoKursToggle(checked: boolean) {
    this.showIsoKurs = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  onRitningslasningToggle(checked: boolean) {
    this.showRitningslasning = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  onKunskapstestToggle(checked: boolean) {
    this.showKunskapstest = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  onMekmatToggle(checked: boolean) {
    this.showMekmat = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  // Visar eller döljer standard-serien för alla programtyper.
  onAllProgramsToggle(checked: boolean) {
    this.showAllPrograms = checked;
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
    this.cdr.markForCheck();
  }

  // Byter valt företag och uppdaterar diagrammet för urvalet.
  onCompanySelectionChange(selectedCompanyId: number | 'all') {
    this.selectedCompanyId = selectedCompanyId;
    this.updateChartForSelection();
    this.cdr.markForCheck();
  }

  onChartPeriodSelectionChange(selectedChartPeriodId: ChartPeriodOption['id']) {
    this.selectedChartPeriodId = selectedChartPeriodId;
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
    if (this.showIsoIntro) {
      datasets.push(this.isoIntroDataset);
    }
    if (this.showIsoKurs) {
      datasets.push(this.isoKursDataset);
    }
    if (this.showRitningslasning) {
      datasets.push(this.ritningslasningDataset);
    }
    if (this.showKunskapstest) {
      datasets.push(this.kunskapstestDataset);
    }
    if (this.showMekmat) {
      datasets.push(this.mekmatDataset);
    }

    return {
      labels: this.horizontalDateLabels,
      datasets,
    };
  }

  // Bygger diagramdata för tabben Aktiv Antal.
  private buildActiveCountChartData(): ChartConfiguration<'line'>['data'] {
    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [];
    if (this.showAllPrograms) {
      datasets.push(this.activeUsersCountDataset);
    }
    if (this.showMatkurs) {
      datasets.push(this.matkursCountDataset);
    }
    if (this.showIsoIntro) {
      datasets.push(this.isoIntroCountDataset);
    }
    if (this.showIsoKurs) {
      datasets.push(this.isoKursCountDataset);
    }
    if (this.showRitningslasning) {
      datasets.push(this.ritningslasningCountDataset);
    }
    if (this.showKunskapstest) {
      datasets.push(this.kunskapstestCountDataset);
    }
    if (this.showMekmat) {
      datasets.push(this.mekmatCountDataset);
    }

    return {
      labels: this.horizontalDateLabels,
      datasets,
    };
  }

  // Filtrerar statistik per valt företag och uppdaterar aktiv-serien.
  private updateChartForSelection(): void {
    const filteredStats =
      this.selectedCompanyId === 'all'
        ? this.allStats
        : this.allStats.filter(item => item.CompanyId === this.selectedCompanyId);
    const usageChartStats = filteredStats.filter(item => {
      const appCode = typeof item?.AppCode === 'string' ? item.AppCode : '';
      return this.globalService.shouldIncludeAppCodeInUsageCharts(appCode);
    });

    this.summaryRows = this.buildSummaryRows(filteredStats);

    const chartStats = this.filterStatsBySelectedPeriod(usageChartStats);
    const chartSeries = this.getChartSeries(chartStats);
    const matkursStats = this.getStatsForApp(chartStats, 'MätKurs');
    const matkursChartSeries = this.getChartSeries(matkursStats);
    const isoIntroStats = this.getStatsForApp(chartStats, 'IsoIntro');
    const isoIntroChartSeries = this.getChartSeries(isoIntroStats);
    const isoKursStats = this.getStatsForApp(chartStats, 'IsoKurs');
    const isoKursChartSeries = this.getChartSeries(isoKursStats);
    const ritningslasningStats = this.getStatsForApp(chartStats, 'Ritningsläsning');
    const ritningslasningChartSeries = this.getChartSeries(ritningslasningStats);
    const kunskapstestStats = this.getStatsForApp(chartStats, 'Kunskapstest');
    const kunskapstestChartSeries = this.getChartSeries(kunskapstestStats);
    const mekmatStats = this.getStatsForApp(chartStats, 'MekMät');
    const mekmatChartSeries = this.getChartSeries(mekmatStats);
    this.horizontalDateLabels = chartSeries.labels;
    this.activeUsersDataset = {
      ...this.activeUsersDataset,
      data: chartSeries.timeInHours,
    };
    this.activeUsersCountDataset = {
      ...this.activeUsersCountDataset,
      data: chartSeries.userCounts,
    };
    this.matkursDataset = {
      ...this.matkursDataset,
      data: matkursChartSeries.timeInHours,
    };
    this.matkursCountDataset = {
      ...this.matkursCountDataset,
      data: matkursChartSeries.userCounts,
    };
    this.isoIntroDataset = {
      ...this.isoIntroDataset,
      data: isoIntroChartSeries.timeInHours,
    };
    this.isoIntroCountDataset = {
      ...this.isoIntroCountDataset,
      data: isoIntroChartSeries.userCounts,
    };
    this.isoKursDataset = {
      ...this.isoKursDataset,
      data: isoKursChartSeries.timeInHours,
    };
    this.isoKursCountDataset = {
      ...this.isoKursCountDataset,
      data: isoKursChartSeries.userCounts,
    };
    this.ritningslasningDataset = {
      ...this.ritningslasningDataset,
      data: ritningslasningChartSeries.timeInHours,
    };
    this.ritningslasningCountDataset = {
      ...this.ritningslasningCountDataset,
      data: ritningslasningChartSeries.userCounts,
    };
    this.kunskapstestDataset = {
      ...this.kunskapstestDataset,
      data: kunskapstestChartSeries.timeInHours,
    };
    this.kunskapstestCountDataset = {
      ...this.kunskapstestCountDataset,
      data: kunskapstestChartSeries.userCounts,
    };
    this.mekmatDataset = {
      ...this.mekmatDataset,
      data: mekmatChartSeries.timeInHours,
    };
    this.mekmatCountDataset = {
      ...this.mekmatCountDataset,
      data: mekmatChartSeries.userCounts,
    };
    this.activeTimeChartData = this.buildActiveTimeChartData();
    this.activeCountChartData = this.buildActiveCountChartData();
  }

  private getStatsForApp(stats: StatsUserTime[], appName: string): StatsUserTime[] {
    return stats.filter(item => {
      const appCode = typeof item?.AppCode === 'string' ? item.AppCode : '';
      return this.globalService.appCodeToName(appCode) === appName;
    });
  }

  private filterStatsBySelectedPeriod(stats: StatsUserTime[]): StatsUserTime[] {
    if (!Array.isArray(stats) || stats.length === 0 || this.selectedChartPeriodId === 'all') {
      return stats;
    }

    let maxTs = 0;
    for (const item of stats) {
      const startTs = Number(item?.StartTS);
      if (Number.isFinite(startTs)) {
        maxTs = Math.max(maxTs, startTs);
      }
    }

    if (maxTs === 0) {
      return [];
    }

    const endDate = new Date(maxTs * 1000);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    switch (this.selectedChartPeriodId) {
      case '1w':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'ytd':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    if (this.selectedChartPeriodId !== 'ytd') {
      startDate.setHours(0, 0, 0, 0);
    }

    const startTs = Math.floor(startDate.getTime() / 1000);
    return stats.filter(item => Number(item?.StartTS) >= startTs);
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
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;

    for (const item of stats) {
      const startTs = Number(item.StartTS);
      const secUsed = Number(item.SecUsed);
      const userId = Number(item.UserId);
      if (!Number.isFinite(startTs)) {
        continue;
      }

      minTs = Math.min(minTs, startTs);
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

    if (maxTs === 0 || !Number.isFinite(minTs)) {
      return {
        labels: [],
        timeInHours: [],
        userCounts: [],
      };
    }

    const labels: string[] = [];
    const timeInHours: number[] = [];
    const userCounts: number[] = [];
    const firstDate = new Date(minTs * 1000);
    const endDate = new Date(maxTs * 1000);
    firstDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);

    for (const currentDate = new Date(firstDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      const dayKey = dayFormatter.format(currentDate);
      labels.push(StatsHelpers.toDateLabelFromDate(currentDate));
      timeInHours.push(Number(((secUsedByDay.get(dayKey) ?? 0) / 3600).toFixed(2)));
      userCounts.push(userIdsByDay.get(dayKey)?.size ?? 0);
    }

    return { labels, timeInHours, userCounts };
  }

  private buildSummaryRows(stats: StatsUserTime[]): SummaryRow[] {
    if (!Array.isArray(stats) || stats.length === 0) {
      return [
        { label: 'Unika användare Total', value: 0 },
        { label: 'Unika användare Månad', value: 0 },
        { label: 'Unika användare Vecka', value: 0 },
        { label: 'Unika användare Max på en dag', value: 0 },
      ];
    }

    const dayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' });
    const totalUserIds = new Set<number>();
    const monthUserIds = new Set<number>();
    const weekUserIds = new Set<number>();
    const userIdsByDay = new Map<string, Set<number>>();
    let maxTs = 0;

    for (const item of stats) {
      const startTs = Number(item?.StartTS);
      if (Number.isFinite(startTs)) {
        maxTs = Math.max(maxTs, startTs);
      }
    }

    const monthCutoffTs = maxTs > 0 ? maxTs - (30 * 24 * 60 * 60) : 0;
    const weekCutoffTs = maxTs > 0 ? maxTs - (7 * 24 * 60 * 60) : 0;

    for (const item of stats) {
      const userId = Number(item?.UserId);
      const startTs = Number(item?.StartTS);
      if (!Number.isFinite(userId)) {
        continue;
      }

      totalUserIds.add(userId);

      if (Number.isFinite(startTs)) {
        if (startTs >= monthCutoffTs) {
          monthUserIds.add(userId);
        }

        if (startTs >= weekCutoffTs) {
          weekUserIds.add(userId);
        }

        const dayKey = dayFormatter.format(new Date(startTs * 1000));
        const dayUserIds = userIdsByDay.get(dayKey) ?? new Set<number>();
        dayUserIds.add(userId);
        userIdsByDay.set(dayKey, dayUserIds);
      }
    }

    let maxUsersInSingleDay = 0;
    for (const dayUserIds of userIdsByDay.values()) {
      maxUsersInSingleDay = Math.max(maxUsersInSingleDay, dayUserIds.size);
    }

    return [
      {
        label: 'Unika användare Total',
        value: totalUserIds.size,
      },
      {
        label: 'Unika användare Månad',
        value: monthUserIds.size,
      },
      {
        label: 'Unika användare Vecka',
        value: weekUserIds.size,
      },
      {
        label: 'Unika användare Max på en dag',
        value: maxUsersInSingleDay,
      },
    ];
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
      { id: 'all', companyLabel: 'Alla företag', hoursLabel: '' },
      ...sortedCompanyEntries.map(([companyId, totalSecUsed]) => {
        const totalHours = Math.round(totalSecUsed / 3600);
        return {
          id: companyId,
          companyLabel: companyNameMap.get(companyId) || `Företag ${companyId}`,
          hoursLabel: `Timmar: ${totalHours}`,
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

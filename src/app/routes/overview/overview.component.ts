import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { BackendService, GlobalService, PageHeaderComponent } from '@shared';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PageHeaderComponent, BaseChartDirective, MatTabsModule],
})
export class OverviewComponent implements OnInit {
  private readonly globalService = inject(GlobalService);
  private readonly backendService = inject(BackendService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sortedUsageEntries: [number, number][] = [];
  private sortedUsersEntries: [number, number][] = [];
  private sortedAppCodeEntries: [string, number][] = [];
  private sortedPlatformEntries: [string, number][] = [];
  private platformUserCounts: number[] = [];
  private companyNameMap = new Map<number, string>();
  private readonly stepSize = 10;
  private readonly pieColors = [
    '#1976d2',
    '#ef6c00',
    '#2e7d32',
    '#8e24aa',
    '#c62828',
    '#00838f',
    '#6d4c41',
    '#ad1457',
    '#455a64',
    '#9e9d24',
  ];

  selectedTabIndex = 0;
  selectedDistributionTabIndex = 0;
  displayLimit = 10;

  usageChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Total tid (timmar)',
        backgroundColor: '#1976d2',
        borderColor: '#125a9b',
        borderWidth: 1,
      },
    ],
  };

  usageChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
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
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  usersChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Unika användare',
        backgroundColor: '#ef6c00',
        borderColor: '#bb5500',
        borderWidth: 1,
      },
    ],
  };

  usersChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        ticks: {
          color: '#9aa0a6',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9aa0a6',
          precision: 0,
        },
        title: {
          display: true,
          text: 'Unika användare',
          color: '#9aa0a6',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  appCodeChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderColor: '#111',
        borderWidth: 2,
      },
    ],
  };

  appCodeChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9aa0a6',
        },
      },
      tooltip: {
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = Number(context.raw) || 0;
            const total = context.dataset.data.reduce((sum, item) => sum + Number(item || 0), 0);
            const percent = total > 0 ? (value / total) * 100 : 0;
            return `${label}: ${percent.toFixed(1)}%`;
          },
        },
      },
    },
  };

  platformChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderColor: '#111',
        borderWidth: 2,
      },
    ],
  };

  platformChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9aa0a6',
        },
      },
      tooltip: {
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = Number(context.raw) || 0;
            const total = context.dataset.data.reduce((sum, item) => sum + Number(item || 0), 0);
            const percent = total > 0 ? (value / total) * 100 : 0;
            return [
              `${label} ${percent.toFixed(1)}%`,
              `Användare ${this.platformUserCounts[context.dataIndex] ?? 0}`,
            ];
          },
        },
      },
    },
  };

  hasUsageData = false;
  hasUsersData = false;
  hasAppCodeData = false;
  hasPlatformData = false;

  ngOnInit(): void {
    void this.loadChart();
  }

  private async loadChart(): Promise<void> {
    try {
      await this.globalService.ensureAllCompanyNamesLoaded();

      let stats = this.globalService.getStatsUserTime();
      if (stats.length === 0) {
        const response = await this.backendService.getStatUserTime(this.globalService.getJwt());
        stats = this.normalizeStatsUserTimeList(response);
        this.globalService.setStatsUserTime(stats);
      }

      const totalSecUsedByCompany = new Map<number, number>();
      const uniqueUsersByCompany = new Map<number, Set<number>>();
      const totalSecUsedByAppCode = new Map<string, number>();
      const totalSecUsedByPlatform = new Map<string, number>();
      const uniqueUsersByPlatform = new Map<string, Set<number>>();
      for (const item of stats) {
        const companyId = Number(item?.CompanyId);
        const userId = Number(item?.UserId);
        const secUsed = Number(item?.SecUsed);
        const appCode = typeof item?.AppCode === 'string' ? item.AppCode.trim() : '';
        const platformCode = typeof item?.Platform === 'string' ? item.Platform.trim() : '';
        const platform = platformCode.length > 0
          ? this.globalService.platformCodeToName(platformCode)
          : '';

        if (!Number.isFinite(companyId)) {
          continue;
        }

        if (Number.isFinite(secUsed)) {
          const currentSecUsed = totalSecUsedByCompany.get(companyId) ?? 0;
          totalSecUsedByCompany.set(companyId, currentSecUsed + secUsed);

          if (appCode.length > 0) {
            const currentAppCodeSecUsed = totalSecUsedByAppCode.get(appCode) ?? 0;
            totalSecUsedByAppCode.set(appCode, currentAppCodeSecUsed + secUsed);
          }

          if (platform.length > 0) {
            const currentPlatformSecUsed = totalSecUsedByPlatform.get(platform) ?? 0;
            totalSecUsedByPlatform.set(platform, currentPlatformSecUsed + secUsed);
          }
        }

        if (Number.isFinite(userId)) {
          const userSet = uniqueUsersByCompany.get(companyId) ?? new Set<number>();
          userSet.add(userId);
          uniqueUsersByCompany.set(companyId, userSet);

          if (platform.length > 0) {
            const platformUserSet = uniqueUsersByPlatform.get(platform) ?? new Set<number>();
            platformUserSet.add(userId);
            uniqueUsersByPlatform.set(platform, platformUserSet);
          }
        }
      }

      this.sortedUsageEntries = Array.from(totalSecUsedByCompany.entries()).sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0] - b[0];
      });
      this.sortedUsersEntries = Array.from(uniqueUsersByCompany.entries())
        .map(([companyId, users]) => [companyId, users.size] as [number, number])
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }

          return a[0] - b[0];
        });
      this.sortedAppCodeEntries = Array.from(totalSecUsedByAppCode.entries()).sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0].localeCompare(b[0], 'sv');
      });
      this.sortedPlatformEntries = Array.from(totalSecUsedByPlatform.entries()).sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0].localeCompare(b[0], 'sv');
      });
      this.platformUserCounts = this.sortedPlatformEntries.map(([platform]) => uniqueUsersByPlatform.get(platform)?.size ?? 0);

      const allCompanyIds = new Set<number>();
      for (const [companyId] of this.sortedUsageEntries) {
        allCompanyIds.add(companyId);
      }
      for (const [companyId] of this.sortedUsersEntries) {
        allCompanyIds.add(companyId);
      }

      this.companyNameMap = this.getCompanyNameMap(Array.from(allCompanyIds));
      this.applyDisplayLimit();
    } catch (error) {
      console.error('Kunde inte ladda översiktsdiagram.', error);
      this.usageChartData = {
        labels: [],
        datasets: [
          {
            ...this.usageChartData.datasets[0],
            data: [],
          },
        ],
      };
      this.usersChartData = {
        labels: [],
        datasets: [
          {
            ...this.usersChartData.datasets[0],
            data: [],
          },
        ],
      };
      this.appCodeChartData = {
        labels: [],
        datasets: [
          {
            ...this.appCodeChartData.datasets[0],
            data: [],
            backgroundColor: [],
          },
        ],
      };
      this.platformChartData = {
        labels: [],
        datasets: [
          {
            ...this.platformChartData.datasets[0],
            data: [],
            backgroundColor: [],
          },
        ],
      };
      this.sortedUsageEntries = [];
      this.sortedUsersEntries = [];
      this.sortedAppCodeEntries = [];
      this.sortedPlatformEntries = [];
      this.platformUserCounts = [];
      this.companyNameMap = new Map<number, string>();
      this.hasUsageData = false;
      this.hasUsersData = false;
      this.hasAppCodeData = false;
      this.hasPlatformData = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  increaseDisplayLimit(): void {
    if (!this.canIncreaseDisplayLimit) {
      return;
    }

    this.displayLimit += this.stepSize;
    this.applyDisplayLimit();
    this.cdr.markForCheck();
  }

  decreaseDisplayLimit(): void {
    if (!this.canDecreaseDisplayLimit) {
      return;
    }

    this.displayLimit = Math.max(this.stepSize, this.displayLimit - this.stepSize);
    this.applyDisplayLimit();
    this.cdr.markForCheck();
  }

  get canIncreaseDisplayLimit(): boolean {
    const maxEntries = Math.max(this.sortedUsageEntries.length, this.sortedUsersEntries.length);
    return this.displayLimit < maxEntries;
  }

  get canDecreaseDisplayLimit(): boolean {
    return this.displayLimit > this.stepSize;
  }

  private applyDisplayLimit(): void {
    const usageEntries = this.sortedUsageEntries.slice(0, this.displayLimit);
    const usersEntries = this.sortedUsersEntries.slice(0, this.displayLimit);

    const usageLabels = usageEntries.map(
      ([companyId]) => this.companyNameMap.get(companyId) || `Företag ${companyId}`,
    );
    const usageDataInHours = usageEntries.map(([, totalSecUsed]) =>
      Number((totalSecUsed / 3600).toFixed(2)),
    );
    const usersLabels = usersEntries.map(
      ([companyId]) => this.companyNameMap.get(companyId) || `Företag ${companyId}`,
    );
    const usersData = usersEntries.map(([, totalUsers]) => totalUsers);
    const appCodeLabels = this.sortedAppCodeEntries.map(([appCode]) => this.globalService.appCodeToName(appCode));
    const platformLabels = this.sortedPlatformEntries.map(([platform]) => platform);
    const appCodeDataInHours = this.sortedAppCodeEntries.map(([, totalSecUsed]) =>
      Number((totalSecUsed / 3600).toFixed(2)),
    );
    const platformDataInHours = this.sortedPlatformEntries.map(([, totalSecUsed]) =>
      Number((totalSecUsed / 3600).toFixed(2)),
    );
    const pieColors = appCodeLabels.map((_, index) => this.pieColors[index % this.pieColors.length]);
    const platformPieColors = platformLabels.map((_, index) => this.pieColors[index % this.pieColors.length]);

    this.usageChartData = {
      labels: usageLabels,
      datasets: [
        {
          ...this.usageChartData.datasets[0],
          data: usageDataInHours,
        },
      ],
    };

    this.usersChartData = {
      labels: usersLabels,
      datasets: [
        {
          ...this.usersChartData.datasets[0],
          data: usersData,
        },
      ],
    };

    this.appCodeChartData = {
      labels: appCodeLabels,
      datasets: [
        {
          ...this.appCodeChartData.datasets[0],
          data: appCodeDataInHours,
          backgroundColor: pieColors,
        },
      ],
    };

    this.platformChartData = {
      labels: platformLabels,
      datasets: [
        {
          ...this.platformChartData.datasets[0],
          data: platformDataInHours,
          backgroundColor: platformPieColors,
        },
      ],
    };

    this.hasUsageData = usageDataInHours.length > 0;
    this.hasUsersData = usersData.length > 0;
    this.hasAppCodeData = appCodeDataInHours.length > 0;
    this.hasPlatformData = platformDataInHours.length > 0;
  }

  private getCompanyNameMap(companyIds: number[]): Map<number, string> {
    if (companyIds.length === 0) {
      return new Map<number, string>();
    }

    const allowedCompanyIds = new Set(companyIds);
    const companyNameMap = new Map<number, string>();

    for (const item of this.globalService.getAllCompanyNames()) {
      const companyId = Number(item?.CompanyId);
      const companyName = typeof item?.CompanyName === 'string' ? item.CompanyName.trim() : '';
      if (allowedCompanyIds.has(companyId) && companyName.length > 0) {
        companyNameMap.set(companyId, companyName);
      }
    }

    return companyNameMap;
  }

  private normalizeStatsUserTimeList(response: unknown): StatsUserTime[] {
    if (!Array.isArray(response)) {
      return [];
    }

    const users: StatsUserTime[] = [];
    for (const item of response) {
      const userId = Number((item as Partial<StatsUserTime>)?.UserId);
      const companyId = Number((item as Partial<StatsUserTime>)?.CompanyId);
      const secUsed = Number((item as Partial<StatsUserTime>)?.SecUsed);
      const startTs = Number((item as Partial<StatsUserTime>)?.StartTS);
      const endTs = Number((item as Partial<StatsUserTime>)?.EndTS);
      const appCode = typeof (item as Partial<StatsUserTime>)?.AppCode === 'string'
        ? ((item as Partial<StatsUserTime>).AppCode as string).trim()
        : '';
      const platform = typeof (item as Partial<StatsUserTime>)?.Platform === 'string'
        ? ((item as Partial<StatsUserTime>).Platform as string).trim()
        : '';

      if (
        !Number.isFinite(userId) ||
        !Number.isFinite(companyId) ||
        !Number.isFinite(secUsed) ||
        !Number.isFinite(startTs) ||
        !Number.isFinite(endTs)
      ) {
        continue;
      }

      const stats = new StatsUserTime();
      stats.UserId = userId;
      stats.CompanyId = companyId;
      stats.AppCode = appCode;
      stats.Platform = platform;
      stats.SecUsed = secUsed;
      stats.StartTS = startTs;
      stats.EndTS = endTs;
      users.push(stats);
    }

    return users;
  }
}

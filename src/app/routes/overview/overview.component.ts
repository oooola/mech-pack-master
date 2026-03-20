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
  private sortedAppCodeEntries: [string, number][] = [];
  private sortedPlatformEntries: [string, number][] = [];
  private platformUserCounts: number[] = [];
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

  selectedDistributionTabIndex = 0;

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
          if (platform.length > 0) {
            const platformUserSet = uniqueUsersByPlatform.get(platform) ?? new Set<number>();
            platformUserSet.add(userId);
            uniqueUsersByPlatform.set(platform, platformUserSet);
          }
        }
      }

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
      this.applyChartData();
    } catch (error) {
      console.error('Kunde inte ladda översiktsdiagram.', error);
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
      this.sortedAppCodeEntries = [];
      this.sortedPlatformEntries = [];
      this.platformUserCounts = [];
      this.hasAppCodeData = false;
      this.hasPlatformData = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  private applyChartData(): void {
    const appCodeLabels = this.sortedAppCodeEntries.map(([appCode]) => this.globalService.appCodeToName(appCode));
    const platformLabels = this.sortedPlatformEntries.map(([platform]) => platform);
    const appCodeDataInHours = this.sortedAppCodeEntries.map(([, totalSecUsed]) =>
      Number((totalSecUsed / 3600).toFixed(2)),
    );
    const platformDataInHours = this.sortedPlatformEntries.map(([, totalSecUsed]) =>
      Number((totalSecUsed / 3600).toFixed(2)),
    );
    const pieColors = this.sortedAppCodeEntries.map(([appCode]) => this.globalService.appCodeToChartColor(appCode));
    const platformPieColors = platformLabels.map((_, index) => this.pieColors[index % this.pieColors.length]);

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

    this.hasAppCodeData = appCodeDataInHours.length > 0;
    this.hasPlatformData = platformDataInHours.length > 0;
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CompanyNames } from '@shared/models/company-names';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { GlobalService, PageHeaderComponent } from '@shared';

type CompanyStatusRow = {
  companyName: string;
  loggedInCount: number;
};

@Component({
  selector: 'app-current-status',
  templateUrl: './current-status.component.html',
  styleUrl: './current-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PageHeaderComponent],
})
export class CurrentStatusComponent implements OnInit {
  private readonly globalService = inject(GlobalService);
  private readonly cdr = inject(ChangeDetectorRef);

  rows: CompanyStatusRow[] = [];

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([
        this.globalService.ensureAllCompanyNamesLoaded(),
        this.globalService.ensureCurrentOnlineUsersLoaded(),
      ]);

      const companies = this.globalService.getAllCompanyNames();
      const onlineUsers = this.globalService.getCurrentOnlineUsers();
      this.rows = this.buildRows(companies, onlineUsers);
    } catch (error) {
      console.error('Kunde inte ladda statuslistan.', error);
      this.rows = [];
    } finally {
      this.cdr.markForCheck();
    }
  }

  private buildRows(companies: CompanyNames[], onlineUsers: StatsUserTime[]): CompanyStatusRow[] {
    const companyNameById = new Map<number, string>();
    for (const company of companies) {
      companyNameById.set(company.CompanyId, company.CompanyName);
    }

    const uniqueUsersByCompany = new Map<number, Set<number>>();
    for (const item of onlineUsers) {
      if (!uniqueUsersByCompany.has(item.CompanyId)) {
        uniqueUsersByCompany.set(item.CompanyId, new Set<number>());
      }
      uniqueUsersByCompany.get(item.CompanyId)?.add(item.UserId);
    }

    const rows: CompanyStatusRow[] = [];
    uniqueUsersByCompany.forEach((userIds, companyId) => {
      rows.push({
        companyName: companyNameById.get(companyId) ?? `Okänt företag (${companyId})`,
        loggedInCount: userIds.size,
      });
    });

    rows.sort((a, b) => b.loggedInCount - a.loggedInCount || a.companyName.localeCompare(b.companyName, 'sv'));
    return rows;
  }
}

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Company } from '@shared/models/company';
import { CompanyNames } from '@shared/models/company-names';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { BackendService, GlobalService, PageHeaderComponent } from '@shared';
import { CompanySettings } from '@shared/models/company-settings';

type CompanyStatusRow = {
  companyId: number;
  companyName: string;
  loggedInCount: number;
};

type ParticipantStatusRow = {
  participantName: string;
  groupName: string;
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
  private readonly backendService = inject(BackendService);
  private readonly globalService = inject(GlobalService);
  private readonly cdr = inject(ChangeDetectorRef);

  rows: CompanyStatusRow[] = [];
  participantRows: ParticipantStatusRow[] = [];
  companyList: CompanyNames[] = [];
  companyFromBackend: Company | null = null;
  selectedCompanyId: number | null = null;

  get selectedCompanyName(): string {
    if (this.companyFromBackend?.Name) {
      return this.companyFromBackend.Name;
    }

    if (!this.selectedCompanyId) {
      return '';
    }

    const company = this.companyList.find(item => item.CompanyId === this.selectedCompanyId);
    return company?.CompanyName ?? `Okänt företag (${this.selectedCompanyId})`;
  }

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([
        this.globalService.ensureAllCompanyNamesLoaded(),
        this.globalService.ensureCurrentOnlineUsersLoaded(),
      ]);

      const companies = this.globalService.getAllCompanyNames();
      const onlineUsers = this.globalService.getCurrentOnlineUsers();
      this.companyList = companies;
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
        companyId,
        companyName: companyNameById.get(companyId) ?? `Okänt företag (${companyId})`,
        loggedInCount: userIds.size,
      });
    });

    rows.sort((a, b) => b.loggedInCount - a.loggedInCount || a.companyName.localeCompare(b.companyName, 'sv'));
    return rows;
  }

  async onUpdateClick(): Promise<void> {

    // let ola = await this.backendService.getCompanyKeyFromId(4, this.globalService.getJwt());
    // ola = ola;
    const cs = new CompanySettings;
    cs.id = 4;
    cs.CustomerNumber = '112233';
    await this.backendService.setCompanySettings(cs, this.globalService.getJwt());

    await this.globalService.refreshCurrentOnlineUsers();
    const companies = this.globalService.getAllCompanyNames();
    const onlineUsers = this.globalService.getCurrentOnlineUsers();
    this.rows = this.buildRows(companies, onlineUsers);

    if (this.selectedCompanyId) {
      await this.onCompanyClick(this.selectedCompanyId);
    }
    this.cdr.markForCheck();
  }

  async onCompanyClick(companyId: number): Promise<void> {
    const jwt = this.globalService.getJwt();
    if (jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
      return;
    }

    const companyJson = await this.backendService.getCompany(companyId, jwt);
    this.companyFromBackend = Company.fromApi(companyJson);
    this.selectedCompanyId = companyId;
    this.participantRows = this.buildParticipantRows(companyId, this.companyFromBackend);
    this.cdr.markForCheck();
  }

  private buildParticipantRows(companyId: number, company: Company): ParticipantStatusRow[] {
    const rows: ParticipantStatusRow[] = [];
    const usersById = new Map<number, { name: string; groupName: string }>();

    for (const group of company.classes) {
      for (const user of group.Users) {
        usersById.set(user.id, {
          name: user.Name || user.Username || `User ${user.id}`,
          groupName: group.Name || '-',
        });
      }
    }

    const onlineUsers = this.globalService
      .getCurrentOnlineUsers()
      .filter(item => item.CompanyId === companyId);
    const onlineUserIds = new Set(onlineUsers.map(item => item.UserId));

    onlineUserIds.forEach(userId => {
      const user = usersById.get(userId);
      rows.push({
        participantName: user?.name ?? `User ${userId}`,
        groupName: user?.groupName ?? '-',
      });
    });

    rows.sort((a, b) => a.participantName.localeCompare(b.participantName, 'sv'));
    return rows;
  }
}

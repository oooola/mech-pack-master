import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MenuService } from '@core';
import { BackendService, GlobalService, PageHeaderComponent } from '@shared';
import { Company } from '@shared/models/company';
import { CompanyNames } from '@shared/models/company-names';
import { CompanySettings } from '@shared/models/company-settings';
import { License } from '@shared/models/license';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { Group } from '@shared/models/group';
import { Subscription, firstValueFrom } from 'rxjs';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog.component';

interface CompanyDetails {
  name: string;
  licenseKey: string;
  pinCode: string;
  customerNumber: string;
  licenseStatus: 'Aktiv' | 'Avstängd';
  maxUsers: number;
  licenseExpiresAt: string;
}

interface CompanyGroupParticipantRow {
  groupId: number;
  groupName: string;
  participantCount: number;
  lastActiveLabel: string;
}

interface CompanyGroupUserRow {
  id: number;
  participantName: string;
  lastActiveLabel: string;
}

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrl: './company.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PageHeaderComponent],
})
export class CompanyComponent implements OnInit, OnDestroy {
  private readonly backendService = inject(BackendService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly globalService = inject(GlobalService);
  private readonly menuService = inject(MenuService);
  private discardDialogPromise: Promise<boolean> | null = null;
  private menuClickSubscription: Subscription | null = null;
  private companyNameEntries: CompanyNames[] = [];
  private selectedCompanyId: number | null = null;
  private selectedCompanyGroups: Group[] = [];

  searchTerm = '';
  isListOpen = true;
  selectedCompanyDetails: CompanyDetails | null = null;
  companyGroupParticipantRows: CompanyGroupParticipantRow[] = [];
  selectedGroupName = '';
  selectedGroupUserRows: CompanyGroupUserRow[] = [];
  showGroupParticipants = false;
  hasLoadedGroupParticipants = false;
  isLoadingGroupParticipants = false;
  originalName: string | null = null;
  originalCustomerNumber: string | null = null;
  originalMaxUsers: number | null = null;
  originalLicenseExpiresAt: string | null = null;
  originalLicenseStatus: CompanyDetails['licenseStatus'] | null = null;
  hasPendingChanges = false;
  isUpdating = false;
  isEditingName = false;
  isEditingCustomerNumber = false;
  isEditingMaxUsers = false;
  isEditingLicenseExpiresAt = false;
  isEditingLicenseStatus = false;
  nameDraft = '';
  customerNumberDraft = '';
  maxUsersDraft = '';
  licenseExpiresAtDraft = '';
  licenseStatusDraft: CompanyDetails['licenseStatus'] = 'Aktiv';

  async ngOnInit(): Promise<void> {
    await this.globalService.ensureAllCompanyNamesLoaded();
    this.companyNameEntries = this.globalService.getAllCompanyNames();
    this.menuClickSubscription = this.menuService.clicks().subscribe(route => {
      if (route === 'company' && this.selectedCompanyDetails) {
        this.startSearchMode('');
        this.cdr.markForCheck();
      }
    });
    this.cdr.markForCheck();
  }

  get visibleCompanies() {
    if (!this.isListOpen) {
      return [];
    }

    const term = this.searchTerm.trim().toLocaleLowerCase('sv');
    if (!term) {
      return this.companyNameEntries.map(company => company.CompanyName);
    }

    return this.companyNameEntries
      .filter(company => company.CompanyName.toLocaleLowerCase('sv').includes(term))
      .map(company => company.CompanyName);
  }

  async onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const nextSearchTerm = input?.value ?? '';

    const canProceed = await this.confirmDiscardChangesIfNeeded();
    if (!canProceed) {
      if (input) {
        input.value = this.searchTerm;
      }
      input?.blur();
      return;
    }

    this.startSearchMode(nextSearchTerm);
  }

  async onSearchFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement | null;
    const canProceed = await this.confirmDiscardChangesIfNeeded();
    if (!canProceed) {
      input?.blur();
      return;
    }

    this.startSearchMode(this.searchTerm);
  }

  async onSearchEnter(event: Event) {
    event.preventDefault();

    const input = event.target as HTMLInputElement | null;
    const term = (input?.value ?? this.searchTerm).trim().toLocaleLowerCase('sv');
    const firstVisibleCompany = this.companyNameEntries
      .map(company => company.CompanyName)
      .find(companyName => term.length === 0 || companyName.toLocaleLowerCase('sv').includes(term));

    if (!firstVisibleCompany) {
      return;
    }

    await this.onCompanySelect(firstVisibleCompany);
  }

  async onCompanySelect(company: string) {
    this.searchTerm = company;
    this.isListOpen = false;
    this.resetEditState();

    const companyId = this.companyNameEntries.find(item => item.CompanyName === company)?.CompanyId;
    const jwt = this.globalService.getJwt();
    if (!companyId || jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
      this.selectedCompanyId = null;
      this.selectedCompanyDetails = null;
      this.cdr.markForCheck();
      return;
    }

    try {
      const [companyResponse, companyKey] = await Promise.all([
        this.backendService.getCompany(companyId, jwt),
        this.backendService.getCompanyKeyFromId(companyId, jwt),
      ]);
      const companyData = Company.fromApi(companyResponse);
      const license = this.getPrimaryLicense(companyData.licenses);

      this.selectedCompanyDetails = {
        name: companyData.Name || company,
        licenseKey: companyKey || '',
        pinCode: companyData.Password || '',
        customerNumber: companyData.Kundnr || '',
        licenseStatus: !companyData.Masterblock ? 'Aktiv' : 'Avstängd',
        maxUsers: license?.NumLicenses ?? 0,
        licenseExpiresAt: this.toDateInputValue(license?.ExpirationDate),
      };

      this.originalMaxUsers = this.selectedCompanyDetails.maxUsers;
      this.originalLicenseExpiresAt = this.selectedCompanyDetails.licenseExpiresAt;
      this.originalLicenseStatus = this.selectedCompanyDetails.licenseStatus;
      this.originalName = this.selectedCompanyDetails.name;
      this.originalCustomerNumber = this.selectedCompanyDetails.customerNumber;
      this.selectedCompanyId = companyId;
      this.selectedCompanyGroups = companyData.classes;
      this.companyGroupParticipantRows = [];
      this.selectedGroupName = '';
      this.selectedGroupUserRows = [];
      this.showGroupParticipants = false;
      this.hasLoadedGroupParticipants = false;
      this.isLoadingGroupParticipants = false;
      this.hasPendingChanges = false;
      this.licenseStatusDraft = this.selectedCompanyDetails.licenseStatus;
    } catch (error) {
      console.error('Kunde inte hämta företagsdata.', error);
      this.selectedCompanyId = null;
      this.selectedCompanyDetails = null;
      this.selectedCompanyGroups = [];
      this.companyGroupParticipantRows = [];
      this.selectedGroupName = '';
      this.selectedGroupUserRows = [];
      this.showGroupParticipants = false;
      this.hasLoadedGroupParticipants = false;
      this.isLoadingGroupParticipants = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async onToggleGroupParticipants() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    if (this.showGroupParticipants) {
      this.showGroupParticipants = false;
      this.selectedGroupName = '';
      this.selectedGroupUserRows = [];
      this.cdr.markForCheck();
      return;
    }

    this.showGroupParticipants = true;
    this.selectedGroupName = '';
    this.selectedGroupUserRows = [];

    if (!this.hasLoadedGroupParticipants) {
      this.isLoadingGroupParticipants = true;
      this.cdr.markForCheck();

      try {
        const stats = await this.getStatsUserTime();
        this.companyGroupParticipantRows = this.buildCompanyGroupParticipantRows(this.selectedCompanyGroups, stats);
      } catch (statsError) {
        console.error('Kunde inte hämta aktivitetsdata för grupper.', statsError);
        this.companyGroupParticipantRows = this.buildCompanyGroupParticipantRows(this.selectedCompanyGroups, []);
      } finally {
        this.isLoadingGroupParticipants = false;
        this.hasLoadedGroupParticipants = true;
        this.cdr.markForCheck();
      }
      return;
    }

    this.cdr.markForCheck();
  }

  onGroupSelect(groupId: number) {
    const selectedGroup = this.companyGroupParticipantRows.find(group => group.groupId === groupId);
    if (!selectedGroup) {
      return;
    }

    this.selectedGroupName = selectedGroup.groupName;
    this.selectedGroupUserRows = this.buildGroupUserRows(groupId);
  }

  onBackToGroupList() {
    this.selectedGroupName = '';
    this.selectedGroupUserRows = [];
  }

  async onCopyLicenseKey(): Promise<void> {
    await this.onCopyText(this.selectedCompanyDetails?.licenseKey ?? '');
  }

  async onCopyText(value: string): Promise<void> {
    const text = value.trim();
    if (!text || text === '-') {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Kunde inte kopiera texten.', error);
    }
  }

  onMaxUsersEditStart() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    if (this.isEditingName) {
      this.onNameSave();
    }
    if (this.isEditingCustomerNumber) {
      this.onCustomerNumberSave();
    }
    if (this.isEditingLicenseExpiresAt) {
      this.onLicenseExpiresSave();
    }
    if (this.isEditingLicenseStatus) {
      this.onLicenseStatusSave();
    }

    this.isEditingMaxUsers = true;
    this.maxUsersDraft = String(this.selectedCompanyDetails.maxUsers);
  }

  onMaxUsersInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.maxUsersDraft = input?.value ?? '';
    this.updatePendingChangesForMaxUsersDraft();
  }

  onMaxUsersSave() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    const parsed = Number(this.maxUsersDraft);
    if (!Number.isInteger(parsed) || parsed < 1) {
      this.isEditingMaxUsers = false;
      this.maxUsersDraft = '';
      this.updatePendingChanges();
      return;
    }

    this.selectedCompanyDetails = {
      ...this.selectedCompanyDetails,
      maxUsers: parsed,
    };
    this.updatePendingChanges();
    this.isEditingMaxUsers = false;
    this.maxUsersDraft = '';
  }

  onMaxUsersStep(delta: number) {
    if (!this.selectedCompanyDetails) {
      return;
    }

    const current = Number(this.maxUsersDraft);
    const base = Number.isInteger(current) && current > 0 ? current : this.selectedCompanyDetails.maxUsers;
    const next = Math.max(1, base + delta);
    this.maxUsersDraft = String(next);
    this.updatePendingChangesForMaxUsersDraft();
  }

  onMaxUsersCancel() {
    this.isEditingMaxUsers = false;
    this.maxUsersDraft = '';
    this.updatePendingChanges();
  }

  onLicenseExpiresEditStart() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    if (this.isEditingName) {
      this.onNameSave();
    }
    if (this.isEditingCustomerNumber) {
      this.onCustomerNumberSave();
    }
    if (this.isEditingMaxUsers) {
      this.onMaxUsersSave();
    }
    if (this.isEditingLicenseStatus) {
      this.onLicenseStatusSave();
    }

    this.isEditingLicenseExpiresAt = true;
    this.licenseExpiresAtDraft = this.selectedCompanyDetails.licenseExpiresAt;
  }

  onLicenseExpiresInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.licenseExpiresAtDraft = input?.value ?? '';
    this.updatePendingChangesForLicenseExpiresAtDraft();
  }

  onLicenseExpiresSave() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    const trimmed = this.licenseExpiresAtDraft.trim();
    if (!trimmed) {
      this.isEditingLicenseExpiresAt = false;
      this.licenseExpiresAtDraft = '';
      return;
    }

    this.selectedCompanyDetails = {
      ...this.selectedCompanyDetails,
      licenseExpiresAt: trimmed,
    };
    this.updatePendingChanges();
    this.isEditingLicenseExpiresAt = false;
    this.licenseExpiresAtDraft = '';
    this.updatePendingChanges();
  }

  onLicenseExpiresCancel() {
    this.isEditingLicenseExpiresAt = false;
    this.licenseExpiresAtDraft = '';
  }

  onLicenseStatusEditStart() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    if (this.isEditingName) {
      this.onNameSave();
    }
    if (this.isEditingCustomerNumber) {
      this.onCustomerNumberSave();
    }
    if (this.isEditingMaxUsers) {
      this.onMaxUsersSave();
    }
    if (this.isEditingLicenseExpiresAt) {
      this.onLicenseExpiresSave();
    }

    this.isEditingLicenseStatus = true;
    this.licenseStatusDraft = this.selectedCompanyDetails.licenseStatus;
  }

  onLicenseStatusChange(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const value = select?.value === 'Avstängd' ? 'Avstängd' : 'Aktiv';
    this.licenseStatusDraft = value;
    this.onLicenseStatusSave();
  }

  onLicenseStatusSave() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    this.selectedCompanyDetails = {
      ...this.selectedCompanyDetails,
      licenseStatus: this.licenseStatusDraft,
    };
    this.updatePendingChanges();
    this.isEditingLicenseStatus = false;
  }

  onLicenseStatusCancel() {
    this.isEditingLicenseStatus = false;
    if (this.selectedCompanyDetails) {
      this.licenseStatusDraft = this.selectedCompanyDetails.licenseStatus;
    }
  }

  onOpenLicenseDatePicker(input: HTMLInputElement) {
    input.focus();
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
  }

  isLicenseExpired(dateValue: string) {
    const parts = dateValue.split('-').map(part => Number(part));
    if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) {
      return false;
    }

    const [year, month, day] = parts;
    const expiresAt = new Date(year, month - 1, day);
    expiresAt.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today > expiresAt;
  }

  async onResetAdminPassword() {
    if (!this.selectedCompanyId || !this.searchTerm.trim()) {
      return;
    }

    const jwt = this.globalService.getJwt();
    if (jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
      return;
    }

    try {
      this.isUpdating = true;
      this.cdr.markForCheck();

      await this.backendService.resetAdminPassword(this.selectedCompanyId, jwt);
      await this.onCompanySelect(this.searchTerm);
    } catch (error) {
      console.error('Kunde inte återställa admin-lösenord.', error);
    } finally {
      this.isUpdating = false;
      this.cdr.markForCheck();
    }
  }

  onNameEditStart() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    if (this.isEditingCustomerNumber) {
      this.onCustomerNumberSave();
    }
    if (this.isEditingMaxUsers) {
      this.onMaxUsersSave();
    }
    if (this.isEditingLicenseExpiresAt) {
      this.onLicenseExpiresSave();
    }
    if (this.isEditingLicenseStatus) {
      this.onLicenseStatusSave();
    }

    this.isEditingName = true;
    this.nameDraft = this.selectedCompanyDetails.name;
  }

  onNameInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.nameDraft = input?.value ?? '';
    this.updatePendingChangesForNameDraft();
  }

  onNameSave() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    this.selectedCompanyDetails = {
      ...this.selectedCompanyDetails,
      name: this.nameDraft.trim(),
    };
    this.isEditingName = false;
    this.nameDraft = '';
    this.updatePendingChanges();
  }

  onNameCancel() {
    this.isEditingName = false;
    this.nameDraft = '';
    this.updatePendingChanges();
  }

  onCustomerNumberEditStart() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    if (this.isEditingMaxUsers) {
      this.onMaxUsersSave();
    }
    if (this.isEditingLicenseExpiresAt) {
      this.onLicenseExpiresSave();
    }
    if (this.isEditingLicenseStatus) {
      this.onLicenseStatusSave();
    }

    this.isEditingCustomerNumber = true;
    this.customerNumberDraft = this.selectedCompanyDetails.customerNumber;
  }

  onCustomerNumberInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.customerNumberDraft = input?.value ?? '';
    this.updatePendingChangesForCustomerNumberDraft();
  }

  onCustomerNumberSave() {
    if (!this.selectedCompanyDetails) {
      return;
    }

    this.selectedCompanyDetails = {
      ...this.selectedCompanyDetails,
      customerNumber: this.customerNumberDraft.trim(),
    };
    this.isEditingCustomerNumber = false;
    this.customerNumberDraft = '';
    this.updatePendingChanges();
  }

  onCustomerNumberCancel() {
    this.isEditingCustomerNumber = false;
    this.customerNumberDraft = '';
    this.updatePendingChanges();
  }

  async onUpdateCompany() {
    if (this.isEditingName) {
      this.onNameSave();
    }
    if (this.isEditingCustomerNumber) {
      this.onCustomerNumberSave();
    }
    if (this.isEditingMaxUsers) {
      this.onMaxUsersSave();
    }
    if (this.isEditingLicenseExpiresAt) {
      this.onLicenseExpiresSave();
    }
    if (this.isEditingLicenseStatus) {
      this.onLicenseStatusSave();
    }

    if (!this.selectedCompanyDetails || !this.selectedCompanyId || this.isUpdating || !this.hasPendingChanges) {
      return;
    }

    this.isUpdating = true;
    this.cdr.markForCheck();

    try {
      const jwt = this.globalService.getJwt();
      if (jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
        throw new Error('JWT saknas eller har gått ut.');
      }

      const companyKey = await this.backendService.getCompanyKeyFromId(this.selectedCompanyId, jwt);
      const settings = new CompanySettings();
      settings.Key = companyKey;
      settings.id = this.selectedCompanyId;

      const hasMaxUsersChanges =
        this.originalMaxUsers !== null && this.selectedCompanyDetails.maxUsers !== this.originalMaxUsers;
      const hasLicenseExpiryChanges =
        this.originalLicenseExpiresAt !== null &&
        this.selectedCompanyDetails.licenseExpiresAt !== this.originalLicenseExpiresAt;
      const hasNameChanges =
        this.originalName !== null &&
        this.selectedCompanyDetails.name !== this.originalName;
      const hasCustomerNumberChanges =
        this.originalCustomerNumber !== null &&
        this.selectedCompanyDetails.customerNumber !== this.originalCustomerNumber;

      if (hasNameChanges) {
        settings.Name = this.selectedCompanyDetails.name;
      }
      if (hasCustomerNumberChanges) {
        settings.CustomerNumber = this.selectedCompanyDetails.customerNumber;
      }

      if (hasMaxUsersChanges) {
        settings.NumLicenses = this.selectedCompanyDetails.maxUsers;
      }

      if (hasLicenseExpiryChanges) {
        settings.ExpirationDate = this.selectedCompanyDetails.licenseExpiresAt;
      }

      await this.backendService.setCompanySettings(settings, jwt);

      if (hasMaxUsersChanges) {
        this.originalMaxUsers = this.selectedCompanyDetails.maxUsers;
      }
      if (hasLicenseExpiryChanges) {
        this.originalLicenseExpiresAt = this.selectedCompanyDetails.licenseExpiresAt;
      }
      if (hasNameChanges) {
        this.originalName = this.selectedCompanyDetails.name;
        this.searchTerm = this.selectedCompanyDetails.name;
        this.companyNameEntries = this.companyNameEntries.map(item =>
          item.CompanyId === this.selectedCompanyId
            ? { ...item, CompanyName: this.selectedCompanyDetails?.name ?? item.CompanyName }
            : item
        );
      }
      if (hasCustomerNumberChanges) {
        this.originalCustomerNumber = this.selectedCompanyDetails.customerNumber;
      }

      this.isEditingName = false;
      this.isEditingCustomerNumber = false;
      this.isEditingMaxUsers = false;
      this.isEditingLicenseExpiresAt = false;
      this.isEditingLicenseStatus = false;
      this.nameDraft = '';
      this.customerNumberDraft = '';
      this.maxUsersDraft = '';
      this.licenseExpiresAtDraft = '';
      this.licenseStatusDraft = this.selectedCompanyDetails.licenseStatus;
      this.updatePendingChanges();
    } catch (error) {
      console.error('Kunde inte uppdatera företagsinställningar.', error);
    } finally {
      this.isUpdating = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.isUpdating = false;
    this.menuClickSubscription?.unsubscribe();
  }

  private getPrimaryLicense(licenses: License[]): License | null {
    return licenses.length > 0 ? licenses[0] : null;
  }

  private toDateInputValue(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private clearUpdateState() {
    this.isUpdating = false;
    this.cdr.markForCheck();
  }

  private startSearchMode(nextSearchTerm: string) {
    this.searchTerm = nextSearchTerm;
    this.isListOpen = true;
    this.resetEditState();
  }

  private resetEditState() {
    this.selectedCompanyId = null;
    this.selectedCompanyDetails = null;
    this.selectedCompanyGroups = [];
    this.companyGroupParticipantRows = [];
    this.selectedGroupName = '';
    this.selectedGroupUserRows = [];
    this.showGroupParticipants = false;
    this.hasLoadedGroupParticipants = false;
    this.isLoadingGroupParticipants = false;
    this.originalName = null;
    this.originalCustomerNumber = null;
    this.originalMaxUsers = null;
    this.originalLicenseExpiresAt = null;
    this.originalLicenseStatus = null;
    this.hasPendingChanges = false;
    this.clearUpdateState();
    this.isEditingName = false;
    this.isEditingCustomerNumber = false;
    this.isEditingMaxUsers = false;
    this.isEditingLicenseExpiresAt = false;
    this.isEditingLicenseStatus = false;
    this.nameDraft = '';
    this.customerNumberDraft = '';
    this.maxUsersDraft = '';
    this.licenseExpiresAtDraft = '';
    this.licenseStatusDraft = 'Aktiv';
  }

  private async getStatsUserTime(): Promise<StatsUserTime[]> {
    let stats = this.globalService.getStatsUserTime();
    if (stats.length > 0) {
      return stats;
    }

    const jwt = this.globalService.getJwt();
    if (jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
      return [];
    }

    const response = await this.backendService.getStatUserTime(jwt);
    stats = this.normalizeStatsUserTimeList(response);
    this.globalService.setStatsUserTime(stats);
    return stats;
  }

  private buildCompanyGroupParticipantRows(groups: Group[], stats: StatsUserTime[]): CompanyGroupParticipantRow[] {
    const statsByUserId = new Map<number, StatsUserTime[]>();
    for (const item of stats) {
      const userId = Number(item?.UserId);
      const companyId = Number(item?.CompanyId);
      if (
        !Number.isFinite(userId) ||
        !Number.isFinite(companyId) ||
        companyId !== this.selectedCompanyId
      ) {
        continue;
      }

      const items = statsByUserId.get(userId) ?? [];
      items.push(item);
      statsByUserId.set(userId, items);
    }

    return [...groups]
      .sort((a, b) => a.Name.localeCompare(b.Name, 'sv'))
      .map(group => {
        const participantCount = group.Users.length;
        let latestActivityTs = 0;

        for (const user of group.Users) {
          const userStats = statsByUserId.get(user.id) ?? [];
          for (const stat of userStats) {
            const endTs = Number(stat?.EndTS);
            const startTs = Number(stat?.StartTS);
            const activityTs = Number.isFinite(endTs) && endTs > 0 ? endTs : startTs;
            if (Number.isFinite(activityTs)) {
              latestActivityTs = Math.max(latestActivityTs, activityTs);
            }
          }
        }

        return {
          groupId: group.id,
          groupName: group.Name || '-',
          participantCount,
          lastActiveLabel: latestActivityTs > 0
            ? this.formatRelativeActivity(latestActivityTs)
            : 'Aldrig',
        };
      });
  }

  private buildGroupUserRows(groupId: number): CompanyGroupUserRow[] {
    if (!this.selectedCompanyId) {
      return [];
    }

    const statsByUserId = new Map<number, number>();
    for (const item of this.globalService.getStatsUserTime()) {
      const userId = Number(item?.UserId);
      const companyId = Number(item?.CompanyId);
      if (!Number.isFinite(userId) || !Number.isFinite(companyId) || companyId !== this.selectedCompanyId) {
        continue;
      }

      const endTs = Number(item?.EndTS);
      const startTs = Number(item?.StartTS);
      const activityTs = Number.isFinite(endTs) && endTs > 0 ? endTs : startTs;
      if (Number.isFinite(activityTs)) {
        statsByUserId.set(userId, Math.max(statsByUserId.get(userId) ?? 0, activityTs));
      }
    }

    const selectedGroup = this.selectedCompanyGroups.find(group => group.id === groupId);
    if (!selectedGroup) {
      return [];
    }

    return [...selectedGroup.Users]
      .map(user => {
        const displayName = user.Name.trim() || user.Username.trim() || `Användare ${user.id}`;
        const latestActivityTs = statsByUserId.get(user.id) ?? 0;

        return {
          id: user.id,
          participantName: displayName,
          lastActiveLabel: latestActivityTs > 0 ? this.formatRelativeActivity(latestActivityTs) : 'Aldrig',
        };
      })
      .sort((a, b) => a.participantName.localeCompare(b.participantName, 'sv'));
  }

  private formatRelativeActivity(activityTs: number): string {
    const nowTs = Date.now() / 1000;
    const diffSeconds = Math.max(0, Math.floor(nowTs - activityTs));

    if (diffSeconds < 24 * 60 * 60) {
      return 'Idag';
    }

    const diffDays = Math.floor(diffSeconds / (24 * 60 * 60));
    if (diffDays < 7) {
      return diffDays === 1 ? '1 dag sedan' : `${diffDays} dagar sedan`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffDays < 30) {
      return diffWeeks === 1 ? '1 vecka sedan' : `${diffWeeks} veckor sedan`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffDays < 365) {
      return diffMonths === 1 ? '1 månad sedan' : `${diffMonths} månader sedan`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return diffYears === 1 ? '1 år sedan' : `${diffYears} år sedan`;
  }

  private normalizeStatsUserTimeList(response: unknown): StatsUserTime[] {
    if (!Array.isArray(response)) {
      return [];
    }

    const statsList: StatsUserTime[] = [];
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
      statsList.push(stats);
    }

    return statsList;
  }

  private confirmDiscardChangesIfNeeded() {
    if (!(this.selectedCompanyDetails && this.hasPendingChanges)) {
      return Promise.resolve(true);
    }

    if (this.discardDialogPromise) {
      return this.discardDialogPromise;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '420px',
      autoFocus: false,
      restoreFocus: false,
      disableClose: true,
      panelClass: 'unsaved-changes-dialog-panel',
    });

    this.discardDialogPromise = firstValueFrom(dialogRef.afterClosed())
      .then(result => result === true)
      .finally(() => {
        this.discardDialogPromise = null;
      });

    return this.discardDialogPromise;
  }

  private updatePendingChanges() {
    if (!this.selectedCompanyDetails) {
      this.hasPendingChanges = false;
      return;
    }

    const hasMaxUsersChanges =
      this.originalMaxUsers !== null && this.selectedCompanyDetails.maxUsers !== this.originalMaxUsers;
    const hasLicenseExpiryChanges =
      this.originalLicenseExpiresAt !== null &&
      this.selectedCompanyDetails.licenseExpiresAt !== this.originalLicenseExpiresAt;
    const hasNameChanges =
      this.originalName !== null &&
      this.selectedCompanyDetails.name !== this.originalName;
    const hasCustomerNumberChanges =
      this.originalCustomerNumber !== null &&
      this.selectedCompanyDetails.customerNumber !== this.originalCustomerNumber;
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges =
      hasNameChanges || hasMaxUsersChanges || hasLicenseExpiryChanges || hasCustomerNumberChanges || hasLicenseStatusChanges;
  }

  private updatePendingChangesForMaxUsersDraft() {
    if (!this.selectedCompanyDetails) {
      this.hasPendingChanges = false;
      return;
    }

    const parsed = Number(this.maxUsersDraft);
    const hasValidDraft = Number.isInteger(parsed) && parsed >= 1;
    const hasMaxUsersChanges = hasValidDraft
      ? this.originalMaxUsers !== null && parsed !== this.originalMaxUsers
      : this.originalMaxUsers !== null && this.selectedCompanyDetails.maxUsers !== this.originalMaxUsers;
    const hasLicenseExpiryChanges =
      this.originalLicenseExpiresAt !== null &&
      this.selectedCompanyDetails.licenseExpiresAt !== this.originalLicenseExpiresAt;
    const hasNameChanges =
      this.originalName !== null &&
      this.selectedCompanyDetails.name !== this.originalName;
    const hasCustomerNumberChanges =
      this.originalCustomerNumber !== null &&
      this.selectedCompanyDetails.customerNumber !== this.originalCustomerNumber;
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges =
      hasNameChanges || hasMaxUsersChanges || hasLicenseExpiryChanges || hasCustomerNumberChanges || hasLicenseStatusChanges;
  }

  private updatePendingChangesForLicenseExpiresAtDraft() {
    if (!this.selectedCompanyDetails) {
      this.hasPendingChanges = false;
      return;
    }

    const draft = this.licenseExpiresAtDraft.trim();
    const hasLicenseExpiryChanges = this.originalLicenseExpiresAt !== null
      ? draft
        ? draft !== this.originalLicenseExpiresAt
        : this.selectedCompanyDetails.licenseExpiresAt !== this.originalLicenseExpiresAt
      : false;
    const hasMaxUsersChanges =
      this.originalMaxUsers !== null && this.selectedCompanyDetails.maxUsers !== this.originalMaxUsers;
    const hasNameChanges =
      this.originalName !== null &&
      this.selectedCompanyDetails.name !== this.originalName;
    const hasCustomerNumberChanges =
      this.originalCustomerNumber !== null &&
      this.selectedCompanyDetails.customerNumber !== this.originalCustomerNumber;
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges =
      hasNameChanges || hasMaxUsersChanges || hasLicenseExpiryChanges || hasCustomerNumberChanges || hasLicenseStatusChanges;
  }

  private updatePendingChangesForCustomerNumberDraft() {
    if (!this.selectedCompanyDetails) {
      this.hasPendingChanges = false;
      return;
    }

    const draft = this.customerNumberDraft.trim();
    const hasCustomerNumberChanges = this.originalCustomerNumber !== null
      ? draft !== this.originalCustomerNumber
      : false;
    const hasNameChanges =
      this.originalName !== null &&
      this.selectedCompanyDetails.name !== this.originalName;
    const hasMaxUsersChanges =
      this.originalMaxUsers !== null && this.selectedCompanyDetails.maxUsers !== this.originalMaxUsers;
    const hasLicenseExpiryChanges =
      this.originalLicenseExpiresAt !== null &&
      this.selectedCompanyDetails.licenseExpiresAt !== this.originalLicenseExpiresAt;
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges =
      hasNameChanges || hasCustomerNumberChanges || hasMaxUsersChanges || hasLicenseExpiryChanges || hasLicenseStatusChanges;
  }

  private updatePendingChangesForNameDraft() {
    if (!this.selectedCompanyDetails) {
      this.hasPendingChanges = false;
      return;
    }

    const draft = this.nameDraft.trim();
    const hasNameChanges = this.originalName !== null ? draft !== this.originalName : false;
    const hasCustomerNumberChanges =
      this.originalCustomerNumber !== null &&
      this.selectedCompanyDetails.customerNumber !== this.originalCustomerNumber;
    const hasMaxUsersChanges =
      this.originalMaxUsers !== null && this.selectedCompanyDetails.maxUsers !== this.originalMaxUsers;
    const hasLicenseExpiryChanges =
      this.originalLicenseExpiresAt !== null &&
      this.selectedCompanyDetails.licenseExpiresAt !== this.originalLicenseExpiresAt;
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges =
      hasNameChanges || hasCustomerNumberChanges || hasMaxUsersChanges || hasLicenseExpiryChanges || hasLicenseStatusChanges;
  }
}

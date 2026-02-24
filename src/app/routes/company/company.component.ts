import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GlobalService, PageHeaderComponent } from '@shared';
import { CompanyNames } from '@shared/models/company-names';
import { firstValueFrom } from 'rxjs';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog.component';

interface CompanyDetails {
  name: string;
  licenseKey: string;
  pinCode: string;
  licenseStatus: 'Aktiv' | 'Avstängd';
  maxUsers: number;
  licenseExpiresAt: string;
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly dialog = inject(MatDialog);
  private readonly globalService = inject(GlobalService);
  private updateTimeoutId: number | null = null;
  private discardDialogPromise: Promise<boolean> | null = null;
  private companyNameEntries: CompanyNames[] = [];

  searchTerm = '';
  isListOpen = true;
  selectedCompanyDetails: CompanyDetails | null = null;
  originalMaxUsers: number | null = null;
  originalLicenseExpiresAt: string | null = null;
  originalLicenseStatus: CompanyDetails['licenseStatus'] | null = null;
  hasPendingChanges = false;
  isUpdating = false;
  isEditingMaxUsers = false;
  isEditingLicenseExpiresAt = false;
  isEditingLicenseStatus = false;
  maxUsersDraft = '';
  licenseExpiresAtDraft = '';
  licenseStatusDraft: CompanyDetails['licenseStatus'] = 'Aktiv';

  async ngOnInit(): Promise<void> {
    await this.globalService.ensureAllCompanyNamesLoaded();
    this.companyNameEntries = this.globalService.getAllCompanyNames();
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

  onCompanySelect(company: string) {
    this.searchTerm = company;
    this.isListOpen = false;
    this.selectedCompanyDetails = this.buildCompanyDetails(company);
    this.originalMaxUsers = this.selectedCompanyDetails.maxUsers;
    this.originalLicenseExpiresAt = this.selectedCompanyDetails.licenseExpiresAt;
    this.originalLicenseStatus = this.selectedCompanyDetails.licenseStatus;
    this.hasPendingChanges = false;
    this.clearUpdateState();
    this.isEditingMaxUsers = false;
    this.isEditingLicenseExpiresAt = false;
    this.isEditingLicenseStatus = false;
    this.maxUsersDraft = '';
    this.licenseExpiresAtDraft = '';
    this.licenseStatusDraft = this.selectedCompanyDetails.licenseStatus;
  }

  onMaxUsersEditStart() {
    if (!this.selectedCompanyDetails) {
      return;
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

  onResetAdminPassword() {
    // Placeholder for integration to backend action.
  }

  onUpdateCompany() {
    if (this.isEditingMaxUsers) {
      this.onMaxUsersSave();
    }
    if (this.isEditingLicenseExpiresAt) {
      this.onLicenseExpiresSave();
    }
    if (this.isEditingLicenseStatus) {
      this.onLicenseStatusSave();
    }

    if (!this.selectedCompanyDetails || this.isUpdating || !this.hasPendingChanges) {
      return;
    }

    this.clearUpdateState();
    this.isUpdating = true;
    this.cdr.markForCheck();
    this.updateTimeoutId = window.setTimeout(() => {
      this.zone.run(() => {
        if (!this.selectedCompanyDetails) {
          this.isUpdating = false;
          this.updateTimeoutId = null;
          this.cdr.markForCheck();
          return;
        }

        this.originalMaxUsers = this.selectedCompanyDetails.maxUsers;
        this.originalLicenseExpiresAt = this.selectedCompanyDetails.licenseExpiresAt;
        this.originalLicenseStatus = this.selectedCompanyDetails.licenseStatus;
        this.hasPendingChanges = false;
        this.isEditingMaxUsers = false;
        this.isEditingLicenseExpiresAt = false;
        this.isEditingLicenseStatus = false;
        this.maxUsersDraft = '';
        this.licenseExpiresAtDraft = '';
        this.licenseStatusDraft = this.selectedCompanyDetails.licenseStatus;
        this.isUpdating = false;
        this.updateTimeoutId = null;
        this.cdr.markForCheck();
      });
    }, 2000);
  }

  ngOnDestroy() {
    this.clearUpdateState();
  }

  private buildCompanyDetails(company: string): CompanyDetails {
    const seed = this.makeSeed(company);
    const next = (value: number) => (value * 1664525 + 1013904223) >>> 0;
    const toHex = (value: number) => value.toString(16).toUpperCase().padStart(8, '0');

    const s1 = next(seed);
    const s2 = next(s1);
    const s3 = next(s2);
    const s4 = next(s3);

    const licenseKey = `${toHex(s1).slice(0, 4)}-${toHex(s2).slice(0, 4)}-${toHex(s3).slice(0, 4)}-${toHex(s4).slice(0, 4)}`;
    const pinCode = String((s3 % 9000) + 1000);
    const licenseStatus: CompanyDetails['licenseStatus'] = s1 % 5 === 0 ? 'Avstängd' : 'Aktiv';
    const maxUsers = 10 + (s2 % 191);

    const years = 1 + (s4 % 4);
    const months = s1 % 12;
    const days = s2 % 28;
    const expiresDate = new Date(2026 + years, months, days + 1);
    const licenseExpiresAt = `${expiresDate.getFullYear()}-${String(expiresDate.getMonth() + 1).padStart(2, '0')}-${String(expiresDate.getDate()).padStart(2, '0')}`;

    return {
      name: company,
      licenseKey,
      pinCode,
      licenseStatus,
      maxUsers,
      licenseExpiresAt,
    };
  }

  private makeSeed(input: string) {
    let seed = 2166136261;
    for (const char of input) {
      seed ^= char.charCodeAt(0);
      seed = Math.imul(seed, 16777619);
    }
    return seed >>> 0;
  }

  private clearUpdateState() {
    if (this.updateTimeoutId !== null) {
      window.clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
    this.isUpdating = false;
    this.cdr.markForCheck();
  }

  private startSearchMode(nextSearchTerm: string) {
    this.searchTerm = nextSearchTerm;
    this.isListOpen = true;
    this.selectedCompanyDetails = null;
    this.originalMaxUsers = null;
    this.originalLicenseExpiresAt = null;
    this.originalLicenseStatus = null;
    this.hasPendingChanges = false;
    this.clearUpdateState();
    this.isEditingMaxUsers = false;
    this.isEditingLicenseExpiresAt = false;
    this.isEditingLicenseStatus = false;
    this.maxUsersDraft = '';
    this.licenseExpiresAtDraft = '';
    this.licenseStatusDraft = 'Aktiv';
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
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges = hasMaxUsersChanges || hasLicenseExpiryChanges || hasLicenseStatusChanges;
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
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges = hasMaxUsersChanges || hasLicenseExpiryChanges || hasLicenseStatusChanges;
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
    const hasLicenseStatusChanges =
      this.originalLicenseStatus !== null &&
      this.selectedCompanyDetails.licenseStatus !== this.originalLicenseStatus;

    this.hasPendingChanges = hasMaxUsersChanges || hasLicenseExpiryChanges || hasLicenseStatusChanges;
  }
}

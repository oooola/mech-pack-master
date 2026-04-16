import { Injectable } from '@angular/core';
import { BackendService } from '@shared/services/backend.service';
import { CompanyNames } from '@shared/models/company-names';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { LocalStorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  private readonly onlineUserMaxAgeSeconds = 2 * 60 * 60;
  private statsUserTimeList: StatsUserTime[] = [];
  private currentOnlineUsers: StatsUserTime[] = [];
  private allCompanyNames: CompanyNames[] = [];
  private loginDisplayName = '';
  private companyNamesLoadPromise: Promise<CompanyNames[]> | null = null;
  private currentOnlineUsersLoadPromise: Promise<StatsUserTime[]> | null = null;

  constructor(
    private readonly storageService: LocalStorageService,
    private readonly backendService: BackendService,
  ) {}

  public getBuildVersion():string {
    return '1.6.0.0';
  }

  // Sparar senaste hämtade användningstider i minnet.
  // Används som cache mellan vyer.
  public setStatsUserTime(userTimeList: StatsUserTime[]): void {
    this.statsUserTimeList = userTimeList;
  }

  // Returnerar cachad lista med användningstider.
  // Ger tom lista om inget har laddats ännu.
  public getStatsUserTime(): StatsUserTime[] {
    return this.statsUserTimeList;
  }

  // Ersätter den globala listan med användare som är inloggade just nu.
  public setCurrentOnlineUsers(users: StatsUserTime[]): void {
    this.currentOnlineUsers = this.filterRecentlyActiveUsers(users);
  }

  // Returnerar den globala listan med användare som är inloggade just nu.
  public getCurrentOnlineUsers(): StatsUserTime[] {
    return this.currentOnlineUsers;
  }

  // Ersätter den globala listan med företag (id + namn).
  // Används efter hämtning från backend.
  public setAllCompanyNames(companies: CompanyNames[]): void {
    this.allCompanyNames = companies;
  }

  // Returnerar den globalt cachade listan med företag.
  // Innehåller både CompanyId och CompanyName.
  public getAllCompanyNames(): CompanyNames[] {
    return this.allCompanyNames;
  }

  public appCodeToName(appCode: string): string {
    const normalizedAppCode = appCode.trim().toUpperCase();

    switch (normalizedAppCode) {
      case 'DC':
        return 'Ritningsläsning';
      case 'MC':
        return 'MätKurs';
      case 'IC':
        return 'IsoKurs';
      case 'NT':
        return 'Kunskapstest';
      case 'MM':
        return 'MekMät';
      case 'II':
        return 'IsoIntro';
        case 'MA':
        return 'MechApp';
      default:
        return appCode;
    }
  }

  public appNameToChartColor(appName: string): string {
    const normalizedAppName = appName.trim().toUpperCase();

    switch (normalizedAppName) {
      case 'ISOKURS':
        return '#1976d2';
      case 'MÄTKURS':
      case 'MATKURS':
        return '#ef6c00';
      case 'ISOINTRO':
        return '#2e7d32';
      case 'MEKMÄT':
      case 'MEKMAT':
        return '#8e24aa';
      case 'KUNSKAPSTEST':
        return '#c62828';
      case 'RITNINGSLÄSNING':
      case 'RITNINGSLASNING':
        return '#00838f';
      case 'MECHAPP':
        return '#6d4c41';
      default:
        return '#455a64';
    }
  }

  public appCodeToChartColor(appCode: string): string {
    return this.appNameToChartColor(this.appCodeToName(appCode));
  }

  public shouldIncludeAppCodeInUsageCharts(appCode: string): boolean {
    const normalizedAppCode = appCode.trim().toUpperCase();
    return normalizedAppCode !== 'DO1' && normalizedAppCode !== 'DO2';
  }

  // Returns "Android" | "iPhone" | "iPad" | "Mac" | "Windows" | "Linux" | "CromeBook" | "Unknown";
  public platformCodeToName(platformCode: string): string {
    const normalizedAppCode = platformCode.trim().toUpperCase();
    switch (normalizedAppCode) {
      case 'WND':
        return 'Windows';
      case 'AND':
        return 'Android';
      case 'IPH':
        return 'Iphone';
      case 'IPA':
        return 'Ipad';
      case 'MAC':
        return 'Mac';
      case 'LIX':
        return 'Linux';
      case 'CRM':
        return 'CromeBook';
      case 'UNK':
        return 'Unknown';
      default:
        return platformCode;
    }
  }


  // Säkerställer att hela företagslistan är laddad i cache.
  // Återanvänder pågående request och kan tvingas ladda om.
  public async ensureAllCompanyNamesLoaded(forceReload = false): Promise<CompanyNames[]> {
    if (!forceReload && this.allCompanyNames.length > 0) {
      return this.allCompanyNames;
    }

    if (!forceReload && this.companyNamesLoadPromise) {
      return this.companyNamesLoadPromise;
    }

    const jwt = this.getJwt();
    if (jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
      return this.allCompanyNames;
    }

    const request: CompanyNames[] = [{ CompanyId: 0, CompanyName: 'ALL_NAMES' }];
    this.companyNamesLoadPromise = this.backendService.getCompanyNames(request, jwt)
      .then((response: unknown) => {
        const companies = this.normalizeCompanyNames(response);
        this.allCompanyNames = companies;
        return companies;
      })
      .catch((error) => {
        console.error('Kunde inte hämta alla företagsnamn.', error);
        return this.allCompanyNames;
      })
      .finally(() => {
        this.companyNamesLoadPromise = null;
      });

    return this.companyNamesLoadPromise;
  }

  // Säkerställer att listan med aktuellt inloggade användare är laddad i cache.
  // Återanvänder pågående request och kan tvingas ladda om.
  public async ensureCurrentOnlineUsersLoaded(forceReload = false): Promise<StatsUserTime[]> {
    if (!forceReload && this.currentOnlineUsers.length > 0) {
      return this.currentOnlineUsers;
    }

    if (!forceReload && this.currentOnlineUsersLoadPromise) {
      return this.currentOnlineUsersLoadPromise;
    }

    const jwt = this.getJwt();
    if (jwt === 'NO-JWT-FOUND' || jwt === 'JWT-EXPIRED') {
      return this.currentOnlineUsers;
    }

    this.currentOnlineUsersLoadPromise = this.backendService.getStatActiveUsers(jwt)
      .then((response: unknown) => {
        const users = this.filterRecentlyActiveUsers(this.normalizeStatsUserTimeList(response));
        this.currentOnlineUsers = users;
        return users;
      })
      .catch((error) => {
        console.error('Kunde inte hämta aktuellt inloggade användare.', error);
        return this.currentOnlineUsers;
      })
      .finally(() => {
        this.currentOnlineUsersLoadPromise = null;
      });

    return this.currentOnlineUsersLoadPromise;
  }

  // Tvingar en uppdatering av listan med aktuellt inloggade användare.
  // Kan kopplas till en manuell Uppdatera-knapp.
  public refreshCurrentOnlineUsers(): Promise<StatsUserTime[]> {
    return this.ensureCurrentOnlineUsersLoaded(true);
  }

  // Sparar JWT i local storage.
  // Triggar även omladdning av företagslistan för aktuell session.
  public setJwt(jwt: string): void {
    this.storageService.set('jwt', jwt);
    void this.ensureAllCompanyNamesLoaded(true);
    void this.ensureCurrentOnlineUsersLoaded(true);
  }

  public setLoginDisplayName(name: string): void {
    const trimmed = name.trim();
    this.loginDisplayName = trimmed;
    this.storageService.set('login-display-name', trimmed);
  }

  public getLoginDisplayName(): string {
    if (this.loginDisplayName.length > 0) {
      return this.loginDisplayName;
    }

    if (this.storageService.has('login-display-name')) {
      const fromStorage = this.storageService.get('login-display-name');
      if (typeof fromStorage === 'string') {
        this.loginDisplayName = fromStorage.trim();
      }
    }

    return this.loginDisplayName;
  }

  // Återställer visningsnamn från local storage enbart när JWT är giltig.
  public restoreLoginDisplayName(): void {
    const jwtStatus = this.getJwt();
    const hasValidJwt = jwtStatus !== 'NO-JWT-FOUND' && jwtStatus !== 'JWT-EXPIRED';
    if (!hasValidJwt) {
      this.loginDisplayName = '';
      this.storageService.remove('login-display-name');
      return;
    }

    const fromStorage = this.storageService.has('login-display-name')
      ? this.storageService.get('login-display-name')
      : '';

    this.loginDisplayName = typeof fromStorage === 'string' ? fromStorage.trim() : '';
  }

  // Raderar JWT från local storage och tömmer sessionscache.
  public clearJwt(): void {
    this.storageService.remove('jwt');
    this.storageService.remove('login-display-name');
    this.statsUserTimeList = [];
    this.currentOnlineUsers = [];
    this.allCompanyNames = [];
    this.loginDisplayName = '';
  }

  // Hämtar JWT från local storage och validerar innehållet.
  // Returnerar statussträng om token saknas eller är utgången.
  public getJwt(): string {
    if (!this.storageService.has('jwt')) {
      return 'NO-JWT-FOUND';
    }

    const jwt = this.storageService.get('jwt');
    if (typeof jwt !== 'string' || jwt.trim().length === 0) {
      return 'NO-JWT-FOUND';
    }

    return this.isJwtExpired(jwt) ? 'JWT-EXPIRED' : jwt;
  }

  // Kontrollerar om JWT-token har passerat sitt exp-värde.
  // Returnerar false vid ogiltigt format eller läsfel.
  private isJwtExpired(jwt: string): boolean {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { exp?: number };
      if (typeof payload.exp !== 'number') {
        return false;
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowInSeconds;
    } catch {
      return false;
    }
  }

  // Normaliserar backend-svar till giltiga CompanyNames-objekt.
  // Filtrerar bort trasiga poster och sorterar alfabetiskt.
  private normalizeCompanyNames(response: unknown): CompanyNames[] {
    if (!Array.isArray(response)) {
      return [];
    }

    const companies: CompanyNames[] = [];
    for (const item of response) {
      const companyId = Number((item as Partial<CompanyNames>)?.CompanyId);
      const companyName = typeof (item as Partial<CompanyNames>)?.CompanyName === 'string'
        ? ((item as Partial<CompanyNames>).CompanyName as string).trim()
        : '';

      if (!Number.isFinite(companyId) || companyName.length === 0) {
        continue;
      }

      companies.push({ CompanyId: companyId, CompanyName: companyName });
    }

    companies.sort((a, b) => a.CompanyName.localeCompare(b.CompanyName, 'sv'));
    return companies;
  }

  // Normaliserar backend-svar till giltiga StatsUserTime-objekt.
  // Filtrerar bort trasiga poster.
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

      if (
        !Number.isFinite(userId) ||
        !Number.isFinite(companyId) ||
        !Number.isFinite(secUsed) ||
        !Number.isFinite(startTs) ||
        !Number.isFinite(endTs)
      ) {
        continue;
      }

      const s = new StatsUserTime;
      s.CompanyId = companyId;
      s.UserId = userId;
      s.StartTS = startTs;
      s.EndTS = endTs;
      s.SecUsed = secUsed;
      s.AppCode = appCode;
      users.push(s);

      /*
      users.push({
        UserId: userId,
        CompanyId: companyId,
        SecUsed: secUsed,
        StartTS: startTs,
        EndTS: endTs,
      });
      */
    }

    return users;
  }

  private filterRecentlyActiveUsers(users: StatsUserTime[]): StatsUserTime[] {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    return users.filter(user => {
      const startTs = Number(user?.StartTS);
      if (!Number.isFinite(startTs) || startTs <= 0) {
        return false;
      }

      return nowInSeconds - startTs <= this.onlineUserMaxAgeSeconds;
    });
  }
}

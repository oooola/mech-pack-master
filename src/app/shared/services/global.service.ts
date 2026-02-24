import { Injectable } from '@angular/core';
import { BackendService } from '@shared/services/backend.service';
import { CompanyNames } from '@shared/models/company-names';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { LocalStorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  private statsUserTimeList: StatsUserTime[] = [];
  private allCompanyNames: CompanyNames[] = [];
  private companyNamesLoadPromise: Promise<CompanyNames[]> | null = null;

  constructor(
    private readonly storageService: LocalStorageService,
    private readonly backendService: BackendService,
  ) {}

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

  // Sparar JWT i local storage.
  // Triggar även omladdning av företagslistan för aktuell session.
  public setJwt(jwt: string): void {
    this.storageService.set('jwt', jwt);
    void this.ensureAllCompanyNamesLoaded(true);
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
}

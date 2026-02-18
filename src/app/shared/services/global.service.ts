import { Injectable } from '@angular/core';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { LocalStorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  private statsUserTimeList: StatsUserTime[] = [];

  constructor(private readonly storageService: LocalStorageService) {}

  public setStatsUserTime(userTimeList: StatsUserTime[]): void {
    this.statsUserTimeList = userTimeList;
  }

  public getStatsUserTime(): StatsUserTime[] {
    return this.statsUserTimeList;
  }

  public setJwt(jwt: string): void {
    this.storageService.set('jwt', jwt);
  }

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
}

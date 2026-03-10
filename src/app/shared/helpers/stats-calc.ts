import { M } from '@angular/material/line.d-C-QdueRc';
import { StatsUserTime } from '@shared/models/stats-user-time';
import { lastDayOfISOWeekYear } from 'date-fns';

export class StatsHelpers {
  private static readonly monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Maj',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dec',
  ];

  public static getHorizontalDateLabels(stats: StatsUserTime[], numberOfLabels: number): string[] {
    if (!Array.isArray(stats) || stats.length === 0 || numberOfLabels <= 0) {
      return [];
    }

    const first = stats[0] as any;
    let minTs = Math.min(first.StartTS, first.EndTS);
    let maxTs = Math.max(first.StartTS, first.EndTS);

    for (let i = 1; i < stats.length; i++) {
      const item = stats[i] as any;
      if (item.StartTS < minTs) minTs = item.StartTS;
      if (item.StartTS > maxTs) maxTs = item.StartTS;
      if (item.EndTS < minTs) minTs = item.EndTS;
      if (item.EndTS > maxTs) maxTs = item.EndTS;
    }

    const step = numberOfLabels === 1 ? 0 : (maxTs - minTs) / (numberOfLabels - 1);

    return Array.from({ length: numberOfLabels }, (_, index) => {
      const currentTs = Math.round(minTs + step * index);
      return this.toDateLabel(currentTs);
    });
  }

  public static getSecUsedNumberLabels(stats: StatsUserTime[], numberOfLabels: number): string[] {
    if (!Array.isArray(stats) || stats.length === 0 || numberOfLabels <= 0) {
      return [];
    }

    let maxSecUsed = (stats[0] as any).SecUsed ?? (stats[0] as any).secUsed ?? 0;

    for (let i = 1; i < stats.length; i++) {
      const secUsed = (stats[i] as any).SecUsed ?? (stats[i] as any).secUsed ?? 0;
      if (secUsed > maxSecUsed) {
        maxSecUsed = secUsed;
      }
    }

    if (numberOfLabels === 1) {
      return ['0'];
    }

    const step = maxSecUsed / (numberOfLabels - 1);

    return Array.from({ length: numberOfLabels }, (_, index) => Math.round(step * index).toString());
  }

  public static getDataActivUsersTime(stats: StatsUserTime[]): number[] {
    if (!Array.isArray(stats) || stats.length === 0) {
      return [];
    }

    const secUsedByDay = new Map<string, number>();

    for (let i = 0; i < stats.length; i++) {
      const item = stats[i];
      const dayKey = new Date(item.StartTS * 1000).toLocaleDateString('sv-SE', {
        timeZone: 'Europe/Stockholm',
      });

      const currentTotal = secUsedByDay.get(dayKey) ?? 0;
      secUsedByDay.set(dayKey, currentTotal + item.SecUsed);
    }

    const sortedDayKeys = Array.from(secUsedByDay.keys()).sort();
    return sortedDayKeys.map((dayKey) => secUsedByDay.get(dayKey) ?? 0);
  }

  public static timeDataSecToMin(data: number[]) {
    let retArr = new Array<number>();
    for (let i =0; i < data.length; i++) {
      retArr.push(data[i] / 60);
    }
    return retArr;
  } 

  public static toDateLabelFromDate(date: Date): string {
    const day = date.getDate();
    const month = this.monthNames[date.getMonth()] ?? '';

    return `${day}${this.getSwedishOrdinalSuffix(day)} ${month}`;
  }

  private static toDateLabel(timestampSeconds: number): string {
    const date = new Date(timestampSeconds * 1000);
    return this.toDateLabelFromDate(date);
  }

  private static getSwedishOrdinalSuffix(day: number): string {
    return day === 1 || day === 2 ? ':a' : ':e';
  }



}

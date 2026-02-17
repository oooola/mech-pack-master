import { Injectable } from '@angular/core';
import { TranslateLoader } from '@shared/compat/translate';
import { Observable, of } from 'rxjs';
import enUS from '../../i18n/en-US.json';
import zhCN from '../../i18n/zh-CN.json';
import zhTW from '../../i18n/zh-TW.json';

const TRANSLATIONS: Record<string, Record<string, unknown>> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

@Injectable({
  providedIn: 'root',
})
export class OfflineTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<Record<string, unknown>> {
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['en-US']);
  }
}

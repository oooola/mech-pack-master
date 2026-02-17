import {
  ChangeDetectorRef,
  EnvironmentProviders,
  Inject,
  Injectable,
  InjectionToken,
  NgModule,
  Pipe,
  PipeTransform,
  Type,
  makeEnvironmentProviders,
} from '@angular/core';
import { Observable, Subject, map, of, startWith, tap } from 'rxjs';

export interface LangChangeEvent {
  lang: string;
  translations: Record<string, unknown>;
}

export abstract class TranslateLoader {
  abstract getTranslation(lang: string): Observable<Record<string, unknown>>;
}

class DefaultTranslateLoader extends TranslateLoader {
  getTranslation(): Observable<Record<string, unknown>> {
    return of({});
  }
}

interface TranslateServiceOptions {
  loader?: {
    provide?: unknown;
    useClass: Type<TranslateLoader>;
  };
}

const TRANSLATE_LOADER = new InjectionToken<TranslateLoader>('TRANSLATE_LOADER');

@Injectable({
  providedIn: 'root',
})
export class TranslateService {
  private readonly translations = new Map<string, Record<string, unknown>>();

  private defaultLang = 'en-US';
  private currentLang = 'en-US';

  private readonly onLangChangeSubject = new Subject<LangChangeEvent>();

  readonly onLangChange = this.onLangChangeSubject.asObservable();

  private langs: string[] = [];

  constructor(@Inject(TRANSLATE_LOADER) private readonly loader: TranslateLoader) {}

  addLangs(languages: string[]) {
    this.langs = Array.from(new Set([...this.langs, ...languages]));
  }

  setDefaultLang(lang: string) {
    this.defaultLang = lang;
  }

  use(lang: string): Observable<Record<string, unknown>> {
    const resolvedLang = this.langs.includes(lang) ? lang : this.defaultLang;

    return this.loader.getTranslation(resolvedLang).pipe(
      tap(translations => {
        this.currentLang = resolvedLang;
        this.translations.set(resolvedLang, translations);
        this.onLangChangeSubject.next({ lang: resolvedLang, translations });
      })
    );
  }

  instant(key: string, params?: Record<string, unknown>): string {
    const current = this.translations.get(this.currentLang);
    const fallback = this.translations.get(this.defaultLang);
    const rawValue = this.lookupTranslation(current, key) ?? this.lookupTranslation(fallback, key);

    if (typeof rawValue !== 'string') {
      return key;
    }

    if (!params) {
      return rawValue;
    }

    return rawValue.replace(/{{\s*([\w.]+)\s*}}/g, (_, paramKey: string) => {
      const value = params[paramKey];
      return value == null ? '' : String(value);
    });
  }

  stream(key: string, params?: Record<string, unknown>): Observable<string> {
    return this.onLangChange.pipe(
      startWith(null),
      map(() => this.instant(key, params))
    );
  }

  private lookupTranslation(
    translations: Record<string, unknown> | undefined,
    key: string
  ): unknown | undefined {
    if (!translations) {
      return undefined;
    }

    return key.split('.').reduce<unknown>((value, part) => {
      if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, translations);
  }
}

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly subscriptions = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());

  constructor(
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  transform(value: string | null | undefined, params?: Record<string, unknown>): string {
    if (!value) {
      return '';
    }

    return this.translate.instant(value, params);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}

@NgModule({
  imports: [TranslatePipe],
  exports: [TranslatePipe],
})
export class TranslateModule {}

export function provideTranslateService(options: TranslateServiceOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: TRANSLATE_LOADER,
      useClass: options.loader?.useClass ?? DefaultTranslateLoader,
    },
  ]);
}

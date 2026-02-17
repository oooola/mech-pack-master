import {
  Directive,
  Injectable,
  Input,
  ModuleWithProviders,
  NgModule,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

type PermissionValue = string | string[] | undefined | null;

@Injectable({
  providedIn: 'root',
})
export class NgxPermissionsService {
  private readonly permissionsSubject = new BehaviorSubject<Set<string>>(new Set());

  readonly permissions$ = this.permissionsSubject.asObservable();

  loadPermissions(permissions: string[]) {
    this.permissionsSubject.next(new Set(permissions));
  }

  hasAnyPermission(permissions: string[] = []): boolean {
    const current = this.permissionsSubject.value;
    return permissions.some(permission => current.has(permission));
  }

  hasNoPermission(permissions: string[] = []): boolean {
    const current = this.permissionsSubject.value;
    return permissions.every(permission => !current.has(permission));
  }
}

@Injectable({
  providedIn: 'root',
})
export class NgxRolesService {
  private roles: Record<string, string[]> = {};

  flushRoles() {
    this.roles = {};
  }

  addRoles(roles: Record<string, string[]>) {
    this.roles = { ...this.roles, ...roles };
  }
}

@Directive({
  selector: '[ngxPermissionsOnly],[ngxPermissionsExcept]',
  standalone: true,
})
export class NgxPermissionsDirective implements OnDestroy {
  private only: string[] = [];
  private except: string[] = [];
  private hasView = false;
  private readonly subscription: Subscription;

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly permissionsService: NgxPermissionsService
  ) {
    this.subscription = this.permissionsService.permissions$.subscribe(() => this.updateView());
  }

  @Input()
  set ngxPermissionsOnly(value: PermissionValue) {
    this.only = normalizePermissions(value);
    this.updateView();
  }

  @Input()
  set ngxPermissionsExcept(value: PermissionValue) {
    this.except = normalizePermissions(value);
    this.updateView();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private updateView() {
    const passesOnly = this.only.length === 0 || this.permissionsService.hasAnyPermission(this.only);
    const passesExcept = this.except.length === 0 || this.permissionsService.hasNoPermission(this.except);
    const shouldShow = passesOnly && passesExcept;

    if (shouldShow && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
      return;
    }

    if (!shouldShow && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

@NgModule({
  imports: [NgxPermissionsDirective],
  exports: [NgxPermissionsDirective],
})
export class NgxPermissionsModule {
  static forRoot(): ModuleWithProviders<NgxPermissionsModule> {
    return {
      ngModule: NgxPermissionsModule,
      providers: [NgxPermissionsService, NgxRolesService],
    };
  }
}

function normalizePermissions(value: PermissionValue): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

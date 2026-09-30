import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { permissionGuard } from './permission-guard';
import { AuthStateService } from '../services/auth-state.service';

describe('permissionGuard', () => {
  let authState: AuthStateService;
  const dashboardTree = {} as UrlTree;
  const mockRouter = {
    createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(dashboardTree),
  };

  const run = (data: Record<string, unknown>) =>
    TestBed.runInInjectionContext(() =>
      permissionGuard({ data } as unknown as ActivatedRouteSnapshot, {} as never)
    );

  beforeEach(() => {
    mockRouter.createUrlTree.calls.reset();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthStateService, { provide: Router, useValue: mockRouter }],
    });
    authState = TestBed.inject(AuthStateService);
  });

  afterEach(() => sessionStorage.clear());

  it('allows a route with no restrictions', () => {
    authState.set({ id: '1', role: 'EMPLOYEE', permissions: {} });
    expect(run({})).toBeTrue();
  });

  it("allows when the user has 'view' on the required permission", () => {
    authState.set({ id: '1', role: 'HR', permissions: { payroll: ['view', 'generate'] } });
    expect(run({ permission: 'payroll' })).toBeTrue();
  });

  it("redirects to /dashboard when the permission is missing", () => {
    authState.set({ id: '1', role: 'EMPLOYEE', permissions: { dashboard: ['view'] } });
    expect(run({ permission: 'payroll' })).toBe(dashboardTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it("redirects when the permission exists without 'view'", () => {
    authState.set({ id: '1', role: 'EMPLOYEE', permissions: { payroll: ['generate'] } });
    expect(run({ permission: 'payroll' })).toBe(dashboardTree);
  });

  it('allows a listed role and redirects an unlisted one', () => {
    authState.set({ id: '1', role: 'ADMIN', permissions: {} });
    expect(run({ roles: ['ADMIN'] })).toBeTrue();

    authState.set({ id: '2', role: 'HR', permissions: {} });
    expect(run({ roles: ['ADMIN'] })).toBe(dashboardTree);
  });

  it('redirects when nobody is logged in', () => {
    expect(run({ permission: 'payroll' })).toBe(dashboardTree);
    expect(run({ roles: ['ADMIN'] })).toBe(dashboardTree);
  });
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth-guard';
import { AuthStateService } from '../services/auth-state.service';

const mockRouter = { navigate: jasmine.createSpy('navigate') };

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authState: AuthStateService;

  beforeEach(() => {
    mockRouter.navigate.calls.reset();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        AuthStateService,
        { provide: Router, useValue: mockRouter },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    authState = TestBed.inject(AuthStateService);
  });

  afterEach(() => sessionStorage.clear());

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('returns true when user is logged in', () => {
    authState.set({ id: '1', role: 'EMPLOYEE' });
    expect(guard.canActivate()).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('returns false and navigates to /login when user is not logged in', () => {
    const result = guard.canActivate();
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('returns false after user logs out (clear())', () => {
    authState.set({ id: '1', role: 'EMPLOYEE' });
    authState.clear();
    expect(guard.canActivate()).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});

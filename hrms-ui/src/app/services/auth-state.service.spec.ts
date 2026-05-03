import { TestBed } from '@angular/core/testing';
import { AuthStateService, UserInfo } from './auth-state.service';

const USER: UserInfo = {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'EMPLOYEE',
  employeeId: 'emp-1',
};

describe('AuthStateService', () => {
  let service: AuthStateService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStateService);
  });

  afterEach(() => sessionStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isLoggedIn() returns false when no user is stored', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('set() stores user info and makes isLoggedIn() return true', () => {
    service.set(USER);
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.userInfo?.email).toBe('alice@example.com');
  });

  it('set() persists to sessionStorage so it survives service reload', () => {
    service.set(USER);
    const raw = sessionStorage.getItem('userInfo');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.email).toBe('alice@example.com');
  });

  it('clear() removes user info and makes isLoggedIn() return false', () => {
    service.set(USER);
    service.clear();
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.userInfo).toBeNull();
    expect(sessionStorage.getItem('userInfo')).toBeNull();
  });

  it('userInfo$ emits null initially and then the user after set()', (done) => {
    const emitted: (UserInfo | null)[] = [];
    service.userInfo$.subscribe((v) => {
      emitted.push(v);
      if (emitted.length === 2) {
        expect(emitted[0]).toBeNull();
        expect(emitted[1]?.email).toBe('alice@example.com');
        done();
      }
    });
    service.set(USER);
  });

  it('userInfo$ emits null after clear()', (done) => {
    service.set(USER);
    const emitted: (UserInfo | null)[] = [];
    service.userInfo$.subscribe((v) => {
      emitted.push(v);
      if (emitted.length === 2) {
        expect(emitted[1]).toBeNull();
        done();
      }
    });
    service.clear();
  });

  it('loads existing sessionStorage data on construction', () => {
    sessionStorage.setItem('userInfo', JSON.stringify(USER));
    // Re-create service to trigger constructor load
    const svc2 = new AuthStateService();
    expect(svc2.isLoggedIn()).toBeTrue();
    expect(svc2.userInfo?.role).toBe('EMPLOYEE');
  });

  it('handles corrupt sessionStorage JSON gracefully', () => {
    sessionStorage.setItem('userInfo', 'not-valid-json');
    const svc2 = new AuthStateService();
    expect(svc2.isLoggedIn()).toBeFalse();
  });
});

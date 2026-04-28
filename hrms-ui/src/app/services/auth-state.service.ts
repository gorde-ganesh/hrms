import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserInfo {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  employeeId?: string | number;
  permissions?: Record<string, any>;
  [key: string]: any;
}

const STORAGE_KEY = 'userInfo';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private _userInfo$ = new BehaviorSubject<UserInfo | null>(this._load());

  get userInfo(): UserInfo | null {
    return this._userInfo$.value;
  }

  get userInfo$() {
    return this._userInfo$.asObservable();
  }

  set(info: UserInfo): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    this._userInfo$.next(info);
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this._userInfo$.next(null);
  }

  isLoggedIn(): boolean {
    return this._userInfo$.value !== null;
  }

  private _load(): UserInfo | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

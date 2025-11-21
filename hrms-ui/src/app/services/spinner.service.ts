import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  private spinnerSubject = new BehaviorSubject<boolean>(false);
  public readonly spinner$ = this.spinnerSubject.asObservable();

  show(): void {
    this.spinnerSubject.next(true);
  }

  hide(): void {
    this.spinnerSubject.next(false);
  }

  getSpinnerState(): Observable<boolean> {
    return this.spinnerSubject.asObservable();
  }
}

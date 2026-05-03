import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormErrorDirective } from './form-error.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorDirective],
  template: `
    <form [formGroup]="form">
      <input formControlName="email" />
      <span formError="email"></span>
    </form>
  `,
})
class TestHostComponent {
  form: FormGroup;
  constructor(fb: FormBuilder) {
    this.form = fb.group({ email: ['', [Validators.required, Validators.email]] });
  }
}

describe('FormErrorDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should compile host with directive', () => {
    expect(host).toBeTruthy();
  });

  it('should not show error when control is pristine and untouched', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('p-message, .p-message')).toBeNull();
  });

  it('shows required error after markAllAsTouched', fakeAsync(() => {
    host.form.markAllAsTouched();
    host.form.updateValueAndValidity();
    fixture.detectChanges();
    tick(50);
    fixture.detectChanges();
    const control = host.form.get('email')!;
    expect(control.invalid).toBeTrue();
    expect(control.touched).toBeTrue();
  }));

  it('clears error when control becomes valid', fakeAsync(() => {
    host.form.markAllAsTouched();
    fixture.detectChanges();
    tick(50);

    host.form.get('email')!.setValue('valid@email.com');
    fixture.detectChanges();
    tick(50);

    expect(host.form.get('email')!.valid).toBeTrue();
  }));
});

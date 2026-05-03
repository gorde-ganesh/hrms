import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // passwordValidator
  // ------------------------------------------------------------------
  describe('passwordValidator', () => {
    it('returns null for a valid password (mixed case + digit + ≥8 chars)', () => {
      expect(service.passwordValidator(new FormControl('StrongPass1'))).toBeNull();
    });

    it('returns null for an empty value (required is handled separately)', () => {
      expect(service.passwordValidator(new FormControl(''))).toBeNull();
    });

    it('returns error for password with no uppercase', () => {
      expect(service.passwordValidator(new FormControl('weakpass1'))).toEqual({ passwordStrength: true });
    });

    it('returns error for password with no lowercase', () => {
      expect(service.passwordValidator(new FormControl('STRONGPASS1'))).toEqual({ passwordStrength: true });
    });

    it('returns error for password with no digit', () => {
      expect(service.passwordValidator(new FormControl('StrongPassword'))).toEqual({ passwordStrength: true });
    });

    it('returns error for password shorter than 8 chars', () => {
      expect(service.passwordValidator(new FormControl('Sh0rt'))).toEqual({ passwordStrength: true });
    });

    it('accepts exactly 8-character valid password', () => {
      expect(service.passwordValidator(new FormControl('Valid1Pa'))).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // matchPasswords
  // ------------------------------------------------------------------
  describe('matchPasswords', () => {
    const makeGroup = (newPassword: string, confirmPassword: string) =>
      new FormGroup({
        newPassword: new FormControl(newPassword),
        confirmPassword: new FormControl(confirmPassword),
      });

    it('returns null when passwords match', () => {
      expect(service.matchPasswords(makeGroup('Match1Pass', 'Match1Pass'))).toBeNull();
    });

    it('returns passwordMismatch error when passwords differ', () => {
      const result = service.matchPasswords(makeGroup('OnePass1', 'TwoPass2'));
      expect(result).toEqual({ passwordMismatch: true });
    });

    it('sets confirmPassword field error when passwords differ', () => {
      const group = makeGroup('OnePass1', 'TwoPass2');
      service.matchPasswords(group);
      expect(group.get('confirmPassword')?.errors).toEqual({ passwordMismatch: true });
    });

    it('handles missing controls gracefully (returns null)', () => {
      const group = new FormGroup({ newPassword: new FormControl('only') });
      expect(service.matchPasswords(group)).toBeNull();
    });
  });
});

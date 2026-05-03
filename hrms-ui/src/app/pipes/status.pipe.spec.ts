import { StatusPipe } from './status.pipe';

describe('StatusPipe', () => {
  const pipe = new StatusPipe();

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  // Leave statuses
  it('returns "success" for APPROVED', () => {
    expect(pipe.transform('APPROVED')).toBe('success');
  });

  it('returns "warn" for PENDING', () => {
    expect(pipe.transform('PENDING')).toBe('warn');
  });

  it('returns "danger" for REJECTED', () => {
    expect(pipe.transform('REJECTED')).toBe('danger');
  });

  // Employee statuses
  it('returns "success" for ACTIVE', () => {
    expect(pipe.transform('ACTIVE')).toBe('success');
  });

  it('returns "danger" for INACTIVE', () => {
    expect(pipe.transform('INACTIVE')).toBe('danger');
  });

  // Unknown
  it('returns "secondary" for an unknown status string', () => {
    expect(pipe.transform('UNKNOWN_STATUS')).toBe('secondary');
  });

  it('returns "secondary" for empty string', () => {
    expect(pipe.transform('')).toBe('secondary');
  });
});

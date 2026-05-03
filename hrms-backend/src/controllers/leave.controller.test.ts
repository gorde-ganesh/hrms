import { describe, it, expect, vi } from 'vitest';

// Prevent notification.ts → socket-state from needing real infrastructure
vi.mock('../utils/notification', () => ({ sendNotification: vi.fn() }));
vi.mock('../lib/prisma', () => ({ prisma: { leave: {}, leaveBalance: {} } }));

import { calculateLeaveDays } from './leave.controller';

// -------------------------------------------------------------------
// calculateLeaveDays — pure function, no DB needed
// -------------------------------------------------------------------
describe('calculateLeaveDays', () => {
  it('counts a single weekday as 1', () => {
    const mon = new Date('2025-01-06'); // Monday
    expect(calculateLeaveDays(mon, mon)).toBe(1);
  });

  it('counts Mon–Fri as 5 days', () => {
    expect(calculateLeaveDays(new Date('2025-01-06'), new Date('2025-01-10'))).toBe(5);
  });

  it('excludes Saturday and Sunday from a full week span', () => {
    // Mon 6 Jan to Sun 12 Jan = 5 working days
    expect(calculateLeaveDays(new Date('2025-01-06'), new Date('2025-01-12'))).toBe(5);
  });

  it('returns 0 when start falls on a weekend and end is same day', () => {
    const sat = new Date('2025-01-11'); // Saturday
    expect(calculateLeaveDays(sat, sat)).toBe(0);
  });

  it('counts two separate weeks correctly', () => {
    // Mon 6 Jan to Fri 17 Jan = 10 working days
    expect(calculateLeaveDays(new Date('2025-01-06'), new Date('2025-01-17'))).toBe(10);
  });

  it('returns 1 for a Friday', () => {
    const fri = new Date('2025-01-10');
    expect(calculateLeaveDays(fri, fri)).toBe(1);
  });
});

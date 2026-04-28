import { describe, it, expect } from 'vitest';
import { parsePagination, buildMeta } from './pagination';

describe('parsePagination', () => {
  it('returns defaults for empty query', () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.skip).toBe(0);
    expect(p.take).toBe(20);
  });

  it('clamps take to max 100', () => {
    const p = parsePagination({ limit: 9999 });
    expect(p.limit).toBe(100);
    expect(p.take).toBe(100);
  });

  it('clamps negative limit to 1', () => {
    const p = parsePagination({ limit: -5 });
    expect(p.limit).toBe(1);
  });

  it('clamps page to minimum 1', () => {
    const p = parsePagination({ page: -3 });
    expect(p.page).toBe(1);
    expect(p.skip).toBe(0);
  });

  it('calculates skip correctly for page 3, limit 10', () => {
    const p = parsePagination({ page: 3, limit: 10 });
    expect(p.skip).toBe(20);
    expect(p.take).toBe(10);
  });
});

describe('buildMeta', () => {
  it('computes total pages correctly', () => {
    expect(buildMeta(1, 10, 25).pages).toBe(3);
    expect(buildMeta(1, 10, 20).pages).toBe(2);
    expect(buildMeta(1, 10, 0).pages).toBe(0);
  });

  it('preserves page and limit', () => {
    const m = buildMeta(2, 15, 45);
    expect(m.page).toBe(2);
    expect(m.limit).toBe(15);
    expect(m.total).toBe(45);
  });
});

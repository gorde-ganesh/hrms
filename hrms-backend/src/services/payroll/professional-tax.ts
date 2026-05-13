import type { PtResult } from './types';

// Monthly PT slabs by state. All amounts in rupees.
// Only Maharashtra and Karnataka for Phase 1; others return 0.
// Add more states here without touching engine.ts.
const PT_SLABS: Record<string, (grossMonthly: number, month: number) => number> = {
  MH: (gross, month) => {
    // Maharashtra: Feb = ₹300, all other months = ₹200 above ₹10k
    if (gross < 7_500) return 0;
    if (gross < 10_000) return 175;
    return month === 2 ? 300 : 200;
  },
  KA: (gross) => {
    // Karnataka: flat slabs
    if (gross < 15_000) return 0;
    if (gross < 25_000) return 150;
    return 200; // ₹25k+ (same for 25k-35k and above 35k in current rules)
  },
  TN: (gross) => {
    // Tamil Nadu: half-yearly payment, simplified to monthly equivalent
    if (gross < 21_000) return 0;
    return 208; // ₹2,500/year / 12 rounded
  },
  TS: (gross) => {
    // Telangana
    if (gross < 15_000) return 0;
    if (gross < 20_000) return 150;
    return 200;
  },
};

/**
 * Returns monthly professional tax for the given state and gross salary.
 * Returns 0 if the state is not configured.
 */
export function computeProfessionalTax(
  grossMonthly: number,
  state: string | null,
  month: number,
): PtResult {
  if (!state) return { amount: 0, state: null };

  const stateCode = state.toUpperCase();
  const slab = PT_SLABS[stateCode];
  if (!slab) return { amount: 0, state: stateCode };

  return { amount: slab(grossMonthly, month), state: stateCode };
}

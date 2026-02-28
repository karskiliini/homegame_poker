import { describe, it, expect } from 'vitest';
import { breakdownChips, type ChipBreakdown } from '@poker/shared';

describe('breakdownChips', () => {
  const BB = 2; // bigBlind = 2

  it('returns empty array for amount 0', () => {
    expect(breakdownChips(0, BB)).toEqual([]);
  });

  it('breaks down exact denomination amounts', () => {
    // 10 = 5 × BB = 1 green chip (5× BB)
    const result = breakdownChips(10, BB);
    expect(result).toEqual([{ denomination: 'green', count: 1 }]);
  });

  it('uses greedy algorithm from largest to smallest', () => {
    // BB=2, so: blue=200, black=50, green=10, red=2, white=1
    // 262 = 1×blue(200) + 1×black(50) + 1×green(10) + 1×red(2)
    const result = breakdownChips(262, BB);
    expect(result).toEqual([
      { denomination: 'blue', count: 1 },
      { denomination: 'black', count: 1 },
      { denomination: 'green', count: 1 },
      { denomination: 'red', count: 1 },
    ]);
  });

  it('handles fractional amounts (0.5× BB)', () => {
    // BB=2, white=1
    // 3 = 1×red(2) + 1×white(1)
    const result = breakdownChips(3, BB);
    expect(result).toEqual([
      { denomination: 'red', count: 1 },
      { denomination: 'white', count: 1 },
    ]);
  });

  it('caps total chips at MAX_TOTAL_CHIPS (10)', () => {
    // BB=2, white=1
    // 11 = 11 white chips without cap, but should be capped
    // Greedy: 1×green(10) + 1×white(1) = 2 chips (fits under cap)
    const result = breakdownChips(11, BB);
    expect(result.reduce((sum, c) => sum + c.count, 0)).toBeLessThanOrEqual(10);
  });

  it('multiple of same denomination', () => {
    // BB=2, red=2
    // 6 = 3×red(2)
    const result = breakdownChips(6, BB);
    expect(result).toEqual([{ denomination: 'red', count: 3 }]);
  });

  it('large amount uses highest denominations', () => {
    // BB=2, blue=200
    // 1000 = 5×blue(200)
    const result = breakdownChips(1000, BB);
    expect(result).toEqual([{ denomination: 'blue', count: 5 }]);
  });

  it('respects max chips cap on smallest denomination', () => {
    // BB=10, white=5, red=10
    // 45 = 4×red(40) + 1×white(5) = 5 chips (under cap)
    const result = breakdownChips(45, 10);
    expect(result).toEqual([
      { denomination: 'red', count: 4 },
      { denomination: 'white', count: 1 },
    ]);
  });

  it('truncates remainder when under smallest denomination', () => {
    // BB=10, white=5
    // 3 is less than smallest denomination (5). Should return 1 white chip (round up).
    const result = breakdownChips(3, 10);
    expect(result).toEqual([{ denomination: 'white', count: 1 }]);
  });

  it('works with BB=1', () => {
    // white=0.5, red=1, green=5, black=25, blue=100
    // 7 = 1×green(5) + 2×red(1) = 3 chips
    const result = breakdownChips(7, 1);
    expect(result).toEqual([
      { denomination: 'green', count: 1 },
      { denomination: 'red', count: 2 },
    ]);
  });

  it('never exceeds 10 total chips', () => {
    // Test with various amounts
    for (const amount of [1, 5, 13, 47, 100, 333, 999]) {
      const result = breakdownChips(amount, 2);
      const total = result.reduce((sum, c) => sum + c.count, 0);
      expect(total).toBeLessThanOrEqual(10);
    }
  });
});

export type ChipDenomination = 'white' | 'red' | 'green' | 'black' | 'blue';

export interface ChipBreakdown {
  denomination: ChipDenomination;
  count: number;
}

const MAX_TOTAL_CHIPS = 10;

// Denomination multipliers relative to big blind (descending order)
const DENOMINATIONS: { name: ChipDenomination; multiplier: number }[] = [
  { name: 'blue', multiplier: 100 },
  { name: 'black', multiplier: 25 },
  { name: 'green', multiplier: 5 },
  { name: 'red', multiplier: 1 },
  { name: 'white', multiplier: 0.5 },
];

/**
 * Break down a chip amount into denominations relative to the big blind.
 * Uses a greedy algorithm from largest to smallest, capped at MAX_TOTAL_CHIPS.
 */
export function breakdownChips(amount: number, bigBlind: number): ChipBreakdown[] {
  if (amount <= 0) return [];

  const result: ChipBreakdown[] = [];
  let remaining = amount;
  let totalChips = 0;

  for (const { name, multiplier } of DENOMINATIONS) {
    const chipValue = multiplier * bigBlind;
    if (chipValue > remaining) continue;

    const maxChipsForDenom = MAX_TOTAL_CHIPS - totalChips;
    if (maxChipsForDenom <= 0) break;

    const count = Math.min(Math.floor(remaining / chipValue), maxChipsForDenom);
    if (count > 0) {
      result.push({ denomination: name, count });
      remaining -= count * chipValue;
      totalChips += count;
    }
  }

  // If there's still a remainder smaller than the smallest denomination,
  // add one chip of the smallest denomination to represent it
  if (remaining > 0 && totalChips < MAX_TOTAL_CHIPS) {
    const smallest = DENOMINATIONS[DENOMINATIONS.length - 1].name;
    const existing = result.find(r => r.denomination === smallest);
    if (existing) {
      existing.count++;
    } else {
      result.push({ denomination: smallest, count: 1 });
    }
  }

  return result;
}

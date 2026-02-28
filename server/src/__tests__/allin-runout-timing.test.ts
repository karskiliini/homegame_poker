import { describe, it, expect } from 'vitest';
import {
  DELAY_AFTER_ALLIN_SHOWDOWN_MS,
  DELAY_AFTER_STREET_DEALT_MS,
  DELAY_ALLIN_RUNOUT_STREET_MS,
  DELAY_DRAMATIC_RIVER_MS,
} from '@poker/shared';

/**
 * All-in runout timing requirements:
 *
 * 1. After hole cards are revealed (allin_showdown), show initial equity for DELAY_AFTER_ALLIN_SHOWDOWN_MS
 * 2. Between each street during runout, use DELAY_ALLIN_RUNOUT_STREET_MS (longer than normal DELAY_AFTER_STREET_DEALT_MS)
 * 3. Dramatic river still uses DELAY_DRAMATIC_RIVER_MS
 * 4. The runout delay must be significantly longer than normal street delay so players can see equity percentages
 */

describe('All-in runout timing constants', () => {
  it('should have a dedicated runout street delay that is longer than normal street delay', () => {
    expect(DELAY_ALLIN_RUNOUT_STREET_MS).toBeGreaterThan(DELAY_AFTER_STREET_DEALT_MS);
  });

  it('should give at least 2500ms between streets during runout', () => {
    expect(DELAY_ALLIN_RUNOUT_STREET_MS).toBeGreaterThanOrEqual(2500);
  });

  it('should keep the initial equity display delay', () => {
    expect(DELAY_AFTER_ALLIN_SHOWDOWN_MS).toBe(2000);
  });

  it('should keep dramatic river delay longer than runout delay', () => {
    expect(DELAY_DRAMATIC_RIVER_MS).toBeGreaterThan(DELAY_ALLIN_RUNOUT_STREET_MS);
  });
});

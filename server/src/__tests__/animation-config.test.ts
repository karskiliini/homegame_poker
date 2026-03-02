import { describe, it, expect, afterEach } from 'vitest';
import { getAnimConfig, setAnimDelays, resetAnimDelays } from '@poker/shared';

describe('animationConfig', () => {
  afterEach(() => resetAnimDelays());

  it('returns defaults initially', () => {
    const config = getAnimConfig();
    expect(config.DELAY_AFTER_CARDS_DEALT_MS).toBe(2000);
  });

  it('overrides individual values', () => {
    setAnimDelays({ DELAY_AFTER_CARDS_DEALT_MS: 500 });
    const config = getAnimConfig();
    expect(config.DELAY_AFTER_CARDS_DEALT_MS).toBe(500);
    expect(config.DELAY_AFTER_STREET_DEALT_MS).toBe(1500); // unchanged
  });

  it('reset restores defaults', () => {
    setAnimDelays({ DELAY_AFTER_CARDS_DEALT_MS: 500 });
    resetAnimDelays();
    expect(getAnimConfig().DELAY_AFTER_CARDS_DEALT_MS).toBe(2000);
  });
});

import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../../views/sandbox/scenarios.js';

describe('Scenarios', () => {
  it('has 8 preset scenarios', () => {
    expect(SCENARIOS).toHaveLength(8);
  });

  it('every scenario has at least 3 steps', () => {
    for (const s of SCENARIOS) {
      expect(s.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every scenario starts with a GAME_STATE step', () => {
    for (const s of SCENARIOS) {
      expect(s.steps[0].event).toContain('game_state');
    }
  });

  it('every step has required fields', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        expect(step.name).toBeTruthy();
        expect(step.event).toBeTruthy();
        expect(step.delayAfterMs).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every scenario has a unique id', () => {
    const ids = SCENARIOS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

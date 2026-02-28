import { describe, it, expect } from 'vitest';
import { evaluateNLHE } from '../evaluation/hand-rank.js';
import type { CardString } from '@poker/shared';

/**
 * Every hand category vs every other hand category.
 * Ensures the ranking order is always correct:
 * Royal Flush > Straight Flush > Four of a Kind > Full House > Flush >
 * Straight > Three of a Kind > Two Pair > Pair > High Card
 */

// One representative hand per category, using evaluateNLHE(hole, board)
// Each hand is chosen to unambiguously produce exactly one hand category
const HANDS: { name: string; hole: CardString[]; board: CardString[] }[] = [
  {
    name: 'Royal Flush',
    hole: ['Ah', 'Kh'] as CardString[],
    board: ['Qh', 'Jh', 'Th', '2c', '3d'] as CardString[],
  },
  {
    name: 'Straight Flush',
    hole: ['9s', '8s'] as CardString[],
    board: ['7s', '6s', '5s', '2c', '3d'] as CardString[],
  },
  {
    name: 'Four of a Kind',
    hole: ['Kd', 'Kc'] as CardString[],
    board: ['Ks', 'Kh', '4c', '7d', '2s'] as CardString[],
  },
  {
    name: 'Full House',
    hole: ['Qh', 'Qd'] as CardString[],
    board: ['Qc', 'Jh', 'Jd', '4c', '2s'] as CardString[],
  },
  {
    name: 'Flush',
    hole: ['Ad', 'Td'] as CardString[],
    board: ['8d', '6d', '3d', 'Ks', '2c'] as CardString[],
  },
  {
    name: 'Straight',
    hole: ['Tc', '9d'] as CardString[],
    board: ['8h', '7s', '6c', '2d', 'Ks'] as CardString[],
  },
  {
    name: 'Three of a Kind',
    hole: ['8h', '8c'] as CardString[],
    board: ['8d', 'Ks', '5c', '3h', '2d'] as CardString[],
  },
  {
    name: 'Two Pair',
    hole: ['Ac', 'Kd'] as CardString[],
    board: ['As', 'Kc', '7h', '4d', '2s'] as CardString[],
  },
  {
    name: 'Pair',
    hole: ['Jh', 'Jc'] as CardString[],
    board: ['9s', '7d', '4c', '3h', '2s'] as CardString[],
  },
  {
    name: 'High Card',
    hole: ['Ah', 'Qc'] as CardString[],
    board: ['9s', '7d', '5c', '3h', '2s'] as CardString[],
  },
];

describe('Hand rank matrix: every category beats every lower category', () => {
  // Evaluate all hands once
  const evaluated = HANDS.map(h => ({
    name: h.name,
    result: evaluateNLHE(h.hole, h.board),
  }));

  // Verify each hand is identified correctly
  for (const e of evaluated) {
    it(`correctly identifies ${e.name}`, () => {
      expect(e.result.handName).toBe(e.name);
    });
  }

  // Test every pair: higher category must have a higher rank
  for (let i = 0; i < evaluated.length; i++) {
    for (let j = i + 1; j < evaluated.length; j++) {
      const better = evaluated[i];
      const worse = evaluated[j];
      it(`${better.name} beats ${worse.name}`, () => {
        expect(better.result.rank).toBeGreaterThan(worse.result.rank);
      });
    }
  }
});

describe('Within-category ranking', () => {
  it('higher straight flush beats lower straight flush', () => {
    const high = evaluateNLHE(['9h', '8h'] as CardString[], ['7h', '6h', '5h', '2c', '3d'] as CardString[]);
    const low = evaluateNLHE(['6s', '5s'] as CardString[], ['4s', '3s', '2s', '9c', 'Td'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher four of a kind beats lower four of a kind', () => {
    const high = evaluateNLHE(['Ah', 'Ad'] as CardString[], ['Ac', 'As', '3h', '7d', '9c'] as CardString[]);
    const low = evaluateNLHE(['Kh', 'Kd'] as CardString[], ['Kc', 'Ks', '2h', '5d', '8c'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher full house beats lower full house', () => {
    const high = evaluateNLHE(['Ah', 'Ad'] as CardString[], ['Ac', 'Ks', 'Kd', '3h', '7c'] as CardString[]);
    const low = evaluateNLHE(['Kh', 'Kc'] as CardString[], ['Kd', 'Qs', 'Qd', '3c', '7h'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher flush beats lower flush', () => {
    const high = evaluateNLHE(['Ah', 'Kh'] as CardString[], ['9h', '7h', '4h', '2c', '3d'] as CardString[]);
    const low = evaluateNLHE(['Ks', 'Qs'] as CardString[], ['9s', '7s', '4s', '2c', '3d'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher straight beats lower straight', () => {
    const high = evaluateNLHE(['Ah', 'Kd'] as CardString[], ['Qc', 'Js', 'Th', '2c', '3d'] as CardString[]);
    const low = evaluateNLHE(['9h', '8d'] as CardString[], ['7c', '6s', '5h', '2c', 'Kd'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('normal straight beats wheel (A-2-3-4-5)', () => {
    const normal = evaluateNLHE(['6h', '5d'] as CardString[], ['4c', '3s', '2h', 'Kc', 'Qd'] as CardString[]);
    const wheel = evaluateNLHE(['Ah', '2d'] as CardString[], ['3c', '4s', '5h', 'Kc', 'Qd'] as CardString[]);
    expect(normal.rank).toBeGreaterThan(wheel.rank);
  });

  it('higher three of a kind beats lower three of a kind', () => {
    const high = evaluateNLHE(['Ah', 'Ad'] as CardString[], ['Ac', '7s', '4d', '2h', '9c'] as CardString[]);
    const low = evaluateNLHE(['Kh', 'Kd'] as CardString[], ['Kc', '7h', '4s', '2c', '8d'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher two pair beats lower two pair', () => {
    const high = evaluateNLHE(['Ah', 'Kd'] as CardString[], ['Ac', 'Ks', '3h', '7d', '9c'] as CardString[]);
    const low = evaluateNLHE(['Qh', 'Jd'] as CardString[], ['Qc', 'Js', '3c', '7h', '9d'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher pair beats lower pair', () => {
    const high = evaluateNLHE(['Ah', 'Ad'] as CardString[], ['Kc', '7s', '4d', '2h', '9c'] as CardString[]);
    const low = evaluateNLHE(['Kh', 'Kd'] as CardString[], ['Qc', '7h', '4s', '2c', '8d'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('higher high card beats lower high card', () => {
    const high = evaluateNLHE(['Ah', 'Qd'] as CardString[], ['9c', '7s', '4d', '2h', '3c'] as CardString[]);
    const low = evaluateNLHE(['Kh', 'Qd'] as CardString[], ['9s', '7h', '4c', '2d', '3h'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });

  it('same pair, higher kicker wins', () => {
    const high = evaluateNLHE(['Ah', 'Kd'] as CardString[], ['Ac', '7s', '4d', '2h', '3c'] as CardString[]);
    const low = evaluateNLHE(['As', 'Qd'] as CardString[], ['Ad', '7h', '4c', '2c', '3h'] as CardString[]);
    expect(high.rank).toBeGreaterThan(low.rank);
  });
});

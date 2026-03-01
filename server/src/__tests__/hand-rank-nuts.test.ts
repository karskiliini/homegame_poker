import { describe, it, expect } from 'vitest';
import { isNuts, getHandRankKey, evaluateNLHE } from '../evaluation/hand-rank.js';
import type { CardString } from '@poker/shared';

describe('isNuts', () => {
  it('returns true for royal flush on any board', () => {
    const board: CardString[] = ['Ts', 'Js', 'Qs', 'Ks', '2d'];
    const holeCards: CardString[] = ['As', '3h'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns true for nut straight when no flush possible', () => {
    const board: CardString[] = ['5c', '6d', '7h', '2s', 'Kc'];
    const holeCards: CardString[] = ['8s', '9d'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns false when a better hand is possible', () => {
    const board: CardString[] = ['Ts', 'Js', 'Qs', '2d', '3h'];
    const holeCards: CardString[] = ['Th', 'Tc'];
    expect(isNuts('NLHE', board, holeCards)).toBe(false);
  });

  it('returns true for quads when no straight flush possible', () => {
    const board: CardString[] = ['Kh', 'Kd', 'Ks', '2c', '7d'];
    const holeCards: CardString[] = ['Kc', 'Ah'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns true for nut flush', () => {
    const board: CardString[] = ['2s', '5s', '8s', 'Td', '3h'];
    const holeCards: CardString[] = ['As', 'Ks'];
    expect(isNuts('NLHE', board, holeCards)).toBe(true);
  });

  it('returns false for second nut flush', () => {
    const board: CardString[] = ['2s', '5s', '8s', 'Td', '3h'];
    const holeCards: CardString[] = ['Ks', 'Qs'];
    expect(isNuts('NLHE', board, holeCards)).toBe(false);
  });

  it('works with PLO', () => {
    const board: CardString[] = ['Ts', 'Js', 'Qs', '2d', '3h'];
    const holeCards: CardString[] = ['As', 'Ks', '4c', '5c'];
    expect(isNuts('PLO', board, holeCards)).toBe(true);
  });
});

describe('getHandRankKey', () => {
  it('returns correct key for royal flush', () => {
    const result = evaluateNLHE(['As', 'Ks'] as CardString[], ['Ts', 'Js', 'Qs', '2d', '3h'] as CardString[]);
    expect(getHandRankKey(result.rank)).toBe('royal_flush');
  });

  it('returns correct key for full house', () => {
    const result = evaluateNLHE(['Ah', 'Ad'] as CardString[], ['As', 'Kh', 'Kd', '2c', '3c'] as CardString[]);
    expect(getHandRankKey(result.rank)).toBe('full_house');
  });

  it('returns correct key for pair', () => {
    const result = evaluateNLHE(['Ah', '2d'] as CardString[], ['As', '5c', '8d', 'Tc', 'Jh'] as CardString[]);
    expect(getHandRankKey(result.rank)).toBe('pair');
  });
});

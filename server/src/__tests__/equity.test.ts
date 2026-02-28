import { describe, it, expect } from 'vitest';
import { calculateEquity } from '../evaluation/equity.js';
import type { CardString } from '@poker/shared';

describe('calculateEquity', () => {
  it('AA vs KK preflop ~ 80/20', () => {
    const players = [
      { playerId: 'p1', holeCards: ['Ah', 'As'] as CardString[] },
      { playerId: 'p2', holeCards: ['Kh', 'Ks'] as CardString[] },
    ];
    const result = calculateEquity('NLHE', players, []);

    const p1Eq = result.get('p1')!;
    const p2Eq = result.get('p2')!;

    // AA vs KK is ~81/19 preflop
    expect(p1Eq).toBeGreaterThan(75);
    expect(p1Eq).toBeLessThan(90);
    expect(p2Eq).toBeGreaterThan(10);
    expect(p2Eq).toBeLessThan(25);
  });

  it('made hand vs dead draw on river = 100/0', () => {
    // AA vs KK with board AQJT2 — AA has pair of aces, KK has pair of kings
    // Both have straight (A-K-Q-J-T) actually — let's pick a clearer case
    // AA vs 72o on board AAAK2 — AA has quads, 72 has two pair
    // Wait — AA with board AAK72: AA has quads. 72 has two pair (7s and 2s)
    // But 72 can't improve on river since all cards are out
    // Let's use a river scenario: 4 community cards dealt, 1 to go
    // AA vs KK with board QJ53 — no draws possible for KK to win (needs K on river)
    // Actually let's do: all 5 community cards dealt = equity is deterministic
    const players = [
      { playerId: 'p1', holeCards: ['Ah', 'As'] as CardString[] },
      { playerId: 'p2', holeCards: ['7d', '2c'] as CardString[] },
    ];
    // Board: A-K-Q-J-3, no flush possible. p1 has trip aces, p2 has nothing
    const board: CardString[] = ['Ac', 'Kd', 'Qh', 'Js', '3d'];
    const result = calculateEquity('NLHE', players, board);

    expect(result.get('p1')).toBe(100);
    expect(result.get('p2')).toBe(0);
  });

  it('identical hands = 50/50 (tie)', () => {
    // Both players have same hand: AK suited vs AK suited (different suits)
    // On a board that doesn't make a flush for either
    const players = [
      { playerId: 'p1', holeCards: ['Ah', 'Kh'] as CardString[] },
      { playerId: 'p2', holeCards: ['As', 'Ks'] as CardString[] },
    ];
    // Board with no flush draw possible for either: mixed suits, no heart/spade heavy
    const board: CardString[] = ['Qd', 'Jc', '5d', '3c'];

    const result = calculateEquity('NLHE', players, board);
    const p1Eq = result.get('p1')!;
    const p2Eq = result.get('p2')!;

    // Should be very close to 50/50, but not exact because flush outs differ
    // Ah/Kh can catch heart flush, As/Ks can catch spade flush
    // So nearly 50/50 with small variance
    expect(p1Eq).toBeGreaterThan(40);
    expect(p1Eq).toBeLessThan(60);
    expect(p2Eq).toBeGreaterThan(40);
    expect(p2Eq).toBeLessThan(60);
  });

  it('equities sum to ~100%', () => {
    const players = [
      { playerId: 'p1', holeCards: ['Ah', 'Kd'] as CardString[] },
      { playerId: 'p2', holeCards: ['Qh', 'Qs'] as CardString[] },
      { playerId: 'p3', holeCards: ['Jh', 'Ts'] as CardString[] },
    ];
    const board: CardString[] = ['9h', '8d', '2c'];

    const result = calculateEquity('NLHE', players, board);
    const total = [...result.values()].reduce((sum, eq) => sum + eq, 0);

    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThanOrEqual(101); // Allow small rounding
  });

  it('works with complete board (5 cards)', () => {
    const players = [
      { playerId: 'p1', holeCards: ['Ah', 'Kh'] as CardString[] },
      { playerId: 'p2', holeCards: ['Qd', 'Qc'] as CardString[] },
    ];
    const board: CardString[] = ['Ac', 'Ks', 'Qh', 'Js', '3d'];

    const result = calculateEquity('NLHE', players, board);
    // p1 has two pair AK, p2 has trip queens — p2 wins
    expect(result.get('p1')).toBe(0);
    expect(result.get('p2')).toBe(100);
  });

  it('works on the turn (4 community cards)', () => {
    const players = [
      { playerId: 'p1', holeCards: ['Ah', 'As'] as CardString[] },
      { playerId: 'p2', holeCards: ['Kh', 'Ks'] as CardString[] },
    ];
    const board: CardString[] = ['Qd', 'Jc', '5h', '3d'];

    const result = calculateEquity('NLHE', players, board);
    const p1Eq = result.get('p1')!;

    // AA vs KK on safe board: AA should be ~95%+ (KK needs one of 2 kings)
    expect(p1Eq).toBeGreaterThan(90);
  });
});

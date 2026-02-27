import { describe, it, expect } from 'vitest';
import { evaluateNLHE, evaluatePLO, determineWinners } from '../evaluation/hand-rank.js';
import type { CardString } from '@poker/shared';

describe('NLHE Hand Evaluation', () => {
  it('should identify royal flush', () => {
    const result = evaluateNLHE(
      ['Ah', 'Kh'] as CardString[],
      ['Qh', 'Jh', 'Th', '2c', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Royal Flush');
  });

  it('should identify straight flush', () => {
    const result = evaluateNLHE(
      ['9h', '8h'] as CardString[],
      ['7h', '6h', '5h', '2c', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Straight Flush');
  });

  it('should identify four of a kind', () => {
    const result = evaluateNLHE(
      ['Ah', 'Ad'] as CardString[],
      ['Ac', 'As', '2h', '3c', '4d'] as CardString[],
    );
    expect(result.handName).toBe('Four of a Kind');
  });

  it('should identify full house', () => {
    const result = evaluateNLHE(
      ['Ah', 'Ad'] as CardString[],
      ['Ac', 'Kh', 'Kd', '2c', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Full House');
  });

  it('should identify flush', () => {
    const result = evaluateNLHE(
      ['Ah', '9h'] as CardString[],
      ['7h', '5h', '2h', 'Kc', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Flush');
  });

  it('should identify straight', () => {
    const result = evaluateNLHE(
      ['Ah', 'Kd'] as CardString[],
      ['Qh', 'Jc', 'Ts', '2c', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Straight');
  });

  it('should identify wheel (A-2-3-4-5)', () => {
    const result = evaluateNLHE(
      ['Ah', '2d'] as CardString[],
      ['3h', '4c', '5s', '9c', 'Kd'] as CardString[],
    );
    expect(result.handName).toBe('Straight');
  });

  it('should identify three of a kind', () => {
    const result = evaluateNLHE(
      ['Ah', 'Ad'] as CardString[],
      ['Ac', '7h', '2s', '9c', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Three of a Kind');
  });

  it('should identify two pair', () => {
    const result = evaluateNLHE(
      ['Ah', 'Kd'] as CardString[],
      ['Ac', 'Kh', '2s', '9c', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Two Pair');
  });

  it('should identify pair', () => {
    const result = evaluateNLHE(
      ['Ah', '2d'] as CardString[],
      ['Ac', '7h', '9s', 'Jc', '3d'] as CardString[],
    );
    expect(result.handName).toBe('Pair');
  });

  it('should identify high card', () => {
    const result = evaluateNLHE(
      ['Ah', '9d'] as CardString[],
      ['7c', '5h', '2s', 'Jc', '3d'] as CardString[],
    );
    expect(result.handName).toBe('High Card');
  });

  it('should rank hands correctly (royal flush beats straight flush)', () => {
    const royal = evaluateNLHE(
      ['Ah', 'Kh'] as CardString[],
      ['Qh', 'Jh', 'Th', '2c', '3d'] as CardString[],
    );
    const sf = evaluateNLHE(
      ['9h', '8h'] as CardString[],
      ['7h', '6h', '5h', '2c', '3d'] as CardString[],
    );
    expect(royal.rank).toBeGreaterThan(sf.rank);
  });

  it('should handle split pot (identical hands)', () => {
    const winners = determineWinners(
      'NLHE',
      [
        { playerId: 'p1', holeCards: ['Ah', 'Kd'] as CardString[] },
        { playerId: 'p2', holeCards: ['As', 'Kc'] as CardString[] },
      ],
      ['Qh', 'Jh', 'Th', '2c', '3d'] as CardString[], // Broadway straight on board
    );
    // Both have the same straight, should be a tie
    expect(winners.length).toBe(2);
  });

  it('should break ties with kickers', () => {
    const winners = determineWinners(
      'NLHE',
      [
        { playerId: 'p1', holeCards: ['Ah', 'Kd'] as CardString[] },
        { playerId: 'p2', holeCards: ['Ah', 'Qd'] as CardString[] },
      ],
      ['Ac', '7h', '5s', '2c', '3d'] as CardString[], // Pair of aces
    );
    // P1 has Ace with King kicker, P2 has Ace with Queen kicker
    expect(winners.length).toBe(1);
    expect(winners[0].playerId).toBe('p1');
  });
});

describe('PLO Hand Evaluation', () => {
  it('should require exactly 2 hole cards', () => {
    // Player has Ah Kh Qh Jh (all hearts)
    // Board: Th 9h 2h 3d 4s (three hearts on board)
    // PLO: must use exactly 2 from hand, 3 from board
    // Ah Kh (from hand) + Th 9h 2h (from board) = Ah Kh Th 9h 2h = hearts flush!
    const result = evaluatePLO(
      ['Ah', 'Kh', 'Qh', 'Jh'] as CardString[],
      ['Th', '9h', '2h', '3d', '4s'] as CardString[],
    );
    expect(result.handName).toBe('Flush');
  });

  it('should not allow using 3 or 4 hole cards', () => {
    // Player has Ah Kh Qh Jh
    // Board: 2c 3c 4c 5c 6c (all clubs)
    // In NLHE this would be a club flush using board cards
    // In PLO you MUST use exactly 2 hole cards - none are clubs
    // So best is 2 hole cards + 3 board: e.g. Ah Kh + 4c 5c 6c = high card
    const result = evaluatePLO(
      ['Ah', 'Kh', 'Qh', 'Jh'] as CardString[],
      ['2c', '3c', '4c', '5c', '6c'] as CardString[],
    );
    // Can't make flush (no clubs in hand), can't use board flush
    // Best is probably a straight if possible: Ah + 2c3c4c5c = A-5 straight?
    // With 2 hole + 3 board: Ah Kh + 4c 5c 6c = A-K-6-5-4 high card? No straight possible
    // Wait: Ah + any + 2c 3c 4c = A-4-3-2 + one card, no straight
    // Actually Ah Qh + 4c 5c 6c nope
    // 6-5-4 from board + nothing helpful = high card
    expect(result.handName).toBe('High Card');
  });

  it('should correctly evaluate PLO straight', () => {
    // Player: Ah Kd 7c 2s
    // Board: Qh Jc Ts 8d 3h
    // 2 from hand + 3 from board:
    // Ah Kd + Qh Jc Ts = A-K-Q-J-T straight (best!)
    const result = evaluatePLO(
      ['Ah', 'Kd', '7c', '2s'] as CardString[],
      ['Qh', 'Jc', 'Ts', '8d', '3h'] as CardString[],
    );
    expect(result.handName).toBe('Straight');
  });
});

describe('Side pot evaluation', () => {
  it('should determine correct winners for multi-way pot', () => {
    // 3 players, player with best hand wins
    const winners = determineWinners(
      'NLHE',
      [
        { playerId: 'p1', holeCards: ['Ah', 'Kh'] as CardString[] },
        { playerId: 'p2', holeCards: ['7d', '2s'] as CardString[] },
        { playerId: 'p3', holeCards: ['8c', '9c'] as CardString[] },
      ],
      ['Qh', 'Jh', 'Th', '3d', '4s'] as CardString[],
    );
    expect(winners.length).toBe(1);
    expect(winners[0].playerId).toBe('p1'); // Royal flush
  });
});

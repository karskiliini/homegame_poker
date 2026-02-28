import { describe, it, expect } from 'vitest';
import { calcPotSizedBet, calcHalfPotBet } from '../../../shared/src/betSizing.js';

describe('calcPotSizedBet', () => {
  it('pot-sized bet when first to act (no current bet)', () => {
    // Flop, pot=10, first to act
    // callAmount=0, currentBet=0
    // potAfterCall = 10, potSized = 0 + 0 + 10 = 10
    expect(calcPotSizedBet(10, 0, 0, 2, 200)).toBe(10);
  });

  it('pot-sized raise when facing a bet', () => {
    // Flop, committed pot=10, opponent bet 5
    // potTotal=15 (10 + 5 + 0), callAmount=5, currentBet=0
    // potAfterCall = 15 + 5 = 20, potSized = 0 + 5 + 20 = 25
    expect(calcPotSizedBet(15, 5, 0, 4, 195)).toBe(25);
  });

  it('pot-sized raise preflop', () => {
    // Preflop: SB=1, BB=2, UTG to act
    // potTotal=3 (SB+BB), callAmount=2, currentBet=0
    // potAfterCall = 3 + 2 = 5, potSized = 0 + 2 + 5 = 7
    expect(calcPotSizedBet(3, 2, 0, 4, 200)).toBe(7);
  });

  it('pot-sized re-raise preflop', () => {
    // Preflop: SB=1, BB=2, UTG raised to 6
    // potTotal=9 (1+2+6), BB facing raise, callAmount=4, currentBet=2
    // potAfterCall = 9 + 4 = 13, potSized = 2 + 4 + 13 = 19
    expect(calcPotSizedBet(9, 4, 2, 10, 200)).toBe(19);
  });

  it('capped at maxRaise (all-in)', () => {
    // Short stack, pot=100, call=20, currentBet=0, stack=30
    // potAfterCall = 120, potSized = 0 + 20 + 120 = 140 → capped at 30
    expect(calcPotSizedBet(100, 20, 0, 4, 30)).toBe(30);
  });

  it('floored at minRaise when pot is tiny', () => {
    // Small pot, pot=1, no bet, minRaise=4
    // potSized = 0 + 0 + 1 = 1 → floored at 4
    expect(calcPotSizedBet(1, 0, 0, 4, 200)).toBe(4);
  });

  it('BB pot-sized raise after limped pot', () => {
    // Preflop: SB=1, BB=2, one limper (called 2)
    // potTotal=5 (1+2+2), BB to act, callAmount=0, currentBet=2
    // potAfterCall = 5, potSized = 2 + 0 + 5 = 7
    expect(calcPotSizedBet(5, 0, 2, 4, 200)).toBe(7);
  });

  it('PLO pot-sized bet matches maxRaise from server', () => {
    // In PLO, server sends maxRaise = pot-limit
    // Flop, pot=20, first to act, currentBet=0
    // potSized = 0 + 0 + 20 = 20
    // PLO maxRaise from server = 20
    expect(calcPotSizedBet(20, 0, 0, 4, 20)).toBe(20);
  });

  it('PLO pot-sized raise when facing bet', () => {
    // Flop, pot=30 (20 dead + 10 bet), callAmount=10, currentBet=0
    // potAfterCall = 30 + 10 = 40, potSized = 0 + 10 + 40 = 50
    // PLO maxRaise = 50
    expect(calcPotSizedBet(30, 10, 0, 20, 50)).toBe(50);
  });
});

describe('calcHalfPotBet', () => {
  it('half-pot bet when first to act', () => {
    // Flop, pot=10, first to act
    // potAfterCall = 10, halfPot = 0 + 0 + 5 = 5
    expect(calcHalfPotBet(10, 0, 0, 2, 200)).toBe(5);
  });

  it('half-pot raise when facing a bet', () => {
    // Flop, pot=15, callAmount=5, currentBet=0
    // potAfterCall = 20, halfPot = 0 + 5 + 10 = 15
    expect(calcHalfPotBet(15, 5, 0, 4, 195)).toBe(15);
  });

  it('floored at minRaise', () => {
    // Tiny pot
    // potAfterCall = 2, halfPot = 0 + 0 + 1 = 1 → floored at 4
    expect(calcHalfPotBet(2, 0, 0, 4, 200)).toBe(4);
  });

  it('PLO half-pot with correct currentBet', () => {
    // Preflop: SB=1, BB=2, UTG raised to 6
    // potTotal=9, BB facing, callAmount=4, currentBet=2
    // potAfterCall = 13, halfPot = 2 + 4 + 6.5 = 12.5 → 13
    // PLO maxRaise = 19
    expect(calcHalfPotBet(9, 4, 2, 10, 19)).toBe(13);
  });

  it('PLO half-pot capped at maxRaise', () => {
    // Large pot but short stack
    // pot=100, call=0, currentBet=0, maxRaise=20
    // halfPot = 0 + 0 + 50 = 50 → capped at 20
    expect(calcHalfPotBet(100, 0, 0, 4, 20)).toBe(20);
  });
});

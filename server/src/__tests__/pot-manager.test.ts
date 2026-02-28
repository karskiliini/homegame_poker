import { describe, it, expect } from 'vitest';
import { calculatePots } from '../game/PotManager.js';
import type { HandPlayer } from '@poker/shared';

function makeHandPlayer(overrides: Partial<HandPlayer> & { playerId: string }): HandPlayer {
  return {
    seatIndex: 0,
    name: '',
    holeCards: [],
    startingStack: 200,
    currentStack: 0,
    currentBet: 0,
    totalInvested: 0,
    isFolded: false,
    isAllIn: false,
    hasActed: false,
    ...overrides,
  };
}

describe('PotManager - calculatePots', () => {
  it('should create single pot when all players invest equally', () => {
    const players = [
      makeHandPlayer({ playerId: 'a', totalInvested: 100 }),
      makeHandPlayer({ playerId: 'b', totalInvested: 100 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(200);
    expect(pots[0].eligiblePlayerIds).toEqual(['a', 'b']);
  });

  it('should refund excess when one player invests more than everyone else (heads-up)', () => {
    const players = [
      makeHandPlayer({ playerId: 'short', totalInvested: 50, isAllIn: true }),
      makeHandPlayer({ playerId: 'big', totalInvested: 100, currentStack: 0 }),
    ];
    const pots = calculatePots(players);

    // Only 1 pot — big's excess 50 is refunded, not a side pot
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(100); // 50*2
    expect(pots[0].eligiblePlayerIds).toContain('short');
    expect(pots[0].eligiblePlayerIds).toContain('big');

    // Big's excess chips returned to their stack
    expect(players[1].currentStack).toBe(50);
  });

  it('should refund deep stack excess in 3-way all-in with different amounts', () => {
    const players = [
      makeHandPlayer({ playerId: 'short', totalInvested: 50, isAllIn: true }),
      makeHandPlayer({ playerId: 'medium', totalInvested: 100, isAllIn: true }),
      makeHandPlayer({ playerId: 'deep', totalInvested: 200, currentStack: 0 }),
    ];
    const pots = calculatePots(players);

    // Only 2 pots — deep's excess 100 is refunded
    expect(pots).toHaveLength(2);

    // Main pot: 50*3 = 150 (all eligible)
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toHaveLength(3);

    // Side pot: 50*2 = 100 (medium + deep)
    expect(pots[1].amount).toBe(100);
    expect(pots[1].eligiblePlayerIds).toHaveLength(2);
    expect(pots[1].eligiblePlayerIds).not.toContain('short');

    // Deep's excess refunded
    expect(players[2].currentStack).toBe(100);
  });

  it('should exclude folded players from eligibility and refund winner excess', () => {
    const players = [
      makeHandPlayer({ playerId: 'folder', totalInvested: 50, isFolded: true }),
      makeHandPlayer({ playerId: 'winner', totalInvested: 100, currentStack: 0 }),
    ];
    const pots = calculatePots(players);

    // Pot includes folder's chips but winner's excess (above folder's level) is refunded
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPot).toBe(100); // 50*2 at level 50
    expect(players[1].currentStack).toBe(50); // winner's excess refunded

    // Only non-folded player should be eligible
    for (const pot of pots) {
      expect(pot.eligiblePlayerIds).not.toContain('folder');
    }
  });

  it('should conserve total chips (pots + refunded stacks = original invested)', () => {
    const players = [
      makeHandPlayer({ playerId: 'a', totalInvested: 30, isAllIn: true }),
      makeHandPlayer({ playerId: 'b', totalInvested: 80, isAllIn: true }),
      makeHandPlayer({ playerId: 'c', totalInvested: 80, isFolded: true }),
      makeHandPlayer({ playerId: 'd', totalInvested: 150, currentStack: 0 }),
    ];
    const originalInvested = players.reduce((sum, p) => sum + p.totalInvested, 0);
    const pots = calculatePots(players);
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = players.reduce((sum, p) => sum + p.currentStack, 0);
    // d's excess (150-80=70) is refunded, rest goes into pots
    expect(totalPot + totalRefunded).toBe(originalInvested);
    expect(players[3].currentStack).toBe(70); // d's refund
  });

  it('should merge pots when folded player creates same-eligible split (no spurious side pots)', () => {
    // SB posts 1 and folds, BB and BTN play to 6
    // Without merging: pot at level 1 (3 chips) + pot at level 6 (10 chips) = 2 pots
    // Correct: single pot of 13 since both pots have same eligible set [BB, BTN]
    const players = [
      makeHandPlayer({ playerId: 'sb', totalInvested: 1, isFolded: true }),
      makeHandPlayer({ playerId: 'bb', totalInvested: 6 }),
      makeHandPlayer({ playerId: 'btn', totalInvested: 6 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(13);
    expect(pots[0].eligiblePlayerIds).toContain('bb');
    expect(pots[0].eligiblePlayerIds).toContain('btn');
  });

  it('should merge multiple folded-player levels into single pot', () => {
    // 4 players: two fold at different levels, two remain
    // A folds after investing 2, B folds after investing 5, C and D invest 10
    const players = [
      makeHandPlayer({ playerId: 'a', totalInvested: 2, isFolded: true }),
      makeHandPlayer({ playerId: 'b', totalInvested: 5, isFolded: true }),
      makeHandPlayer({ playerId: 'c', totalInvested: 10 }),
      makeHandPlayer({ playerId: 'd', totalInvested: 10 }),
    ];
    const pots = calculatePots(players);
    // All levels have eligible = [c, d], so should merge to 1 pot
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(27); // 2+5+10+10
    expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['c', 'd']));
    expect(pots[0].eligiblePlayerIds).toHaveLength(2);
  });

  it('should keep real side pots where multiple players compete', () => {
    // Short all-in 50, medium all-in 100, big 100 — 2 real pots, no refund
    const players = [
      makeHandPlayer({ playerId: 'short', totalInvested: 50, isAllIn: true }),
      makeHandPlayer({ playerId: 'medium', totalInvested: 100, isAllIn: true }),
      makeHandPlayer({ playerId: 'big', totalInvested: 100, currentStack: 0 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(2);
    // No refund since big's investment matches medium's
    expect(players[2].currentStack).toBe(0);
  });

  it('should merge where eligible matches but keep real side pots (mixed scenario)', () => {
    // SB(1, fold), BB(10), BTN all-in(5), CO(10)
    // Level 1: 4*1=4, eligible [BB, BTN, CO]
    // Level 5: 3*4=12, eligible [BB, BTN, CO] → merge with prev
    // Level 10: 2*5=10, eligible [BB, CO] → new pot (BTN dropped)
    const players = [
      makeHandPlayer({ playerId: 'sb', totalInvested: 1, isFolded: true }),
      makeHandPlayer({ playerId: 'btn', totalInvested: 5, isAllIn: true }),
      makeHandPlayer({ playerId: 'bb', totalInvested: 10 }),
      makeHandPlayer({ playerId: 'co', totalInvested: 10 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(2);
    // Main pot: levels 1+5 merged = 4+12 = 16, eligible [BB, BTN, CO]
    expect(pots[0].amount).toBe(16);
    expect(pots[0].eligiblePlayerIds).toHaveLength(3);
    // Side pot: level 10 = 10, eligible [BB, CO]
    expect(pots[1].amount).toBe(10);
    expect(pots[1].eligiblePlayerIds).toHaveLength(2);
    expect(pots[1].eligiblePlayerIds).not.toContain('btn');
  });

  it('should handle all players with same investment', () => {
    const players = [
      makeHandPlayer({ playerId: 'a', totalInvested: 100 }),
      makeHandPlayer({ playerId: 'b', totalInvested: 100 }),
      makeHandPlayer({ playerId: 'c', totalInvested: 100 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
  });
});

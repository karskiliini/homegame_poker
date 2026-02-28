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

  it('should create side pot when one player is all-in for less', () => {
    const players = [
      makeHandPlayer({ playerId: 'short', totalInvested: 50, isAllIn: true }),
      makeHandPlayer({ playerId: 'big', totalInvested: 100 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(2);

    // Main pot: 50*2 = 100
    expect(pots[0].amount).toBe(100);
    expect(pots[0].eligiblePlayerIds).toContain('short');
    expect(pots[0].eligiblePlayerIds).toContain('big');

    // Side pot: 50*1 = 50 (only big is eligible)
    expect(pots[1].amount).toBe(50);
    expect(pots[1].eligiblePlayerIds).toEqual(['big']);
  });

  it('should handle 3-way pot with different all-in amounts', () => {
    const players = [
      makeHandPlayer({ playerId: 'short', totalInvested: 50, isAllIn: true }),
      makeHandPlayer({ playerId: 'medium', totalInvested: 100, isAllIn: true }),
      makeHandPlayer({ playerId: 'deep', totalInvested: 200 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(3);

    // Main pot: 50*3 = 150 (all eligible)
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toHaveLength(3);

    // Side pot 1: 50*2 = 100 (medium + deep)
    expect(pots[1].amount).toBe(100);
    expect(pots[1].eligiblePlayerIds).toHaveLength(2);
    expect(pots[1].eligiblePlayerIds).not.toContain('short');

    // Side pot 2: 100*1 = 100 (deep only)
    expect(pots[2].amount).toBe(100);
    expect(pots[2].eligiblePlayerIds).toEqual(['deep']);
  });

  it('should exclude folded players from eligibility but keep their chips', () => {
    const players = [
      makeHandPlayer({ playerId: 'folder', totalInvested: 50, isFolded: true }),
      makeHandPlayer({ playerId: 'winner', totalInvested: 100 }),
    ];
    const pots = calculatePots(players);

    // Total pot should include folded player's chips
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPot).toBe(150);

    // Only non-folded player should be eligible
    for (const pot of pots) {
      expect(pot.eligiblePlayerIds).not.toContain('folder');
    }
  });

  it('should conserve total chips', () => {
    const players = [
      makeHandPlayer({ playerId: 'a', totalInvested: 30, isAllIn: true }),
      makeHandPlayer({ playerId: 'b', totalInvested: 80, isAllIn: true }),
      makeHandPlayer({ playerId: 'c', totalInvested: 80, isFolded: true }),
      makeHandPlayer({ playerId: 'd', totalInvested: 150 }),
    ];
    const pots = calculatePots(players);
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
    const totalInvested = players.reduce((sum, p) => sum + p.totalInvested, 0);
    expect(totalPot).toBe(totalInvested);
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

  it('should NOT merge pots when eligible sets differ (real side pot)', () => {
    // Short all-in 50, big has 100 — different eligible sets → 2 pots
    const players = [
      makeHandPlayer({ playerId: 'short', totalInvested: 50, isAllIn: true }),
      makeHandPlayer({ playerId: 'big', totalInvested: 100 }),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(2);
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

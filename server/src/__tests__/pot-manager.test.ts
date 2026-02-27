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

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import {
  S2C_TABLE, S2C_PLAYER,
  HAND_COMPLETE_PAUSE_MS,
  DELAY_POT_AWARD_MS,
  DELAY_BETWEEN_POT_AWARDS_MS,
} from '@poker/shared';
import type { HandResult } from '../game/HandEngine.js';

// ============================================================================
// Mock helpers (same pattern as disconnect-timeout.test.ts)
// ============================================================================

function makeConfig(): GameConfig {
  return {
    gameType: 'NLHE',
    smallBlind: 1,
    bigBlind: 2,
    maxBuyIn: 200,
    actionTimeSeconds: 30,
    minPlayers: 2,
    maxPlayers: 10,
  };
}

function createMockSocket(id: string) {
  return {
    id,
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
  } as any;
}

function createMockIo() {
  const emitFn = vi.fn();
  const namespaceObj = { emit: emitFn };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
  } as any;
}

// Helper: build a fake HandResult for testing pot award emission
function makeSinglePotResult(): HandResult {
  return {
    handId: 'test-hand-1',
    handNumber: 1,
    players: [
      {
        playerId: 'p1', seatIndex: 0, name: 'Alice',
        holeCards: ['Ah', 'Kh'], startingStack: 200, currentStack: 210,
        currentBet: 0, totalInvested: 10, isFolded: false, isAllIn: false, hasActed: true,
      },
      {
        playerId: 'p2', seatIndex: 1, name: 'Bob',
        holeCards: ['2c', '7d'], startingStack: 200, currentStack: 190,
        currentBet: 0, totalInvested: 10, isFolded: true, isAllIn: false, hasActed: true,
      },
    ],
    communityCards: [],
    pots: [
      {
        name: 'Main Pot',
        amount: 20,
        winners: [{ playerId: 'p1', playerName: 'Alice', amount: 20 }],
      },
    ],
    streets: [],
  };
}

function makeMultiPotResult(): HandResult {
  return {
    handId: 'test-hand-2',
    handNumber: 2,
    players: [
      {
        playerId: 'p1', seatIndex: 0, name: 'Alice',
        holeCards: ['Ah', 'Kh'], startingStack: 50, currentStack: 0,
        currentBet: 0, totalInvested: 50, isFolded: false, isAllIn: true, hasActed: true,
      },
      {
        playerId: 'p2', seatIndex: 1, name: 'Bob',
        holeCards: ['Qs', 'Qh'], startingStack: 200, currentStack: 350,
        currentBet: 0, totalInvested: 100, isFolded: false, isAllIn: false, hasActed: true,
      },
      {
        playerId: 'p3', seatIndex: 2, name: 'Carol',
        holeCards: ['2c', '7d'], startingStack: 200, currentStack: 100,
        currentBet: 0, totalInvested: 100, isFolded: true, isAllIn: false, hasActed: true,
      },
    ],
    communityCards: ['Ts', '9s', '8s', '2h', '3d'],
    pots: [
      {
        name: 'Main Pot',
        amount: 150,
        winners: [{ playerId: 'p2', playerName: 'Bob', amount: 150 }],
      },
      {
        name: 'Side Pot 1',
        amount: 100,
        winners: [{ playerId: 'p2', playerName: 'Bob', amount: 100 }],
      },
    ],
    streets: [],
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Pot award timing', () => {
  let gm: GameManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(makeConfig(), io);

    // Add players so GameManager has player mappings for handleHandComplete
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits a single POT_AWARD for a single-pot hand', () => {
    const result = makeSinglePotResult();
    // Set phase to hand_in_progress so handleHandComplete works correctly
    (gm as any).phase = 'hand_in_progress';
    (gm as any).playerIdToSocketId.set('p1', 'sock-1');
    (gm as any).playerIdToSocketId.set('p2', 'sock-2');
    (gm as any).handleHandComplete(result);

    // POT_AWARD should be emitted immediately (no sequential delay for single pot)
    const potAwardCalls = io._emitFn.mock.calls.filter(
      (call: any[]) => call[0] === S2C_TABLE.POT_AWARD
    );
    expect(potAwardCalls).toHaveLength(1);
    expect(potAwardCalls[0][1]).toMatchObject({
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
    });
    expect(potAwardCalls[0][1].awards).toHaveLength(1);
    expect(potAwardCalls[0][1].awards[0].winnerName).toBe('Alice');
  });

  it('emits sequential POT_AWARDs for multi-pot hands', () => {
    const result = makeMultiPotResult();
    (gm as any).phase = 'hand_in_progress';
    // Add third player
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock3, 'Carol', 200);
    (gm as any).playerIdToSocketId.set('p1', 'sock-1');
    (gm as any).playerIdToSocketId.set('p2', 'sock-2');
    (gm as any).playerIdToSocketId.set('p3', 'sock-3');
    (gm as any).handleHandComplete(result);

    // First POT_AWARD emitted immediately
    let potAwardCalls = io._emitFn.mock.calls.filter(
      (call: any[]) => call[0] === S2C_TABLE.POT_AWARD
    );
    expect(potAwardCalls).toHaveLength(1);
    expect(potAwardCalls[0][1]).toMatchObject({
      potIndex: 0,
      isLastPot: false,
      totalPots: 2,
    });

    // Second POT_AWARD after DELAY_BETWEEN_POT_AWARDS_MS
    vi.advanceTimersByTime(DELAY_BETWEEN_POT_AWARDS_MS);
    potAwardCalls = io._emitFn.mock.calls.filter(
      (call: any[]) => call[0] === S2C_TABLE.POT_AWARD
    );
    expect(potAwardCalls).toHaveLength(2);
    expect(potAwardCalls[1][1]).toMatchObject({
      potIndex: 1,
      isLastPot: true,
      totalPots: 2,
    });
  });

  it('emits HAND_RESULT after DELAY_POT_AWARD_MS from last pot award', () => {
    const result = makeMultiPotResult();
    (gm as any).phase = 'hand_in_progress';
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock3, 'Carol', 200);
    (gm as any).playerIdToSocketId.set('p1', 'sock-1');
    (gm as any).playerIdToSocketId.set('p2', 'sock-2');
    (gm as any).playerIdToSocketId.set('p3', 'sock-3');
    (gm as any).handleHandComplete(result);

    // Advance past all pot awards
    vi.advanceTimersByTime(DELAY_BETWEEN_POT_AWARDS_MS);

    // HAND_RESULT should NOT be emitted yet
    let handResultCalls = io._emitFn.mock.calls.filter(
      (call: any[]) => call[0] === S2C_TABLE.HAND_RESULT
    );
    expect(handResultCalls).toHaveLength(0);

    // Advance past DELAY_POT_AWARD_MS from last pot award
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    handResultCalls = io._emitFn.mock.calls.filter(
      (call: any[]) => call[0] === S2C_TABLE.HAND_RESULT
    );
    expect(handResultCalls).toHaveLength(1);
  });

  it('calls scheduleNextHand after all pot awards and DELAY_POT_AWARD_MS', () => {
    // Use a showdown result (not uncontested) so offerShowCards is skipped
    const result = makeSinglePotResult();
    result.showdownResults = [
      { playerId: 'p1', seatIndex: 0, holeCards: ['Ah', 'Kh'], handName: 'High Card', handDescription: 'Ace high', shown: true },
    ];
    (gm as any).phase = 'hand_in_progress';
    (gm as any).playerIdToSocketId.set('p1', 'sock-1');
    (gm as any).playerIdToSocketId.set('p2', 'sock-2');

    const scheduleSpy = vi.spyOn(gm as any, 'scheduleNextHand');

    (gm as any).handleHandComplete(result);

    // scheduleNextHand should NOT be called yet
    expect(scheduleSpy).not.toHaveBeenCalled();

    // After DELAY_POT_AWARD_MS, afterAllPotsAwarded fires → scheduleNextHand called
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);
    expect(scheduleSpy).toHaveBeenCalledTimes(1);
  });
});

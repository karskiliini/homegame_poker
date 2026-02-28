import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig, GameState, PublicPlayerState } from '@poker/shared';
import {
  S2C_TABLE, S2C_PLAYER,
  DELAY_POT_AWARD_MS, HAND_COMPLETE_PAUSE_MS,
  SHOW_CARDS_TIMEOUT_MS,
} from '@poker/shared';
import type { HandResult } from '../game/HandEngine.js';

// ============================================================================
// Mock helpers
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
  const roomObj = { emit: emitFn };
  const namespaceObj = {
    emit: emitFn,
    to: vi.fn().mockReturnValue(roomObj),
  };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
    _namespaceObj: namespaceObj,
  } as any;
}

/** Build a result for an uncontested pot (everyone folded except winner) */
function makeUncontestedResult(): HandResult {
  return {
    handId: 'test-hand-1',
    handNumber: 1,
    players: [
      {
        playerId: 'p1', seatIndex: 0, name: 'Alice',
        holeCards: ['Ah', 'Kh'], startingStack: 200, currentStack: 202,
        currentBet: 0, totalInvested: 2, isFolded: false, isAllIn: false, hasActed: true,
      },
      {
        playerId: 'p2', seatIndex: 1, name: 'Bob',
        holeCards: ['2c', '7d'], startingStack: 200, currentStack: 198,
        currentBet: 0, totalInvested: 2, isFolded: true, isAllIn: false, hasActed: true,
      },
    ],
    communityCards: [],
    pots: [
      {
        name: 'Main Pot',
        amount: 4,
        winners: [{ playerId: 'p1', playerName: 'Alice', amount: 4 }],
      },
    ],
    streets: [],
    // No showdownResults — uncontested pot
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Show/muck cards', () => {
  let gm: GameManager;
  let io: ReturnType<typeof createMockIo>;
  let sock1: ReturnType<typeof createMockSocket>;
  let sock2: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(makeConfig(), io, 'test-table');

    sock1 = createMockSocket('sock-1');
    sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);

    // Wire up player ID → socket ID mappings (matching the result's playerIds)
    (gm as any).playerIdToSocketId.set('p1', 'sock-1');
    (gm as any).playerIdToSocketId.set('p2', 'sock-2');

    // Also update the player objects to have matching IDs
    const player1 = (gm as any).players.get('sock-1');
    const player2 = (gm as any).players.get('sock-2');
    if (player1) player1.id = 'p1';
    if (player2) player2.id = 'p2';

    // Set the player cards as if cards_dealt event occurred
    (gm as any).currentPlayerCards.set('p1', ['Ah', 'Kh']);
    (gm as any).currentPlayerCards.set('p2', ['2c', '7d']);

    // Set phase to hand_in_progress
    (gm as any).phase = 'hand_in_progress';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should offer show cards to the winner of an uncontested pot', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);

    // Advance past DELAY_POT_AWARD_MS to trigger offerShowCards
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Winner (Alice/sock-1) should receive SHOW_CARDS_OFFER
    const offerCalls = sock1.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.SHOW_CARDS_OFFER
    );
    expect(offerCalls.length).toBeGreaterThan(0);

    // Bob (loser/folder) should NOT receive SHOW_CARDS_OFFER
    const bobOfferCalls = sock2.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.SHOW_CARDS_OFFER
    );
    expect(bobOfferCalls).toHaveLength(0);
  });

  it('when winner chooses "show", their cards should appear in the table state', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);

    // Advance past DELAY_POT_AWARD_MS to trigger offerShowCards
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Verify show cards is pending
    expect((gm as any).pendingShowCards.size).toBe(1);
    expect((gm as any).pendingShowCards.has('p1')).toBe(true);

    // Player chooses "show"
    gm.handleShowCards('sock-1', true);

    // Get the table state — winner's cards should be visible
    const state = gm.getTableState();
    const alice = state.players.find((p: PublicPlayerState) => p.id === 'p1');

    expect(alice).toBeDefined();
    expect(alice!.holeCards).toEqual(['Ah', 'Kh']);
  });

  it('when winner chooses "muck", their cards should NOT appear in the table state', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Player chooses "muck"
    gm.handleShowCards('sock-1', false);

    const state = gm.getTableState();
    const alice = state.players.find((p: PublicPlayerState) => p.id === 'p1');

    expect(alice).toBeDefined();
    expect(alice!.holeCards).toBeNull();
  });

  it('should broadcast updated table state when player shows cards', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Clear previous broadcasts
    io._emitFn.mockClear();

    // Player chooses "show"
    gm.handleShowCards('sock-1', true);

    // Should have broadcast a GAME_STATE with the shown cards
    const gameStateCalls = io._emitFn.mock.calls.filter(
      (call: any[]) => call[0] === S2C_TABLE.GAME_STATE
    );
    expect(gameStateCalls.length).toBeGreaterThan(0);

    // The last broadcast should include Alice's cards
    const lastState: GameState = gameStateCalls[gameStateCalls.length - 1][1];
    const alice = lastState.players.find((p: PublicPlayerState) => p.id === 'p1');
    expect(alice!.holeCards).toEqual(['Ah', 'Kh']);
  });

  it('should auto-muck after SHOW_CARDS_TIMEOUT_MS if player does not respond', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    expect((gm as any).pendingShowCards.size).toBe(1);

    // Advance past show cards timeout
    vi.advanceTimersByTime(SHOW_CARDS_TIMEOUT_MS);

    // Should have cleared pending and moved to next hand
    expect((gm as any).pendingShowCards.size).toBe(0);

    const state = gm.getTableState();
    const alice = state.players.find((p: PublicPlayerState) => p.id === 'p1');
    expect(alice!.holeCards).toBeNull();
  });

  it('should NOT offer show cards when hand went to showdown', () => {
    const result = makeUncontestedResult();
    // Add showdown results — hand was contested
    result.showdownResults = [
      {
        playerId: 'p1', seatIndex: 0,
        holeCards: ['Ah', 'Kh'], handName: 'High Card', handDescription: 'Ace high',
        shown: true,
      },
    ];

    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // No show cards should be offered
    expect((gm as any).pendingShowCards.size).toBe(0);

    const offerCalls = sock1.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.SHOW_CARDS_OFFER
    );
    expect(offerCalls).toHaveLength(0);
  });

  it('when winner shows, their phone should receive a private state with their hole cards', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Clear previous emits to focus on what happens after "show"
    sock1.emit.mockClear();

    // Player chooses "show"
    gm.handleShowCards('sock-1', true);

    // The winner's socket should have received a PRIVATE_STATE with their hole cards
    const privateCalls = sock1.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.PRIVATE_STATE
    );
    expect(privateCalls.length).toBeGreaterThan(0);

    const lastPrivateState = privateCalls[privateCalls.length - 1][1];
    expect(lastPrivateState.holeCards).toEqual(['Ah', 'Kh']);
  });

  it('shown cards should persist in table state until next hand starts', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Player shows cards
    gm.handleShowCards('sock-1', true);

    // Cards should be visible immediately
    let state = gm.getTableState();
    let alice = state.players.find((p: PublicPlayerState) => p.id === 'p1');
    expect(alice!.holeCards).toEqual(['Ah', 'Kh']);

    // After HAND_COMPLETE_PAUSE_MS, scheduleNextHand fires
    // Cards should still be visible until startNewHand clears them
    vi.advanceTimersByTime(HAND_COMPLETE_PAUSE_MS - 1);
    state = gm.getTableState();
    alice = state.players.find((p: PublicPlayerState) => p.id === 'p1');
    expect(alice!.holeCards).toEqual(['Ah', 'Kh']);
  });
});

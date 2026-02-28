import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig, PrivatePlayerState } from '@poker/shared';
import { S2C_PLAYER, DELAY_POT_AWARD_MS } from '@poker/shared';
import type { HandResult } from '../game/HandEngine.js';

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
  };
}

function getPrivateStates(socket: any): PrivatePlayerState[] {
  return socket.emit.mock.calls
    .filter((call: any[]) => call[0] === S2C_PLAYER.PRIVATE_STATE)
    .map((call: any[]) => call[1] as PrivatePlayerState);
}

function getLatestPrivateState(socket: any): PrivatePlayerState | null {
  const states = getPrivateStates(socket);
  return states.length > 0 ? states[states.length - 1] : null;
}

describe('Auto-muck toggle', () => {
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

    // Wire up player ID → socket ID mappings
    (gm as any).playerIdToSocketId.set('p1', 'sock-1');
    (gm as any).playerIdToSocketId.set('p2', 'sock-2');

    const player1 = (gm as any).players.get('sock-1');
    const player2 = (gm as any).players.get('sock-2');
    if (player1) player1.id = 'p1';
    if (player2) player2.id = 'p2';

    (gm as any).currentPlayerCards.set('p1', ['Ah', 'Kh']);
    (gm as any).currentPlayerCards.set('p2', ['2c', '7d']);
    (gm as any).phase = 'hand_in_progress';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-muck ON: winner should NOT receive show cards offer', () => {
    // Toggle auto-muck ON for Alice
    gm.handleAutoMuck('sock-1');

    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Alice should NOT receive SHOW_CARDS_OFFER
    const offerCalls = sock1.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.SHOW_CARDS_OFFER
    );
    expect(offerCalls).toHaveLength(0);

    // No pending show cards
    expect((gm as any).pendingShowCards.size).toBe(0);
  });

  it('auto-muck OFF (default): winner should receive show cards offer', () => {
    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Alice should receive SHOW_CARDS_OFFER
    const offerCalls = sock1.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.SHOW_CARDS_OFFER
    );
    expect(offerCalls.length).toBeGreaterThan(0);
    expect((gm as any).pendingShowCards.size).toBe(1);
  });

  it('auto-muck ON → OFF: winner should receive show cards offer again', () => {
    // Toggle ON then OFF
    gm.handleAutoMuck('sock-1');
    gm.handleAutoMuck('sock-1');

    const result = makeUncontestedResult();
    (gm as any).handleHandComplete(result);
    vi.advanceTimersByTime(DELAY_POT_AWARD_MS);

    // Alice should receive SHOW_CARDS_OFFER
    const offerCalls = sock1.emit.mock.calls.filter(
      (call: any[]) => call[0] === S2C_PLAYER.SHOW_CARDS_OFFER
    );
    expect(offerCalls.length).toBeGreaterThan(0);
  });

  it('PrivatePlayerState should contain autoMuck field', () => {
    // Default: autoMuck = false
    const initialState = getLatestPrivateState(sock1);
    expect(initialState).not.toBeNull();
    expect(initialState!.autoMuck).toBe(false);

    // Toggle ON
    gm.handleAutoMuck('sock-1');
    const afterToggle = getLatestPrivateState(sock1);
    expect(afterToggle!.autoMuck).toBe(true);

    // Toggle OFF
    gm.handleAutoMuck('sock-1');
    const afterSecondToggle = getLatestPrivateState(sock1);
    expect(afterSecondToggle!.autoMuck).toBe(false);
  });
});

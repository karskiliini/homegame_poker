import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { S2C_PLAYER } from '@poker/shared';

function createMockSocket(id: string) {
  return {
    id,
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  } as any;
}

function createMockIo() {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  const namespaceObj = { emit: emitFn, to: toFn };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
    _toFn: toFn,
  } as any;
}

const defaultConfig: GameConfig = {
  smallBlind: 1,
  bigBlind: 2,
  maxBuyIn: 200,
  minPlayers: 2,
  maxPlayers: 10,
  gameType: 'NLHE',
  actionTimeSeconds: 30,
};

function getPrivateStates(socket: any): any[] {
  return socket.emit.mock.calls
    .filter((c: any[]) => c[0] === S2C_PLAYER.PRIVATE_STATE)
    .map((c: any[]) => c[1]);
}

function startHandWith2Players(gm: GameManager, s1: any, s2: any) {
  gm.addPlayer(s1, 'Alice', 200);
  gm.addPlayer(s2, 'Bob', 200);
  gm.handleSitIn('s2');
  gm.checkStartGame();
}

describe('Sit Out Next Hand', () => {
  let gm: GameManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(defaultConfig, io, 'test-table');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggle ON during hand → player sits out after hand ends', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');
    startHandWith2Players(gm, s1, s2);
    expect(gm.getPhase()).toBe('hand_in_progress');

    // Toggle sit-out-next-hand for Bob
    gm.handleSitOutNextHand('s2');

    // Verify private state shows sitOutNextHand: true
    const bobStates = getPrivateStates(s2);
    const lastState = bobStates[bobStates.length - 1];
    expect(lastState.sitOutNextHand).toBe(true);

    // Bob is still in the hand (not sitting_out yet)
    expect(gm.getPlayerBySocketId('s2')!.status).not.toBe('sitting_out');

    // Complete the hand by folding (both, one will succeed)
    gm.handlePlayerAction('s1', 'fold');
    gm.handlePlayerAction('s2', 'fold');

    // Run all timers to process event queue delays + hand complete + schedule
    vi.runAllTimers();

    // After hand + scheduling, Bob should be sitting_out
    const bob = gm.getPlayerBySocketId('s2');
    expect(bob!.status).toBe('sitting_out');
    expect(bob!.isReady).toBe(false);
  });

  it('toggle ON then OFF (cancel) → player continues normally', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');
    startHandWith2Players(gm, s1, s2);

    // Toggle ON
    gm.handleSitOutNextHand('s2');
    let bobStates = getPrivateStates(s2);
    expect(bobStates[bobStates.length - 1].sitOutNextHand).toBe(true);

    // Toggle OFF
    gm.handleSitOutNextHand('s2');
    bobStates = getPrivateStates(s2);
    expect(bobStates[bobStates.length - 1].sitOutNextHand).toBe(false);

    // Complete hand
    gm.handlePlayerAction('s1', 'fold');
    gm.handlePlayerAction('s2', 'fold');
    // Advance enough for event queue + hand complete + schedule (not runAllTimers — game restarts)
    vi.advanceTimersByTime(10000);

    // Bob should NOT be sitting_out — he cancelled
    const bob = gm.getPlayerBySocketId('s2');
    expect(bob!.status).not.toBe('sitting_out');
  });

  it('toggle between hands → sit out immediately', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');
    gm.addPlayer(s1, 'Alice', 200);
    gm.addPlayer(s2, 'Bob', 200);
    gm.handleSitIn('s2');
    // Don't start game — phase is waiting_for_players

    gm.handleSitOutNextHand('s2');

    // Should sit out immediately since no hand in progress
    const bob = gm.getPlayerBySocketId('s2');
    expect(bob!.status).toBe('sitting_out');
    expect(bob!.isReady).toBe(false);
  });

  it('sit-in cancels pending sit-out-next-hand flag', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');
    startHandWith2Players(gm, s1, s2);

    // Toggle ON
    gm.handleSitOutNextHand('s2');
    let bobStates = getPrivateStates(s2);
    expect(bobStates[bobStates.length - 1].sitOutNextHand).toBe(true);

    // Sit in clears the flag
    gm.handleSitIn('s2');
    bobStates = getPrivateStates(s2);
    // The flag should be cleared (next state emission should show false)
    // Since handleSitIn doesn't emit state directly if already not sitting_out,
    // we verify via the internal state by completing the hand
    gm.handlePlayerAction('s1', 'fold');
    gm.handlePlayerAction('s2', 'fold');
    // Advance enough for event queue + hand complete + schedule (not runAllTimers — game restarts)
    vi.advanceTimersByTime(10000);

    // Bob should NOT be sitting_out — sit-in cleared the flag
    const bob = gm.getPlayerBySocketId('s2');
    expect(bob!.status).not.toBe('sitting_out');
  });

  it('PrivatePlayerState includes sitOutNextHand field', () => {
    const s1 = createMockSocket('s1');
    gm.addPlayer(s1, 'Alice', 200);

    const states = getPrivateStates(s1);
    expect(states.length).toBeGreaterThan(0);
    // Initial state should have sitOutNextHand: false
    expect(states[0].sitOutNextHand).toBe(false);
  });

  it('removePlayer cleans up pending flag', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');
    startHandWith2Players(gm, s1, s2);

    gm.handleSitOutNextHand('s2');
    gm.removePlayer('s2');

    // No crash, player is gone
    expect(gm.getPlayerBySocketId('s2')).toBeUndefined();
  });
});

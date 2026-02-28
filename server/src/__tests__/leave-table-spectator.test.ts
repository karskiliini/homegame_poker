import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';

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
    leave: vi.fn(),
  } as any;
}

function createMockIo() {
  const emitFn = vi.fn();
  const namespaceObj = { emit: emitFn, to: vi.fn().mockReturnValue({ emit: emitFn }) };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
  } as any;
}

function getPlayer(gm: GameManager, socketId: string) {
  return (gm as any).players.get(socketId);
}

describe('Leave Table as Spectator', () => {
  let gm: GameManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(makeConfig(), io, 'test-table');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sitting_out player can leave table and their stack is returned', () => {
    // Player joins with 100 chips
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    expect(player).toBeDefined();
    expect(player.stack).toBe(100);

    // Player sits out
    gm.handleSitOut('sock-1');
    expect(player.status).toBe('sitting_out');

    // Track balance credit via onPlayerRemoved callback
    let creditedStack = 0;
    (gm as any).playerRemovedCallbacks.set(player.id, (_id: string, stack: number) => {
      creditedStack = stack;
    });

    // Player leaves table
    gm.leaveTable('sock-1');

    // Player should be removed from the table
    expect(getPlayer(gm, 'sock-1')).toBeUndefined();
    // Stack should be credited back
    expect(creditedStack).toBe(100);
  });

  it('sitting_out player who leaves does not affect ongoing hand', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.addPlayer(sock3, 'Charlie', 100);

    // Sit everyone in
    gm.handleSitIn('sock-2');
    gm.handleSitIn('sock-3');

    // Charlie sits out before hand starts
    gm.handleSitOut('sock-3');

    // Start a hand with Alice and Bob
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Charlie leaves while hand is in progress — since Charlie is sitting_out and not in the hand, it should work
    gm.leaveTable('sock-3');

    // Charlie should be removed
    expect(getPlayer(gm, 'sock-3')).toBeUndefined();
    // Hand should still be in progress
    expect((gm as any).phase).toBe('hand_in_progress');
  });

  it('player in active hand who tries to leave is pending-removed until hand ends', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.handleSitIn('sock-2');

    // Start a hand
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Alice is in the hand and tries to leave — should be deferred
    gm.leaveTable('sock-1');

    // Alice should still be in the player list (pending removal)
    expect(getPlayer(gm, 'sock-1')).toBeDefined();
    expect((gm as any).pendingRemovals.has('sock-1')).toBe(true);
  });
});

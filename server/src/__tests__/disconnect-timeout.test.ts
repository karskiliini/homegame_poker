import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { DISCONNECT_TIMEOUT_MS, S2C_TABLE } from '@poker/shared';

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
  const namespaceObj = { emit: emitFn, to: vi.fn().mockReturnValue({ emit: emitFn }) };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
  } as any;
}

// ============================================================================
// Tests
// ============================================================================

describe('Disconnect timeout', () => {
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

  it('removes a disconnected player after 3 minutes', () => {
    const socket = createMockSocket('sock-1');
    gm.addPlayer(socket, 'Alice', 100);

    // Verify player is in table state
    expect(gm.getTableState().players).toHaveLength(1);
    expect(gm.getTableState().players[0].name).toBe('Alice');

    // Disconnect
    gm.handlePlayerDisconnect('sock-1');
    expect(gm.getTableState().players[0].isConnected).toBe(false);
    expect(gm.getTableState().players[0].disconnectedAt).toBeTypeOf('number');

    // Still present before timeout
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS - 1000);
    expect(gm.getTableState().players).toHaveLength(1);

    // After timeout, player is removed
    vi.advanceTimersByTime(1000);
    expect(gm.getTableState().players).toHaveLength(0);
  });

  it('emits PLAYER_LEFT event when player is removed', () => {
    const socket = createMockSocket('sock-1');
    gm.addPlayer(socket, 'Bob', 100);

    gm.handlePlayerDisconnect('sock-1');
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);

    // Check that PLAYER_LEFT was emitted
    const tableEmitCalls = io._emitFn.mock.calls;
    const playerLeftCall = tableEmitCalls.find(
      (call: any[]) => call[0] === S2C_TABLE.PLAYER_LEFT
    );
    expect(playerLeftCall).toBeDefined();
    expect(playerLeftCall![1]).toMatchObject({
      playerName: 'Bob',
    });
  });

  it('cancels removal timer if player reconnects', () => {
    const socket = createMockSocket('sock-1');
    gm.addPlayer(socket, 'Carol', 100);

    gm.handlePlayerDisconnect('sock-1');
    vi.advanceTimersByTime(60_000); // 1 minute

    // Simulate reconnect
    gm.handlePlayerReconnect('sock-1');

    // After the full timeout, player should still be present
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);
    expect(gm.getTableState().players).toHaveLength(1);
    expect(gm.getTableState().players[0].disconnectedAt).toBeNull();
  });

  it('defers removal to after hand completes when hand is in progress', () => {
    // Use a very long action timer so the hand stays in progress
    const longConfig = makeConfig();
    longConfig.actionTimeSeconds = 999_999;
    const longGm = new GameManager(longConfig, io, 'test-table');

    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    longGm.addPlayer(sock1, 'Dave', 100);
    longGm.addPlayer(sock2, 'Eve', 100);

    // Players are auto-ready on join, just start the game
    longGm.checkStartGame();

    // Let event queue process (small delays for card dealing etc.)
    vi.advanceTimersByTime(5000);

    // Hand should now be in progress
    expect(longGm.getTableState().phase).toBe('hand_in_progress');

    // Disconnect player 1
    longGm.handlePlayerDisconnect('sock-1');

    // Advance past disconnect timeout
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);

    // Player should still be present (pending removal, hand in progress)
    const state = longGm.getTableState();
    const dave = state.players.find(p => p.name === 'Dave');
    expect(dave).toBeDefined();
    expect(dave!.isConnected).toBe(false);
  });

  it('handles multiple disconnect/reconnect cycles - last timer wins', () => {
    const socket = createMockSocket('sock-1');
    gm.addPlayer(socket, 'Frank', 100);

    // First disconnect
    gm.handlePlayerDisconnect('sock-1');
    vi.advanceTimersByTime(60_000);

    // Reconnect
    gm.handlePlayerReconnect('sock-1');

    // Second disconnect
    gm.handlePlayerDisconnect('sock-1');

    // The old timer shouldn't fire (it was cancelled)
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS - 60_000);
    expect(gm.getTableState().players).toHaveLength(1);

    // New timer should fire after full duration from second disconnect
    vi.advanceTimersByTime(60_000);
    expect(gm.getTableState().players).toHaveLength(0);
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { DISCONNECT_TIMEOUT_MS } from '@poker/shared';

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

// ============================================================================
// Tests
// ============================================================================

describe('Player reconnection with token', () => {
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

  it('addPlayer returns a playerToken alongside playerId', () => {
    const socket = createMockSocket('sock-1');
    const result = gm.addPlayer(socket, 'Alice', 100);

    expect(result.playerId).toBeDefined();
    expect(result.playerToken).toBeDefined();
    expect(typeof result.playerToken).toBe('string');
    expect(result.playerToken!.length).toBeGreaterThan(0);
  });

  it('reconnectPlayer succeeds with correct token after disconnect', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId, playerToken } = gm.addPlayer(socket1, 'Alice', 100);

    // Disconnect
    gm.handlePlayerDisconnect('sock-1');

    // New socket after page refresh
    const socket2 = createMockSocket('sock-2');
    const result = gm.reconnectPlayer(playerId!, socket2, playerToken!);

    expect(result.error).toBeUndefined();
    expect(result.playerName).toBe('Alice');
  });

  it('reconnectPlayer fails with wrong token', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId } = gm.addPlayer(socket1, 'Alice', 100);

    gm.handlePlayerDisconnect('sock-1');

    const socket2 = createMockSocket('sock-2');
    const result = gm.reconnectPlayer(playerId!, socket2, 'wrong-token');

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid');
  });

  it('reconnectPlayer fails with missing token', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId } = gm.addPlayer(socket1, 'Alice', 100);

    gm.handlePlayerDisconnect('sock-1');

    const socket2 = createMockSocket('sock-2');
    const result = gm.reconnectPlayer(playerId!, socket2);

    expect(result.error).toBeDefined();
  });

  it('reconnected player keeps same seat and stack', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId, playerToken } = gm.addPlayer(socket1, 'Alice', 150, undefined, 3);

    gm.handlePlayerDisconnect('sock-1');

    const socket2 = createMockSocket('sock-2');
    gm.reconnectPlayer(playerId!, socket2, playerToken!);

    const state = gm.getTableState();
    const alice = state.players.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice!.seatIndex).toBe(3);
    expect(alice!.stack).toBe(150);
    expect(alice!.isConnected).toBe(true);
  });

  it('reconnected player receives private state', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId, playerToken } = gm.addPlayer(socket1, 'Alice', 100);

    gm.handlePlayerDisconnect('sock-1');

    const socket2 = createMockSocket('sock-2');
    gm.reconnectPlayer(playerId!, socket2, playerToken!);

    // The new socket should have received PRIVATE_STATE via emit
    const emitCalls = socket2.emit.mock.calls;
    const privateStateCall = emitCalls.find(
      (call: any[]) => call[0] === 'player:private_state'
    );
    expect(privateStateCall).toBeDefined();
  });

  it('reconnectPlayer fails after disconnect timeout (player removed)', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId, playerToken } = gm.addPlayer(socket1, 'Alice', 100);

    gm.handlePlayerDisconnect('sock-1');

    // Advance past disconnect timeout -- player gets removed
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);

    const socket2 = createMockSocket('sock-2');
    const result = gm.reconnectPlayer(playerId!, socket2, playerToken!);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('not found');
  });

  it('reconnectPlayer succeeds within disconnect timeout window', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId, playerToken } = gm.addPlayer(socket1, 'Alice', 100);

    gm.handlePlayerDisconnect('sock-1');

    // Advance to just before timeout
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS - 1000);

    const socket2 = createMockSocket('sock-2');
    const result = gm.reconnectPlayer(playerId!, socket2, playerToken!);

    expect(result.error).toBeUndefined();
    expect(result.playerName).toBe('Alice');
  });

  it('another player cannot sit in a disconnected player seat', () => {
    const socket1 = createMockSocket('sock-1');
    gm.addPlayer(socket1, 'Alice', 100, undefined, 3);

    gm.handlePlayerDisconnect('sock-1');

    // Bob tries to take Alice's seat while she's disconnected
    const socket2 = createMockSocket('sock-2');
    const result = gm.addPlayer(socket2, 'Bob', 100, undefined, 3);

    expect(result.error).toBe('Seat 3 is already taken');
  });

  it('each player gets a unique token', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');

    const result1 = gm.addPlayer(sock1, 'Alice', 100);
    const result2 = gm.addPlayer(sock2, 'Bob', 100);

    expect(result1.playerToken).not.toBe(result2.playerToken);
  });

  it('reconnecting player cancels disconnect timeout', () => {
    const socket1 = createMockSocket('sock-1');
    const { playerId, playerToken } = gm.addPlayer(socket1, 'Alice', 100);

    gm.handlePlayerDisconnect('sock-1');
    vi.advanceTimersByTime(60_000); // 1 minute in

    const socket2 = createMockSocket('sock-2');
    gm.reconnectPlayer(playerId!, socket2, playerToken!);

    // After the full timeout from original disconnect, player should still be there
    vi.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);
    expect(gm.getTableState().players).toHaveLength(1);
    expect(gm.getTableState().players[0].isConnected).toBe(true);
  });

  it('reconnectPlayer during a hand in progress restores hand state', () => {
    const longConfig = makeConfig();
    longConfig.actionTimeSeconds = 999_999;
    const longGm = new GameManager(longConfig, io, 'test-table');

    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const result1 = longGm.addPlayer(sock1, 'Alice', 100);
    longGm.addPlayer(sock2, 'Bob', 100);

    longGm.handleSitIn('sock-1');
    longGm.handleSitIn('sock-2');
    longGm.checkStartGame();
    vi.advanceTimersByTime(5000);

    expect(longGm.getTableState().phase).toBe('hand_in_progress');

    // Alice disconnects
    longGm.handlePlayerDisconnect('sock-1');

    // Alice reconnects with new socket
    const sock3 = createMockSocket('sock-3');
    const reconnResult = longGm.reconnectPlayer(result1.playerId!, sock3, result1.playerToken!);

    expect(reconnResult.error).toBeUndefined();
    expect(reconnResult.playerName).toBe('Alice');

    // Alice should still be in the game state
    const state = longGm.getTableState();
    const alice = state.players.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice!.isConnected).toBe(true);
  });
});

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

describe('Duplicate seat prevention', () => {
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

  it('rejects addPlayer when same persistentId is already seated at the table', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const persistentId = 'player-abc-123';

    // First join succeeds
    const result1 = gm.addPlayer(sock1, 'Alice', 100, undefined, undefined, persistentId);
    expect(result1.error).toBeUndefined();
    expect(result1.playerId).toBe(persistentId);

    // Second join from different socket with same persistentId should fail
    const result2 = gm.addPlayer(sock2, 'Alice', 100, undefined, undefined, persistentId);
    expect(result2.error).toBe('Already seated at this table');
    expect(result2.playerId).toBeUndefined();
  });

  it('allows same persistentId to join different tables', () => {
    const io2 = createMockIo();
    const gm2 = new GameManager(makeConfig(), io2, 'test-table-2');

    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const persistentId = 'player-abc-123';

    const result1 = gm.addPlayer(sock1, 'Alice', 100, undefined, undefined, persistentId);
    expect(result1.error).toBeUndefined();

    // Different table should allow the same player
    const result2 = gm2.addPlayer(sock2, 'Alice', 100, undefined, undefined, persistentId);
    expect(result2.error).toBeUndefined();
  });

  it('allows joining with same name but different persistentId', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');

    const result1 = gm.addPlayer(sock1, 'Alice', 100, undefined, undefined, 'player-1');
    expect(result1.error).toBeUndefined();

    // Different persistent ID, same name is fine (names are display-only)
    const result2 = gm.addPlayer(sock2, 'Alice', 100, undefined, undefined, 'player-2');
    expect(result2.error).toBeUndefined();
  });

  it('allows joining without persistentId (anonymous players with different sockets)', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');

    // Anonymous players (no persistentId) get unique UUIDs, so no conflict
    const result1 = gm.addPlayer(sock1, 'Alice', 100);
    expect(result1.error).toBeUndefined();

    const result2 = gm.addPlayer(sock2, 'Bob', 100);
    expect(result2.error).toBeUndefined();
  });

  it('allows re-joining after leaving (persistentId freed)', () => {
    const sock1 = createMockSocket('sock-1');
    const persistentId = 'player-abc-123';

    // Join
    const result1 = gm.addPlayer(sock1, 'Alice', 100, undefined, undefined, persistentId);
    expect(result1.error).toBeUndefined();

    // Leave
    gm.leaveTable(sock1.id);

    // Re-join with different socket should succeed
    const sock2 = createMockSocket('sock-2');
    const result2 = gm.addPlayer(sock2, 'Alice', 100, undefined, undefined, persistentId);
    expect(result2.error).toBeUndefined();
  });
});

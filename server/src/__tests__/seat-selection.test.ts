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

describe('Seat Selection', () => {
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

  it('player can choose a specific seat index', () => {
    const sock = createMockSocket('sock-1');
    const result = gm.addPlayer(sock, 'Alice', 100, undefined, 5);

    expect(result.error).toBeUndefined();
    expect(result.playerId).toBeDefined();

    const player = getPlayer(gm, 'sock-1');
    expect(player.seatIndex).toBe(5);
  });

  it('player is assigned first available seat when no seatIndex given', () => {
    const sock = createMockSocket('sock-1');
    const result = gm.addPlayer(sock, 'Alice', 100);

    expect(result.error).toBeUndefined();
    const player = getPlayer(gm, 'sock-1');
    expect(player.seatIndex).toBe(0);
  });

  it('rejects request for an occupied seat', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 3);

    const sock2 = createMockSocket('sock-2');
    const result = gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    expect(result.error).toBe('Seat 3 is already taken');
  });

  it('rejects invalid seat index (negative)', () => {
    const sock = createMockSocket('sock-1');
    const result = gm.addPlayer(sock, 'Alice', 100, undefined, -1);

    expect(result.error).toBe('Invalid seat number');
  });

  it('rejects invalid seat index (>= maxPlayers)', () => {
    const sock = createMockSocket('sock-1');
    const result = gm.addPlayer(sock, 'Alice', 100, undefined, 10);

    expect(result.error).toBe('Invalid seat number');
  });

  it('multiple players can choose different seats', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');

    gm.addPlayer(sock1, 'Alice', 100, undefined, 7);
    gm.addPlayer(sock2, 'Bob', 100, undefined, 2);
    gm.addPlayer(sock3, 'Charlie', 100, undefined, 5);

    expect(getPlayer(gm, 'sock-1').seatIndex).toBe(7);
    expect(getPlayer(gm, 'sock-2').seatIndex).toBe(2);
    expect(getPlayer(gm, 'sock-3').seatIndex).toBe(5);
  });

  it('auto-assigns seat 0 when all lower seats are taken and no preference given', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100);

    // Bob should get seat 1 (first available after 0)
    expect(getPlayer(gm, 'sock-2').seatIndex).toBe(1);
  });
});

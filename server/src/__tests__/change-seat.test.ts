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

function getSeatMap(gm: GameManager): Map<number, string> {
  return (gm as any).seatMap;
}

describe('Change Seat', () => {
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

  it('sitting_out player can change to an empty seat', () => {
    // Alice joins at seat 0 (first player, auto-waiting)
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    // Bob joins at seat 3 (second player, auto-sitting_out)
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    // Bob is sitting_out by default (not first player)
    expect(getPlayer(gm, 'sock-2').status).toBe('sitting_out');
    expect(getPlayer(gm, 'sock-2').seatIndex).toBe(3);

    // Bob changes to seat 7
    const result = gm.changeSeat('sock-2', 7);

    expect(result.error).toBeUndefined();
    expect(getPlayer(gm, 'sock-2').seatIndex).toBe(7);
    // Old seat 3 should be freed
    expect(getSeatMap(gm).has(3)).toBe(false);
    // New seat 7 should be occupied
    expect(getSeatMap(gm).get(7)).toBe('sock-2');
  });

  it('rejects seat change when player is not sitting_out', () => {
    // Alice joins at seat 0 (first player = waiting)
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    expect(getPlayer(gm, 'sock-1').status).toBe('waiting');

    const result = gm.changeSeat('sock-1', 5);

    expect(result.error).toBe('You can only change seats while sitting out');
    expect(getPlayer(gm, 'sock-1').seatIndex).toBe(0);
  });

  it('rejects seat change when target seat is occupied', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    // Bob is sitting_out, tries to move to seat 0 (Alice's seat)
    const result = gm.changeSeat('sock-2', 0);

    expect(result.error).toBe('Seat 0 is already taken');
    expect(getPlayer(gm, 'sock-2').seatIndex).toBe(3);
  });

  it('rejects seat change to invalid seat index', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    // Negative seat
    expect(gm.changeSeat('sock-2', -1).error).toBe('Invalid seat number');
    // Seat >= maxPlayers
    expect(gm.changeSeat('sock-2', 10).error).toBe('Invalid seat number');
  });

  it('rejects seat change for non-existent player', () => {
    const result = gm.changeSeat('non-existent', 5);
    expect(result.error).toBe('Player not found');
  });

  it('rejects seat change to the same seat', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    const result = gm.changeSeat('sock-2', 3);
    expect(result.error).toBe('Already at this seat');
  });

  it('broadcasts updated state after seat change', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    // Clear previous emit calls
    sock2.emit.mockClear();

    gm.changeSeat('sock-2', 7);

    // The player should receive updated private state with new seatIndex
    const privateStateCalls = sock2.emit.mock.calls.filter(
      (call: any[]) => call[0] === 'player:private_state'
    );
    expect(privateStateCalls.length).toBeGreaterThan(0);
    const lastPrivateState = privateStateCalls[privateStateCalls.length - 1][1];
    expect(lastPrivateState.seatIndex).toBe(7);
  });

  it('player stays sitting_out after seat change', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    gm.changeSeat('sock-2', 7);

    expect(getPlayer(gm, 'sock-2').status).toBe('sitting_out');
  });

  it('busted player can change seat (busted is also sitting out effectively)', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100, undefined, 0);

    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock2, 'Bob', 100, undefined, 3);

    // Manually set Bob to busted
    const bob = getPlayer(gm, 'sock-2');
    bob.status = 'busted';
    bob.stack = 0;

    const result = gm.changeSeat('sock-2', 7);
    expect(result.error).toBeUndefined();
    expect(getPlayer(gm, 'sock-2').seatIndex).toBe(7);
  });
});
